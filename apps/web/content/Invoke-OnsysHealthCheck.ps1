<#
.SYNOPSIS
    Collects the data for the Onsys Technologies free 20-point SQL Server health check.

.DESCRIPTION
    Runs the twenty published checks against one SQL Server instance, writes one
    CSV per check, and packages the results into a single zip file for you to
    send back to Onsys Technologies.

    Every statement this script runs is READ-ONLY. It queries dynamic management
    views and catalog views only: there is no INSERT, UPDATE, DELETE, ALTER or
    DBCC anywhere in it, nothing is written to your instance, and no configuration
    is changed. The exact queries are the ones published at
    https://www.onsys.com.au/onsys-sql-server-health-check.html — read them there
    first if you would rather review before you run.

    It collects configuration and performance METADATA. It does not read the
    contents of your tables. The one place where customer data could otherwise
    leak into a result set is the text of cached queries, which can contain
    literal values; that is excluded unless you pass -IncludeQueryText.

.PARAMETER ServerInstance
    The instance to collect from, e.g. "SQLPROD01", "SQLPROD01\SQL2019" or
    "sqlprod01.contoso.local,1433".

.PARAMETER OutputPath
    Directory to write the results folder and zip into. Defaults to the current
    directory.

.PARAMETER SqlCredential
    SQL Server authentication. Omit this to use Windows authentication, which is
    what we recommend: nothing is then stored or typed. The password is held only
    in memory for the life of the run.

.PARAMETER IncludeQueryText
    Include the text of expensive cached queries (check 18). Off by default
    because a query's literal values can contain personal or commercial data.
    Without it you still get the cost figures, database and object names, which
    is enough for us to tell you where the load is.

.PARAMETER SkipOsChecks
    Skip checks 1 and 2, which read operating system and disk information from
    the local machine. Use this when running the script from a workstation
    rather than on the database server itself.

.PARAMETER QueryTimeoutSeconds
    Per-query timeout. The default of 120 is generous; check 15 is the slowest.

.EXAMPLE
    .\Invoke-OnsysHealthCheck.ps1 -ServerInstance SQLPROD01

    Run on the database server with Windows authentication. This is the usual case.

.EXAMPLE
    .\Invoke-OnsysHealthCheck.ps1 -ServerInstance sqlprod01,1433 -SqlCredential (Get-Credential) -SkipOsChecks

    Run from a workstation against a remote instance using a SQL login.

.NOTES
    Requires Windows PowerShell 5.1 or later, which ships with Windows Server.
    No modules to install: it talks to SQL Server through .NET, so it does not
    need SqlServer, SQLPS or sqlcmd.

    Permissions: VIEW SERVER STATE and VIEW ANY DEFINITION at the instance, plus
    db_datareader on the databases you want covered. Membership of sysadmin
    works but is not required.

    Send the zip it produces to healthcheck@onsys.com.au, quoting your company
    name. We return a written report within 7 business days of receiving it, and
    book a free Teams call to walk you through it within 2 weeks.

    ---------------------------------------------------------------------------
    Copyright (c) 2026 Onsys Pty Ltd. All rights reserved.

    You may use, copy and modify this script inside your own organisation,
    including after the health check, at no charge. Please keep this notice
    attached.

    DISCLAIMER

    This script is provided "AS IS", without warranty of any kind, express or
    implied, including but not limited to the warranties of merchantability and
    fitness for a particular purpose.

    It reads dynamic management views and catalog views only. It does not write
    to your instance, change any configuration, or read the contents of your
    tables. Even so, you remain responsible for what runs on your systems:
    review every query before you run it, run it under whatever change control
    your organisation requires, and satisfy yourself that it is appropriate for
    your environment.

    To the extent permitted by law, Onsys Pty Ltd accepts no
    liability for any loss or damage arising from the use of this script.
    Nothing it reports is advice about your specific circumstances until we
    have analysed the output and given you a report.

    Onsys Pty Ltd — 1800 431 416 — https://www.onsys.com.au
    ---------------------------------------------------------------------------
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $ServerInstance,

    [string] $OutputPath = (Get-Location).Path,

    [System.Management.Automation.PSCredential] $SqlCredential,

    [switch] $IncludeQueryText,

    [switch] $SkipOsChecks,

    [ValidateRange(30, 3600)]
    [int] $QueryTimeoutSeconds = 120
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

$CollectorVersion = '1.0.0'

# ---------------------------------------------------------------------------
# Plumbing
# ---------------------------------------------------------------------------

$script:Log = New-Object System.Collections.Generic.List[string]

function Write-Step {
    param([string] $Message, [string] $Level = 'INFO')
    $line = '{0}  {1,-5} {2}' -f (Get-Date -Format 'HH:mm:ss'), $Level, $Message
    $script:Log.Add($line)
    switch ($Level) {
        'WARN' { Write-Host $line -ForegroundColor Yellow }
        'FAIL' { Write-Host $line -ForegroundColor Red }
        default { Write-Host $line }
    }
}

function New-ConnectionString {
    param([string] $Database = 'master')

    $b = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
    $b['Data Source'] = $ServerInstance
    $b['Initial Catalog'] = $Database
    $b['Application Name'] = "Onsys Technologies Health Check Collector $CollectorVersion"
    $b['Connect Timeout'] = 15
    # Encrypt with TrustServerCertificate covers the common case of an instance
    # using a self-signed certificate, which would otherwise fail to connect.
    $b['Encrypt'] = $true
    $b['TrustServerCertificate'] = $true

    if ($SqlCredential) {
        $b['User ID'] = $SqlCredential.UserName
        $b['Password'] = $SqlCredential.GetNetworkCredential().Password
    }
    else {
        $b['Integrated Security'] = $true
    }
    return $b.ConnectionString
}

function Invoke-Query {
    <#
        Runs one query and returns a DataTable. Kept deliberately small: the
        connection is opened and closed per call so a check that fails cannot
        leave a session open against a production instance.
    #>
    param(
        [Parameter(Mandatory = $true)][string] $Sql,
        [string] $Database = 'master'
    )

    $connection = New-Object System.Data.SqlClient.SqlConnection (New-ConnectionString -Database $Database)
    try {
        $connection.Open()
        $command = $connection.CreateCommand()
        $command.CommandText = $Sql
        $command.CommandTimeout = $QueryTimeoutSeconds

        $table = New-Object System.Data.DataTable
        $adapter = New-Object System.Data.SqlClient.SqlDataAdapter $command
        [void] $adapter.Fill($table)
        return , $table
    }
    finally {
        $connection.Dispose()
    }
}

function Save-Result {
    <#
        One CSV per check. CSV rather than a formatted table because the point
        of the file is to be read by our analysis, not by eye.
    #>
    param(
        [Parameter(Mandatory = $true)] $Data,
        [Parameter(Mandatory = $true)][string] $Path
    )
    $rows = @($Data)
    if ($rows.Count -eq 0) {
        # An empty result is a finding in itself — "no full backups recorded" is
        # exactly what check 7 exists to surface — so write the file anyway.
        Set-Content -LiteralPath $Path -Value '# no rows returned' -Encoding UTF8
        return 0
    }
    $rows | Export-Csv -LiteralPath $Path -NoTypeInformation -Encoding UTF8
    return $rows.Count
}

# ---------------------------------------------------------------------------
# The twenty checks
#
# These are the published queries, unchanged except that the interactive
# "USE [YourDatabase]; GO" preamble is gone: the collector sets the database
# on the connection, and GO is a client batch separator rather than T-SQL.
# ---------------------------------------------------------------------------

$OsChecks = @(
    @{
        Num    = 1
        Name   = 'Host and operating system'
        Script = {
        # --- Operating system -------------------------------------------------
        Get-CimInstance Win32_OperatingSystem |
          Select-Object Caption, Version, BuildNumber, OSArchitecture, InstallDate, LastBootUpTime,
            @{n='TotalRAM_GB'; e={[math]::Round($_.TotalVisibleMemorySize/1MB,1)}},
            @{n='FreeRAM_GB';  e={[math]::Round($_.FreePhysicalMemory/1MB,1)}} |
          Format-List
        
        # --- Machine and processors -------------------------------------------
        Get-CimInstance Win32_ComputerSystem |
          Select-Object Manufacturer, Model, Domain, NumberOfProcessors, NumberOfLogicalProcessors,
            @{n='PhysicalRAM_GB'; e={[math]::Round($_.TotalPhysicalMemory/1GB,1)}} |
          Format-List
        
        Get-CimInstance Win32_Processor |
          Select-Object Name, NumberOfCores, NumberOfLogicalProcessors, MaxClockSpeed, L3CacheSize |
          Format-Table -AutoSize
        
        # Power plan. "Balanced" throttles CPU frequency and is a common, invisible
        # cause of poor SQL Server performance on physical hosts.
        powercfg /getactivescheme
        
        # Is the SQL Server service account granted Lock Pages in Memory and
        # Perform Volume Maintenance Tasks? Both affect memory and file growth.
        whoami /priv | Select-String 'SeManageVolume|SeLockMemory'
        }
    }
    @{
        Num    = 2
        Name   = 'Disk capacity and layout'
        Script = {
        # --- Volumes: capacity, free space and allocation unit ----------------
        Get-CimInstance Win32_Volume -Filter "DriveType=3" |
          Select-Object Name, Label, FileSystem,
            @{n='AllocUnit_KB'; e={$_.BlockSize/1KB}},
            @{n='Capacity_GB';  e={[math]::Round($_.Capacity/1GB,1)}},
            @{n='Free_GB';      e={[math]::Round($_.FreeSpace/1GB,1)}},
            @{n='Free_Pct';     e={if($_.Capacity){[math]::Round(($_.FreeSpace/$_.Capacity)*100,1)}}} |
          Sort-Object Name | Format-Table -AutoSize
        
        # --- Physical disks and media type (SSD vs HDD) -----------------------
        Get-PhysicalDisk |
          Select-Object DeviceId, FriendlyName, MediaType, BusType, HealthStatus,
            @{n='Size_GB'; e={[math]::Round($_.Size/1GB,1)}} |
          Format-Table -AutoSize
        }
    }
)

$InstanceChecks = @(
    @{
        Num  = 3
        Name = 'Version, edition and patch level'
        Sql  = @'
SELECT
    SERVERPROPERTY('MachineName')           AS machine_name,
    SERVERPROPERTY('ServerName')            AS server_name,
    SERVERPROPERTY('InstanceName')          AS instance_name,
    SERVERPROPERTY('ProductVersion')        AS product_version,
    SERVERPROPERTY('ProductLevel')          AS product_level,
    SERVERPROPERTY('ProductUpdateLevel')    AS cumulative_update,   -- 2012 SP3+ / 2014 SP2+
    SERVERPROPERTY('Edition')               AS edition,
    SERVERPROPERTY('EngineEdition')         AS engine_edition,
    SERVERPROPERTY('Collation')             AS server_collation,
    SERVERPROPERTY('IsClustered')           AS is_clustered,
    SERVERPROPERTY('IsHadrEnabled')         AS is_hadr_enabled,
    SERVERPROPERTY('IsIntegratedSecurityOnly') AS windows_auth_only,
    @@VERSION                               AS full_version_string;
'@
    }
    @{
        Num  = 4
        Name = 'Instance configuration'
        Sql  = @'
-- Key settings, with defaults shown for comparison
SELECT name, value_in_use, [description]
FROM   sys.configurations
WHERE  name IN (
        'max server memory (MB)',        -- default 2147483647 = uncapped
        'min server memory (MB)',
        'max degree of parallelism',     -- default 0 = unlimited
        'cost threshold for parallelism',-- default 5, almost always too low
        'optimize for ad hoc workloads',
        'backup compression default',
        'remote admin connections',
        'fill factor (%)')
ORDER BY name;

-- What the server actually has to work with
SELECT  cpu_count,
        hyperthread_ratio,
        cpu_count / NULLIF(hyperthread_ratio,0) AS physical_sockets,
        physical_memory_kb / 1024 AS physical_memory_mb,   -- 2012+; 2008 R2: physical_memory_in_bytes
        committed_kb       / 1024 AS committed_mb,
        committed_target_kb/ 1024 AS committed_target_mb,
        sqlserver_start_time
FROM sys.dm_os_sys_info;

-- NUMA layout. MAXDOP guidance depends on cores per NUMA node, not total cores.
SELECT parent_node_id AS numa_node, COUNT(*) AS visible_schedulers
FROM   sys.dm_os_schedulers
WHERE  status = 'VISIBLE ONLINE' AND parent_node_id < 64
GROUP BY parent_node_id
ORDER BY parent_node_id;
'@
    }
    @{
        Num  = 5
        Name = 'tempdb configuration'
        Sql  = @'
SELECT  mf.file_id,
        mf.name,
        mf.type_desc,
        CAST(mf.size AS BIGINT) * 8 / 1024       AS size_mb,
        CASE WHEN mf.is_percent_growth = 1
             THEN CONCAT(mf.growth, ' %')
             ELSE CONCAT(CAST(mf.growth AS BIGINT) * 8 / 1024, ' MB') END AS growth,
        CASE mf.max_size WHEN -1 THEN 'Unlimited'
                         WHEN 0  THEN 'No growth'
                         ELSE CONCAT(CAST(mf.max_size AS BIGINT) * 8 / 1024, ' MB') END AS max_size,
        mf.physical_name
FROM    sys.master_files mf
WHERE   mf.database_id = DB_ID('tempdb')
ORDER BY mf.type_desc, mf.file_id;

-- Current tempdb space use by category
SELECT  SUM(user_object_reserved_page_count)     * 8 / 1024 AS user_objects_mb,
        SUM(internal_object_reserved_page_count) * 8 / 1024 AS internal_objects_mb,
        SUM(version_store_reserved_page_count)   * 8 / 1024 AS version_store_mb,
        SUM(unallocated_extent_page_count)       * 8 / 1024 AS free_mb
FROM tempdb.sys.dm_db_file_space_usage;
'@
    }
    @{
        Num  = 6
        Name = 'Database inventory and options'
        Sql  = @'
SELECT  d.name,
        d.database_id,
        d.state_desc,
        d.recovery_model_desc,
        d.compatibility_level,
        d.page_verify_option_desc,           -- anything but CHECKSUM is a finding
        d.is_auto_close_on,                  -- should be 0
        d.is_auto_shrink_on,                 -- should be 0
        d.is_auto_create_stats_on,
        d.is_auto_update_stats_on,
        d.is_read_committed_snapshot_on,
        d.collation_name,
        d.create_date,
        CAST(SUM(mf.size) * 8.0 / 1024 AS DECIMAL(18,1)) AS total_size_mb
FROM    sys.databases d
JOIN    sys.master_files mf ON mf.database_id = d.database_id
GROUP BY d.name, d.database_id, d.state_desc, d.recovery_model_desc, d.compatibility_level,
         d.page_verify_option_desc, d.is_auto_close_on, d.is_auto_shrink_on,
         d.is_auto_create_stats_on, d.is_auto_update_stats_on,
         d.is_read_committed_snapshot_on, d.collation_name, d.create_date
ORDER BY total_size_mb DESC;
'@
    }
    @{
        Num  = 7
        Name = 'Backup coverage'
        Sql  = @'
SELECT  d.name                                     AS database_name,
        d.recovery_model_desc,
        MAX(CASE WHEN b.type = 'D' THEN b.backup_finish_date END) AS last_full,
        MAX(CASE WHEN b.type = 'I' THEN b.backup_finish_date END) AS last_differential,
        MAX(CASE WHEN b.type = 'L' THEN b.backup_finish_date END) AS last_log,
        DATEDIFF(HOUR, MAX(CASE WHEN b.type = 'D' THEN b.backup_finish_date END), GETDATE())
                                                   AS hours_since_full,
        DATEDIFF(MINUTE, MAX(CASE WHEN b.type = 'L' THEN b.backup_finish_date END), GETDATE())
                                                   AS minutes_since_log
FROM    sys.databases d
LEFT JOIN msdb.dbo.backupset b
       ON b.database_name = d.name
      AND b.is_copy_only = 0          -- copy-only backups do not affect the chain
WHERE   d.database_id <> DB_ID('tempdb')
  AND   d.source_database_id IS NULL  -- exclude snapshots
GROUP BY d.name, d.recovery_model_desc
ORDER BY last_full ASC;
'@
    }
    @{
        Num  = 8
        Name = 'Restore history'
        Sql  = @'
SELECT TOP (100)
        rh.destination_database_name,
        rh.restore_date,
        rh.restore_type,          -- D = database, F = file, I = differential, L = log, V = verifyonly
        rh.[user_name],
        bs.backup_finish_date     AS source_backup_taken,
        bs.database_name          AS source_database,
        bmf.physical_device_name  AS restored_from
FROM    msdb.dbo.restorehistory rh
LEFT JOIN msdb.dbo.backupset bs        ON bs.backup_set_id = rh.backup_set_id
LEFT JOIN msdb.dbo.backupmediafamily bmf ON bmf.media_set_id = bs.media_set_id
ORDER BY rh.restore_date DESC;

-- Summary: has anything been restored at all, and how recently?
SELECT  COUNT(*)              AS restores_recorded,
        MIN(restore_date)     AS earliest,
        MAX(restore_date)     AS most_recent,
        COUNT(DISTINCT destination_database_name) AS distinct_databases
FROM msdb.dbo.restorehistory;
'@
    }
    @{
        Num  = 9
        Name = 'Log backup cadence'
        Sql  = @'
SELECT  d.name AS database_name,
        d.recovery_model_desc,
        COUNT(b.backup_set_id)                            AS log_backups_last_7d,
        MIN(b.backup_finish_date)                         AS earliest,
        MAX(b.backup_finish_date)                         AS latest,
        CASE WHEN COUNT(b.backup_set_id) > 1
             THEN DATEDIFF(MINUTE, MIN(b.backup_finish_date), MAX(b.backup_finish_date))
                  / NULLIF(COUNT(b.backup_set_id) - 1, 0)
        END                                               AS avg_interval_minutes,
        CAST(AVG(b.backup_size / 1048576.0) AS DECIMAL(18,1)) AS avg_size_mb
FROM    sys.databases d
LEFT JOIN msdb.dbo.backupset b
       ON b.database_name = d.name
      AND b.type = 'L'
      AND b.backup_finish_date > DATEADD(DAY, -7, GETDATE())
WHERE   d.recovery_model_desc IN ('FULL','BULK_LOGGED')
  AND   d.database_id <> DB_ID('tempdb')
GROUP BY d.name, d.recovery_model_desc
ORDER BY log_backups_last_7d ASC;
'@
    }
    @{
        Num  = 10
        Name = 'Integrity checks'
        Sql  = @'
-- SQL Server 2016 SP2 / 2017 CU3 and later
SELECT  d.name AS database_name,
        DATABASEPROPERTYEX(d.name, 'LastGoodCheckDbTime') AS last_known_good_checkdb,
        DATEDIFF(DAY, CAST(DATABASEPROPERTYEX(d.name, 'LastGoodCheckDbTime') AS DATETIME), GETDATE())
                                                          AS days_since_checkdb
FROM    sys.databases d
WHERE   d.database_id <> DB_ID('tempdb')
  AND   d.state_desc = 'ONLINE'
ORDER BY last_known_good_checkdb ASC;
'@
    }
    @{
        Num  = 11
        Name = 'High availability configuration'
        Sql  = @'
-- Always On availability groups (returns nothing if not configured)
SELECT  ag.name AS ag_name, ar.replica_server_name, ar.availability_mode_desc,
        ar.failover_mode_desc, rs.role_desc, rs.connected_state_desc,
        rs.synchronization_health_desc, rs.last_connect_error_description
FROM    sys.availability_groups ag
JOIN    sys.availability_replicas ar        ON ar.group_id = ag.group_id
LEFT JOIN sys.dm_hadr_availability_replica_states rs ON rs.replica_id = ar.replica_id
ORDER BY ag.name, ar.replica_server_name;

-- Per-database synchronisation state and redo queue
SELECT  DB_NAME(drs.database_id) AS database_name, drs.synchronization_state_desc,
        drs.synchronization_health_desc, drs.log_send_queue_size, drs.redo_queue_size,
        drs.last_hardened_time, drs.last_redone_time
FROM    sys.dm_hadr_database_replica_states drs;

-- Failover cluster nodes
SELECT NodeName, status_description, is_current_owner FROM sys.dm_os_cluster_nodes;

-- Database mirroring
SELECT DB_NAME(database_id) AS database_name, mirroring_role_desc, mirroring_state_desc,
       mirroring_safety_level_desc, mirroring_partner_name
FROM   sys.database_mirroring WHERE mirroring_guid IS NOT NULL;

-- Log shipping
SELECT primary_server, primary_database, backup_threshold, threshold_alert_enabled
FROM   msdb.dbo.log_shipping_monitor_primary;
'@
    }
    @{
        Num  = 12
        Name = 'File growth settings'
        Sql  = @'
SELECT  DB_NAME(mf.database_id)  AS database_name,
        mf.name                  AS logical_name,
        mf.type_desc,
        CAST(mf.size AS BIGINT) * 8 / 1024 AS size_mb,
        CASE WHEN mf.is_percent_growth = 1
             THEN CONCAT(mf.growth, ' %')
             ELSE CONCAT(CAST(mf.growth AS BIGINT) * 8 / 1024, ' MB') END AS growth,
        mf.is_percent_growth,
        CASE mf.max_size WHEN -1 THEN 'Unlimited'
                         WHEN 0  THEN 'No growth'
                         ELSE CONCAT(CAST(mf.max_size AS BIGINT) * 8 / 1024, ' MB') END AS max_size,
        mf.physical_name
FROM    sys.master_files mf
ORDER BY mf.is_percent_growth DESC, size_mb DESC;
'@
    }
    @{
        Num  = 13
        Name = 'Storage latency'
        Sql  = @'
SELECT  DB_NAME(vfs.database_id) AS database_name,
        mf.name                  AS logical_name,
        mf.type_desc,
        vfs.num_of_reads,
        CASE WHEN vfs.num_of_reads  = 0 THEN 0
             ELSE vfs.io_stall_read_ms  / vfs.num_of_reads  END AS avg_read_stall_ms,
        vfs.num_of_writes,
        CASE WHEN vfs.num_of_writes = 0 THEN 0
             ELSE vfs.io_stall_write_ms / vfs.num_of_writes END AS avg_write_stall_ms,
        CAST(vfs.num_of_bytes_read  / 1048576.0 AS DECIMAL(18,1)) AS mb_read,
        CAST(vfs.num_of_bytes_written/ 1048576.0 AS DECIMAL(18,1)) AS mb_written,
        mf.physical_name
FROM    sys.dm_io_virtual_file_stats(NULL, NULL) vfs
JOIN    sys.master_files mf
     ON mf.database_id = vfs.database_id AND mf.file_id = vfs.file_id
ORDER BY avg_read_stall_ms DESC;

-- Context: counters are cumulative since this time.
SELECT sqlserver_start_time FROM sys.dm_os_sys_info;
'@
    }
    @{
        Num  = 14
        Name = 'Wait statistics'
        Sql  = @'
SELECT TOP (25)
        wait_type,
        waiting_tasks_count,
        CAST(wait_time_ms / 1000.0 AS DECIMAL(18,1))                        AS total_wait_s,
        CAST((wait_time_ms - signal_wait_time_ms) / 1000.0 AS DECIMAL(18,1)) AS resource_wait_s,
        CAST(signal_wait_time_ms / 1000.0 AS DECIMAL(18,1))                 AS signal_wait_s,
        CAST(wait_time_ms / NULLIF(waiting_tasks_count,0) AS DECIMAL(18,1)) AS avg_wait_ms,
        CAST(100.0 * wait_time_ms / NULLIF(SUM(wait_time_ms) OVER (), 0) AS DECIMAL(5,2)) AS pct_of_total
FROM    sys.dm_os_wait_stats
WHERE   waiting_tasks_count > 0
  AND   wait_type NOT IN (
        'BROKER_TASK_STOP','BROKER_TO_FLUSH','BROKER_EVENTHANDLER','BROKER_RECEIVE_WAITFOR',
        'BROKER_TRANSMITTER','CHECKPOINT_QUEUE','CHKPT','CLR_AUTO_EVENT','CLR_MANUAL_EVENT',
        'CLR_SEMAPHORE','DBMIRROR_DBM_EVENT','DBMIRROR_EVENTS_QUEUE','DBMIRROR_WORKER_QUEUE',
        'DBMIRRORING_CMD','DIRTY_PAGE_POLL','DISPATCHER_QUEUE_SEMAPHORE','FT_IFTS_SCHEDULER_IDLE_WAIT',
        'FT_IFTSHC_MUTEX','HADR_CLUSAPI_CALL','HADR_FILESTREAM_IOMGR_IOCOMPLETION','HADR_LOGCAPTURE_WAIT',
        'HADR_NOTIFICATION_DEQUEUE','HADR_TIMER_TASK','HADR_WORK_QUEUE','LAZYWRITER_SLEEP',
        'LOGMGR_QUEUE','MEMORY_ALLOCATION_EXT','ONDEMAND_TASK_QUEUE','PARALLEL_REDO_DRAIN_WORKER',
        'PARALLEL_REDO_LOG_CACHE','PARALLEL_REDO_TRAN_LIST','PARALLEL_REDO_WORKER_SYNC',
        'PARALLEL_REDO_WORKER_WAIT_WORK','PREEMPTIVE_XE_GETTARGETSTATE','PWAIT_ALL_COMPONENTS_INITIALIZED',
        'PWAIT_DIRECTLOGCONSUMER_GETNEXT','QDS_PERSIST_TASK_MAIN_LOOP_SLEEP','QDS_ASYNC_QUEUE',
        'QDS_CLEANUP_STALE_QUERIES_TASK_MAIN_LOOP_SLEEP','QDS_SHUTDOWN_QUEUE','REDO_THREAD_PENDING_WORK',
        'REQUEST_FOR_DEADLOCK_SEARCH','RESOURCE_QUEUE','SERVER_IDLE_CHECK','SLEEP_BPOOL_FLUSH',
        'SLEEP_DBSTARTUP','SLEEP_DCOMSTARTUP','SLEEP_MASTERDBREADY','SLEEP_MASTERMDREADY',
        'SLEEP_MASTERUPGRADED','SLEEP_MSDBSTARTUP','SLEEP_SYSTEMTASK','SLEEP_TASK','SLEEP_TEMPDBSTARTUP',
        'SNI_HTTP_ACCEPT','SP_SERVER_DIAGNOSTICS_SLEEP','SQLTRACE_BUFFER_FLUSH',
        'SQLTRACE_INCREMENTAL_FLUSH_SLEEP','SQLTRACE_WAIT_ENTRIES','WAIT_FOR_RESULTS',
        'WAITFOR','WAITFOR_TASKSHUTDOWN','WAIT_XTP_HOST_WAIT','WAIT_XTP_OFFLINE_CKPT_NEW_LOG',
        'WAIT_XTP_CKPT_CLOSE','XE_DISPATCHER_JOIN','XE_DISPATCHER_WAIT','XE_TIMER_EVENT')
ORDER BY wait_time_ms DESC;
'@
    }
    @{
        Num  = 16
        Name = 'Missing index pressure'
        Sql  = @'
SELECT TOP (25)
        DB_NAME(mid.database_id)                  AS database_name,
        OBJECT_NAME(mid.object_id, mid.database_id) AS table_name,
        CAST(migs.avg_total_user_cost * migs.avg_user_impact
             * (migs.user_seeks + migs.user_scans) AS DECIMAL(18,2)) AS improvement_score,
        migs.user_seeks, migs.user_scans,
        CAST(migs.avg_user_impact AS DECIMAL(5,1)) AS avg_impact_pct,
        migs.last_user_seek,
        mid.equality_columns, mid.inequality_columns, mid.included_columns
FROM    sys.dm_db_missing_index_group_stats migs
JOIN    sys.dm_db_missing_index_groups  mig ON mig.index_group_handle = migs.group_handle
JOIN    sys.dm_db_missing_index_details mid ON mid.index_handle       = mig.index_handle
ORDER BY improvement_score DESC;
'@
    }
    @{
        Num  = 18
        Name = 'Expensive queries and blocking'
        Sql  = @'
-- Top 20 by total CPU since the plan cache was last cleared
SELECT TOP (20)
        DB_NAME(st.dbid)                              AS database_name,
        qs.execution_count,
        CAST(qs.total_worker_time / 1000.0 AS DECIMAL(18,1))  AS total_cpu_ms,
        CAST(qs.total_worker_time / 1000.0 / qs.execution_count AS DECIMAL(18,1)) AS avg_cpu_ms,
        CAST(qs.total_elapsed_time / 1000.0 AS DECIMAL(18,1)) AS total_duration_ms,
        qs.total_logical_reads,
        qs.total_logical_reads / qs.execution_count    AS avg_reads,
        qs.last_execution_time,
        SUBSTRING(st.text, (qs.statement_start_offset/2) + 1,
            ((CASE qs.statement_end_offset WHEN -1 THEN DATALENGTH(st.text)
              ELSE qs.statement_end_offset END - qs.statement_start_offset)/2) + 1) AS statement_text
FROM    sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st
ORDER BY qs.total_worker_time DESC;

-- Anything blocked right now
SELECT  r.session_id, r.blocking_session_id, r.wait_type, r.wait_time,
        r.wait_resource, r.status, r.command, DB_NAME(r.database_id) AS database_name,
        s.login_name, s.host_name, s.program_name,
        t.text AS running_statement
FROM    sys.dm_exec_requests r
JOIN    sys.dm_exec_sessions s ON s.session_id = r.session_id
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
WHERE   r.blocking_session_id <> 0;

-- Deadlocks captured by the always-on system_health session
SELECT TOP (20)
        xed.value('@timestamp','datetime2') AS deadlock_time,
        xed.query('.')                      AS deadlock_graph
FROM   (SELECT CAST([target_data] AS XML) AS target_data
        FROM   sys.dm_xe_session_targets st
        JOIN   sys.dm_xe_sessions s ON s.address = st.event_session_address
        WHERE  s.name = 'system_health' AND st.target_name = 'ring_buffer') AS d
CROSS APPLY target_data.nodes('RingBufferTarget/event[@name="xml_deadlock_report"]') AS x(xed)
ORDER BY deadlock_time DESC;
'@
    }
    @{
        Num  = 19
        Name = 'SQL Agent job health'
        Sql  = @'
-- Job inventory, owner and whether anyone is told when it fails
SELECT  j.name                          AS job_name,
        j.enabled,
        SUSER_SNAME(j.owner_sid)        AS job_owner,
        j.date_created,
        CASE WHEN j.notify_level_email = 0 THEN 'No email on failure' ELSE o.name END AS notifies,
        ja.next_scheduled_run_date
FROM    msdb.dbo.sysjobs j
LEFT JOIN msdb.dbo.sysoperators o ON o.id = j.notify_email_operator_id
LEFT JOIN (SELECT job_id, MAX(next_scheduled_run_date) AS next_scheduled_run_date
           FROM msdb.dbo.sysjobactivity GROUP BY job_id) ja ON ja.job_id = j.job_id
ORDER BY j.enabled DESC, j.name;

-- Outcomes over the last 14 days. run_status: 0 failed, 1 succeeded,
-- 2 retry, 3 cancelled, 4 in progress.
SELECT  j.name AS job_name,
        SUM(CASE WHEN h.run_status = 0 THEN 1 ELSE 0 END) AS failures,
        SUM(CASE WHEN h.run_status = 1 THEN 1 ELSE 0 END) AS successes,
        MAX(msdb.dbo.agent_datetime(h.run_date, h.run_time)) AS last_run,
        MAX(h.run_duration) AS longest_run_hhmmss
FROM    msdb.dbo.sysjobs j
JOIN    msdb.dbo.sysjobhistory h ON h.job_id = j.job_id AND h.step_id = 0
WHERE   h.run_date >= CONVERT(INT, CONVERT(VARCHAR(8), DATEADD(DAY,-14,GETDATE()), 112))
GROUP BY j.name
ORDER BY failures DESC, last_run DESC;
'@
    }
    @{
        Num  = 20
        Name = 'Security and encryption'
        Sql  = @'
-- Server role membership — sysadmin first
SELECT  r.name AS server_role, m.name AS member_name, m.type_desc,
        m.is_disabled, m.create_date, m.modify_date
FROM    sys.server_role_members rm
JOIN    sys.server_principals r ON r.principal_id = rm.role_principal_id
JOIN    sys.server_principals m ON m.principal_id = rm.member_principal_id
ORDER BY CASE WHEN r.name = 'sysadmin' THEN 0 ELSE 1 END, r.name, m.name;

-- The sa account: renamed? disabled? password age?
SELECT  name, is_disabled, create_date, modify_date,
        LOGINPROPERTY(name, 'PasswordLastSetTime') AS password_last_set,
        LOGINPROPERTY(name, 'IsExpired')           AS is_expired,
        LOGINPROPERTY(name, 'IsLocked')            AS is_locked
FROM    sys.server_principals
WHERE   sid = 0x01;

-- Logins with no password policy, and SQL logins generally
SELECT  sl.name, sl.is_disabled, sl.is_policy_checked, sl.is_expiration_checked,
        LOGINPROPERTY(sl.name,'PasswordLastSetTime') AS password_last_set
FROM    sys.sql_logins sl
ORDER BY sl.is_policy_checked, sl.name;

-- Surface area: anything non-zero here needs a justification
SELECT name, value_in_use
FROM   sys.configurations
WHERE  name IN ('xp_cmdshell','Ole Automation Procedures','Ad Hoc Distributed Queries',
                'clr enabled','Database Mail XPs','remote access','cross db ownership chaining')
ORDER BY name;

-- Transparent Data Encryption
SELECT  DB_NAME(dek.database_id) AS database_name,
        CASE dek.encryption_state
             WHEN 0 THEN 'No key' WHEN 1 THEN 'Unencrypted' WHEN 2 THEN 'Encryption in progress'
             WHEN 3 THEN 'Encrypted' WHEN 4 THEN 'Key change in progress'
             WHEN 5 THEN 'Decryption in progress' WHEN 6 THEN 'Protection change in progress'
        END AS encryption_state,
        dek.key_algorithm, dek.key_length, dek.percent_complete
FROM    sys.dm_database_encryption_keys dek;

-- Are connections actually encrypted in transit?
SELECT  encrypt_option, auth_scheme, net_transport, COUNT(*) AS connections
FROM    sys.dm_exec_connections
GROUP BY encrypt_option, auth_scheme, net_transport;
'@
    }
)

$DatabaseChecks = @(
    @{
        Num  = 15
        Name = 'Index health'
        Sql  = @'
-- Fragmentation. LIMITED mode is cheap and safe on production;
-- DETAILED reads every page and is not.
SELECT  DB_NAME()                                AS database_name,
        OBJECT_SCHEMA_NAME(ips.object_id)        AS schema_name,
        OBJECT_NAME(ips.object_id)               AS table_name,
        i.name                                   AS index_name,
        ips.index_type_desc,
        CAST(ips.avg_fragmentation_in_percent AS DECIMAL(5,1)) AS frag_pct,
        ips.page_count,
        ips.page_count * 8 / 1024                AS size_mb
FROM    sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') ips
JOIN    sys.indexes i
     ON i.object_id = ips.object_id AND i.index_id = ips.index_id
WHERE   ips.page_count > 1000        -- ignore anything under ~8 MB
  AND   ips.avg_fragmentation_in_percent > 10
ORDER BY ips.avg_fragmentation_in_percent DESC;

-- Unused indexes: written on every insert, never read.
-- Counters reset when the instance restarts — check uptime before acting.
SELECT  OBJECT_SCHEMA_NAME(i.object_id) AS schema_name,
        OBJECT_NAME(i.object_id)        AS table_name,
        i.name                          AS index_name,
        ISNULL(us.user_seeks,0)   AS seeks,
        ISNULL(us.user_scans,0)   AS scans,
        ISNULL(us.user_lookups,0) AS lookups,
        ISNULL(us.user_updates,0) AS writes
FROM    sys.indexes i
LEFT JOIN sys.dm_db_index_usage_stats us
       ON us.object_id = i.object_id AND us.index_id = i.index_id AND us.database_id = DB_ID()
WHERE   i.type_desc = 'NONCLUSTERED'
  AND   i.is_primary_key = 0 AND i.is_unique_constraint = 0
  AND   OBJECTPROPERTY(i.object_id, 'IsUserTable') = 1
  AND   ISNULL(us.user_seeks,0) + ISNULL(us.user_scans,0) + ISNULL(us.user_lookups,0) = 0
ORDER BY writes DESC;
'@
    }
    @{
        Num  = 17
        Name = 'Statistics currency'
        Sql  = @'
SELECT TOP (50)
        OBJECT_SCHEMA_NAME(s.object_id) AS schema_name,
        OBJECT_NAME(s.object_id)        AS table_name,
        s.name                          AS statistic_name,
        sp.last_updated,
        DATEDIFF(DAY, sp.last_updated, GETDATE()) AS days_old,
        sp.[rows],
        sp.rows_sampled,
        CAST(100.0 * sp.rows_sampled / NULLIF(sp.[rows],0) AS DECIMAL(5,1)) AS sampled_pct,
        sp.modification_counter                   -- changes since last update
FROM    sys.stats s
CROSS APPLY sys.dm_db_stats_properties(s.object_id, s.stats_id) sp
WHERE   OBJECTPROPERTY(s.object_id, 'IsUserTable') = 1
  AND   sp.[rows] > 10000
ORDER BY sp.modification_counter DESC;
'@
    }
)


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

$started = Get-Date
$stamp = $started.ToString('yyyyMMdd-HHmmss')
$safeInstance = ($ServerInstance -replace '[\\/:*?"<>|,]', '_')
$runName = "OnsysHealthCheck_${safeInstance}_${stamp}"

$OutputPath = (Resolve-Path -LiteralPath $OutputPath).Path
$runFolder = Join-Path $OutputPath $runName

Write-Host ''
Write-Host '  Onsys Technologies: free 20-point SQL Server health check' -ForegroundColor Cyan
Write-Host '  Read-only collection. Nothing is written to your instance.' -ForegroundColor DarkGray
Write-Host ''
Write-Step "Instance : $ServerInstance"
if (-not $IncludeQueryText) {
    Write-Step 'Query text is excluded. Pass -IncludeQueryText to include it.'
}

# Connect before creating anything on disk. Fail early and clearly rather than
# after eighteen identical errors, and without leaving an empty folder behind.
try {
    $probe = Invoke-Query -Sql 'SELECT @@SERVERNAME AS server_name, @@VERSION AS version;'
    Write-Step ("Connected to {0}" -f $probe.Rows[0]['server_name'])
}
catch {
    Write-Host ''
    Write-Host "  Could not connect to '$ServerInstance'." -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ''
    Write-Host '  Check the instance name, that the SQL Server service is running,' -ForegroundColor Yellow
    Write-Host '  and that your account can connect. For a named instance use' -ForegroundColor Yellow
    Write-Host '  SERVER\INSTANCE; for a non-default port use SERVER,PORT.' -ForegroundColor Yellow
    exit 1
}

[void] (New-Item -ItemType Directory -Path $runFolder -Force)
Write-Step "Output   : $runFolder"

$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
    param([int] $Number, [string] $Name, [string] $Status, [int] $Rows = 0, [string] $Detail = '')
    $script:results.Add([pscustomobject]@{
            check   = $Number
            name    = $Name
            status  = $Status
            rows    = $Rows
            detail  = $Detail
        })
}

# --- 1 & 2: operating system, from the local machine ------------------------
if ($SkipOsChecks) {
    Add-Result 1 'Host and operating system' 'skipped' 0 '-SkipOsChecks'
    Add-Result 2 'Disk capacity and layout' 'skipped' 0 '-SkipOsChecks'
    Write-Step 'Checks 1-2 skipped (-SkipOsChecks)' 'WARN'
}
else {
    foreach ($os in $OsChecks) {
        $file = Join-Path $runFolder ('{0:d2}_{1}.txt' -f $os.Num, ($os.Name -replace '[^A-Za-z0-9]+', '_'))
        try {
            Write-Step ('Check {0,2} : {1}' -f $os.Num, $os.Name)
            $out = & $os.Script 2>&1 | Out-String
            Set-Content -LiteralPath $file -Value $out -Encoding UTF8
            Add-Result $os.Num $os.Name 'ok' 0
        }
        catch {
            Write-Step ("Check {0,2} failed: {1}" -f $os.Num, $_.Exception.Message) 'WARN'
            Set-Content -LiteralPath $file -Value "FAILED: $($_.Exception.Message)" -Encoding UTF8
            Add-Result $os.Num $os.Name 'failed' 0 $_.Exception.Message
        }
    }
}

# --- Instance-scoped T-SQL checks ------------------------------------------
foreach ($check in $InstanceChecks) {
    $file = Join-Path $runFolder ('{0:d2}_{1}.csv' -f $check.Num, ($check.Name -replace '[^A-Za-z0-9]+', '_'))
    try {
        Write-Step ('Check {0,2} : {1}' -f $check.Num, $check.Name)
        $sql = $check.Sql
        if ($check.Num -eq 18 -and -not $IncludeQueryText) {
            # Replace the statement text with its length only. The costs, the
            # database and the object are what we analyse; the literals inside a
            # statement are the part that can carry customer data.
            $sql = $sql -replace '(?s)SUBSTRING\(st\.text.*?AS statement_text', "'(excluded - rerun with -IncludeQueryText)' AS statement_text"
        }
        $data = Invoke-Query -Sql $sql
        $rows = Save-Result -Data $data -Path $file
        Add-Result $check.Num $check.Name 'ok' $rows
    }
    catch {
        Write-Step ("Check {0,2} failed: {1}" -f $check.Num, $_.Exception.Message) 'WARN'
        Set-Content -LiteralPath $file -Value "# FAILED: $($_.Exception.Message)" -Encoding UTF8
        Add-Result $check.Num $check.Name 'failed' 0 $_.Exception.Message
    }
}

# --- Per-database checks ----------------------------------------------------
$databases = @()
try {
    $dbTable = Invoke-Query -Sql @'
SELECT name
FROM   sys.databases
WHERE  database_id > 4                 -- user databases only
  AND  state_desc = 'ONLINE'
  AND  HAS_DBACCESS(name) = 1          -- skip anything this login cannot read
ORDER BY name;
'@
    $databases = @($dbTable | ForEach-Object { $_.name })
    Write-Step ("Databases in scope: {0}" -f $(if ($databases.Count) { $databases -join ', ' } else { 'none' }))
}
catch {
    Write-Step "Could not list databases: $($_.Exception.Message)" 'WARN'
}

foreach ($check in $DatabaseChecks) {
    $total = 0
    $failed = 0
    foreach ($db in $databases) {
        $safeDb = $db -replace '[^A-Za-z0-9]+', '_'
        $file = Join-Path $runFolder ('{0:d2}_{1}__{2}.csv' -f $check.Num, ($check.Name -replace '[^A-Za-z0-9]+', '_'), $safeDb)
        try {
            $data = Invoke-Query -Sql $check.Sql -Database $db
            $total += Save-Result -Data $data -Path $file
        }
        catch {
            $failed++
            Write-Step ("Check {0,2} on [{1}] failed: {2}" -f $check.Num, $db, $_.Exception.Message) 'WARN'
            Set-Content -LiteralPath $file -Value "# FAILED: $($_.Exception.Message)" -Encoding UTF8
        }
    }
    Write-Step ('Check {0,2} : {1} ({2} databases)' -f $check.Num, $check.Name, $databases.Count)
    $status = if ($databases.Count -eq 0) { 'skipped' } elseif ($failed -eq $databases.Count) { 'failed' } else { 'ok' }
    Add-Result $check.Num $check.Name $status $total ("{0} databases, {1} failed" -f $databases.Count, $failed)
}

# ---------------------------------------------------------------------------
# Manifest, log and zip
# ---------------------------------------------------------------------------

$finished = Get-Date
$manifest = [ordered]@{
    collectorVersion = $CollectorVersion
    generated        = $finished.ToString('o')
    durationSeconds  = [math]::Round(($finished - $started).TotalSeconds, 1)
    serverInstance   = $ServerInstance
    collectedBy      = "$env:USERDOMAIN\$env:USERNAME"
    collectedFrom    = $env:COMPUTERNAME
    powerShell       = $PSVersionTable.PSVersion.ToString()
    includeQueryText = [bool] $IncludeQueryText
    osChecksSkipped  = [bool] $SkipOsChecks
    databases        = $databases
    checks           = $results
}
$manifest | ConvertTo-Json -Depth 5 |
    Set-Content -LiteralPath (Join-Path $runFolder 'manifest.json') -Encoding UTF8

$script:Log | Set-Content -LiteralPath (Join-Path $runFolder 'collection.log') -Encoding UTF8

$zipPath = Join-Path $OutputPath "$runName.zip"
if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
Compress-Archive -Path (Join-Path $runFolder '*') -DestinationPath $zipPath
Remove-Item -LiteralPath $runFolder -Recurse -Force

$ok = @($results | Where-Object { $_.status -eq 'ok' }).Count
$bad = @($results | Where-Object { $_.status -eq 'failed' }).Count
$skipped = @($results | Where-Object { $_.status -eq 'skipped' }).Count
$sizeKb = [math]::Round((Get-Item -LiteralPath $zipPath).Length / 1KB, 1)

Write-Host ''
Write-Host '  Collection complete.' -ForegroundColor Green
Write-Host ("  {0} checks collected, {1} failed, {2} skipped." -f $ok, $bad, $skipped)
Write-Host ''
Write-Host "  $zipPath" -ForegroundColor Cyan
Write-Host ("  {0} KB" -f $sizeKb) -ForegroundColor DarkGray
Write-Host ''
if ($bad -gt 0) {
    Write-Host '  Some checks failed, usually a permissions or version difference.' -ForegroundColor Yellow
    Write-Host '  Send the file anyway — we work with what collected, and the log' -ForegroundColor Yellow
    Write-Host '  inside tells us what did not.' -ForegroundColor Yellow
    Write-Host ''
}
Write-Host '  Next step: email the zip to healthcheck@onsys.com.au,' -ForegroundColor White
Write-Host '  quoting your company name.' -ForegroundColor White
Write-Host ''
Write-Host '  We send a written report within 7 business days of receiving it, and' -ForegroundColor White
Write-Host '  book a free Teams call to walk you through it within 2 weeks.' -ForegroundColor White
Write-Host ''
Write-Host '  Provided as is, without warranty. (c) 2026 Onsys Pty Ltd.' -ForegroundColor DarkGray
Write-Host ''
