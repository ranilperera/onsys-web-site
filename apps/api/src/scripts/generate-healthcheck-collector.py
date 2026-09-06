"""Generate the two customer-facing health check artefacts.

Both come from one template, apps/web/content/healthcheck-bundle.template.html:

  * apps/web/public/onsys-sql-server-health-check.html  - the queries, to read
  * apps/web/public/Invoke-OnsysHealthCheck.ps1         - the collector, to run

The 20 checks are authored once, in that template, because the page is what a DBA
reads before agreeing to run anything. Generating the script from the same source
is what stops the two drifting: a wording or query change carries into the download
instead of quietly disagreeing with the page.

Company details - legal name, phone, contact address, site URL - are placeholders
filled from the monorepo root .env, so the copyright and disclaimer never restate
a company name that lives somewhere else. Re-run after changing any ORG_* value:

    npm run generate:healthcheck

Both outputs are committed, so the Docker build does not need Python.
"""
import html
import io
import os
import re

import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
TEMPLATE = os.path.join(ROOT, 'apps', 'web', 'content', 'healthcheck-bundle.template.html')
PAGE_OUT = os.path.join(ROOT, 'apps', 'web', 'public', 'onsys-sql-server-health-check.html')
# Deliberately NOT under public/: the collector is what the contact details are
# exchanged for, and anything in public/ is served to anyone who guesses the
# filename. It is served by apps/web/src/app/download/collector, which requires
# a token minted by the request form.
TARGET = os.path.join(ROOT, 'apps', 'web', 'content', 'Invoke-OnsysHealthCheck.ps1')
ENV_FILE = os.path.join(ROOT, '.env')

# Defaults matter: the Docker build has no .env, and a missing value must not
# put an empty company name into a copyright notice.
DEFAULTS = {
    'ORG_LEGAL_NAME': 'Onsys Technologies Pty Ltd',
    'ORG_NAME': 'Onsys Technologies',
    'ORG_PHONE': '1800 431 416',
    # NEXT_PUBLIC_SITE_URL is the canonical public address; SITE_URL is where
    # the server happens to be bound, which in development is localhost. These
    # artefacts are handed to customers, so they must never carry a dev binding.
    'NEXT_PUBLIC_SITE_URL': 'https://www.onsys.com.au',
    'SITE_URL': 'https://www.onsys.com.au',
    'HEALTHCHECK_RESULTS_TO': 'healthcheck@onsys.com.au',
}


def read_env():
    """Minimal .env reader.

    Deliberately not dotenv: this script runs from npm without a Python
    environment to install into, and it needs five plain KEY=value lines.
    A real environment variable wins over the file, which is what lets a
    deployment override without editing anything.
    """
    values = dict(DEFAULTS)
    if os.path.exists(ENV_FILE):
        for raw in io.open(ENV_FILE, encoding='utf-8'):
            line = raw.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, _, value = line.partition('=')
            key = key.strip()
            if key in values:
                values[key] = value.strip().strip('"').strip("'")
    for key in values:
        if os.environ.get(key):
            values[key] = os.environ[key]
    return values


ENV = read_env()
# Public URL first, and never a localhost binding: a script a customer keeps
# must point at the real site.
_site = ENV.get('NEXT_PUBLIC_SITE_URL') or ENV['SITE_URL']
if 'localhost' in _site or '127.0.0.1' in _site:
    _site = DEFAULTS['NEXT_PUBLIC_SITE_URL']
SITE_URL = _site.rstrip('/')
TOKENS = {
    '{{LEGAL_NAME}}': ENV['ORG_LEGAL_NAME'],
    '{{ORG_NAME}}': ENV['ORG_NAME'],
    '{{PHONE}}': ENV['ORG_PHONE'],
    '{{HEALTHCHECK_EMAIL}}': ENV['HEALTHCHECK_RESULTS_TO'],
    '{{SITE_URL}}': SITE_URL,
    '{{SITE_HOST}}': SITE_URL.split('//')[-1].split('/')[0],
    '{{YEAR}}': str(datetime.date.today().year),
}


def render(text):
    for token, value in TOKENS.items():
        text = text.replace(token, value)
    return text


def read_published_checks(page):
    """Parse the 20 checks out of the page a DBA reads before running anything."""
    found = []
    for m in re.finditer(r'<section class="check" id="c(\d+)">(.*?)</section>', page, re.S):
        num, body = int(m.group(1)), m.group(2)
        title = re.sub(r'<[^>]+>', '', re.search(r'<h2>(.*?)</h2>', body, re.S).group(1)).strip()
        badge = re.search(r'class="badge (\w+)"', body)
        pre = re.search(r'<pre>(.*?)</pre>', body, re.S)
        code = html.unescape(re.sub(r'<[^>]+>', '', pre.group(1))) if pre else ''
        # The page shows an interactive preamble. The collector sets the database
        # on the connection instead, and GO is a client batch separator that
        # ADO.NET does not understand.
        sql = re.sub(r'^\s*USE \[YourDatabase\];[^\n]*\n', '', code)
        sql = re.sub(r'^\s*GO\s*\n', '', sql, flags=re.M).strip()
        found.append(dict(
            num=num,
            title=title,
            clean=re.sub(r'\s*(PowerShell|T-SQL|Per database)\s*', ' ', title).strip(),
            lang='powershell' if (badge and badge.group(1) == 'ps') else 'tsql',
            perdb='Per database' in title,
            sql=sql,
        ))
    found.sort(key=lambda c: c['num'])
    assert len(found) == 20, 'expected 20 checks on the page, found %d' % len(found)
    return found


# Render the page first, then parse the checks out of the rendered copy, so the
# script embeds exactly the SQL a reader sees.
PAGE_HTML = render(io.open(TEMPLATE, encoding='utf-8').read())
io.open(PAGE_OUT, 'w', encoding='utf-8', newline='\n').write(PAGE_HTML)
print('wrote', PAGE_OUT, len(PAGE_HTML), 'chars')

checks = read_published_checks(PAGE_HTML)
tsql = [c for c in checks if c['lang'] == 'tsql']

HEADER = r'''<#
.SYNOPSIS
    Collects the data for the {{ORG_NAME}} free 20-point SQL Server health check.

.DESCRIPTION
    Runs the twenty published checks against one SQL Server instance, writes one
    CSV per check, and packages the results into a single zip file for you to
    send back to {{ORG_NAME}}.

    Every statement this script runs is READ-ONLY. It queries dynamic management
    views and catalog views only: there is no INSERT, UPDATE, DELETE, ALTER or
    DBCC anywhere in it, nothing is written to your instance, and no configuration
    is changed. The exact queries are the ones published at
    {{SITE_URL}}/onsys-sql-server-health-check.html — read them there
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

    Send the zip it produces to {{HEALTHCHECK_EMAIL}}, quoting your company
    name. We return a written report within 7 business days of receiving it, and
    book a free Teams call to walk you through it within 2 weeks.

    ---------------------------------------------------------------------------
    Copyright (c) {{YEAR}} {{LEGAL_NAME}}. All rights reserved.

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

    To the extent permitted by law, {{LEGAL_NAME}} accepts no
    liability for any loss or damage arising from the use of this script.
    Nothing it reports is advice about your specific circumstances until we
    have analysed the output and given you a report.

    {{LEGAL_NAME}} — {{PHONE}} — {{SITE_URL}}
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
    $b['Application Name'] = "{{ORG_NAME}} Health Check Collector $CollectorVersion"
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

'''

FOOTER_TEMPLATE = r'''
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
Write-Host '  {{ORG_NAME}}: free 20-point SQL Server health check' -ForegroundColor Cyan
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
Write-Host '  Next step: email the zip to __EMAIL__,' -ForegroundColor White
Write-Host '  quoting your company name.' -ForegroundColor White
Write-Host ''
Write-Host '  We send a written report within 7 business days of receiving it, and' -ForegroundColor White
Write-Host '  book a free Teams call to walk you through it within 2 weeks.' -ForegroundColor White
Write-Host ''
Write-Host '  Provided as is, without warranty. (c) {{YEAR}} {{LEGAL_NAME}}.' -ForegroundColor DarkGray
Write-Host ''
'''


def strip_trailing_comments(sql):
    """Drop a trailing block of comment-only lines.

    The page carries commented-out alternatives for older builds as a note to
    the reader. The collector cannot run them, so in the script they are only
    noise - and worse than noise: a DBA reviewing the download greps for INSERT
    and CREATE, and dead code makes them stop and work out whether the read-only
    promise still holds. Inline comments explaining a live query are kept; only
    a trailing run of comment lines is removed.
    """
    out = sql.rstrip().split(chr(10))
    while out and (not out[-1].strip() or out[-1].lstrip().startswith('--')):
        out.pop()
    return chr(10).join(out).rstrip()


def ps_here_string(sql: str) -> str:
    """Single-quoted here-string: SQL is literal, so @@VERSION and $ stay intact."""
    return "@'\n" + sql + "\n'@"


def emit() -> str:
    out = [HEADER]

    out.append('# ---------------------------------------------------------------------------\n')
    out.append('# The twenty checks\n')
    out.append('#\n')
    out.append('# These are the published queries, unchanged except that the interactive\n')
    out.append('# "USE [YourDatabase]; GO" preamble is gone: the collector sets the database\n')
    out.append('# on the connection, and GO is a client batch separator rather than T-SQL.\n')
    out.append('# ---------------------------------------------------------------------------\n\n')

    # Checks 1 and 2 read the host, so they are PowerShell rather than T-SQL.
    ps_checks = [c for c in checks if c['lang'] == 'powershell']
    out.append('$OsChecks = @(\n')
    for c in ps_checks:
        body = '\n'.join('        ' + ln for ln in c['sql'].splitlines())
        out.append('    @{\n')
        out.append(f"        Num    = {c['num']}\n")
        out.append(f"        Name   = '{c['clean']}'\n")
        out.append('        Script = {\n')
        out.append(body + '\n')
        out.append('        }\n')
        out.append('    }\n')
    out.append(')\n\n')

    for label, subset in (
        ('InstanceChecks', [c for c in tsql if not c['perdb']]),
        ('DatabaseChecks', [c for c in tsql if c['perdb']]),
    ):
        out.append(f'${label} = @(\n')
        for c in subset:
            out.append('    @{\n')
            out.append(f"        Num  = {c['num']}\n")
            out.append(f"        Name = '{c['clean']}'\n")
            out.append('        Sql  = ' + ps_here_string(strip_trailing_comments(c['sql'])) + '\n')
            out.append('    }\n')
        out.append(')\n\n')

    out.append(FOOTER_TEMPLATE)
    return ''.join(out)


script = render(emit()).replace('__EMAIL__', TOKENS['{{HEALTHCHECK_EMAIL}}'])
target = TARGET
# BOM: Windows PowerShell 5.1 reads a BOM-less file as ASCII and mangles the
# non-ASCII characters in the console output.
io.open(target, 'w', encoding='utf-8-sig', newline='\r\n').write(script)
print('wrote', target, len(script), 'chars')
