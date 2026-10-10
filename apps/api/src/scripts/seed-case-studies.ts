import type { Block, CaseStudyRegion } from '@onsys/shared';

/**
 * Case studies — anonymised accounts of delivered work.
 *
 * Written from Onsys's own project documentation. Those documents are
 * commercial-in-confidence and no client has given permission to be named, so
 * the rules here are absolute:
 *
 *   - no client name, ever, and no internal platform or project name either,
 *     because a platform name identifies its owner as surely as a company name
 *   - no individual's name, on either side of the engagement
 *   - no hostnames, instance names, listener names, IP addresses, ports,
 *     product version or build numbers, and no prices
 *   - sector, region and year only; region is coarse for the Pacific, because
 *     sector plus country identifies the client in a market with one operator
 *
 * The admin API enforces the mechanical half of that on every save — see
 * findForbiddenIdentifiers — but the judgement half lives here.
 *
 * On outcomes: none of the source documents records a measured result. There is
 * no RPO figure, no uptime percentage, no before-and-after number anywhere in
 * the set. So these describe what was built and what that design guarantees,
 * which is checkable, and they state the one outcome that holds across every
 * engagement: fixed price, agreed timeline, no cost variation. Nothing is
 * quantified that was not measured.
 */

export interface SeedCaseStudy {
  slug: string;
  title: string;
  summary: string;
  sector: string;
  region: CaseStudyRegion;
  deliveredYear: number;
  platforms: string[];
  seoTitle: string;
  seoDescription: string;
  blocks: Block[];
  status?: 'DRAFT' | 'PUBLISHED';
}

export const caseStudies: SeedCaseStudy[] = [
  {
    /*
     * Written October 2026 from the client-supplied write-up, in the sales
     * tone used across the site.
     *
     * Paired with azure-payment-platform-migration-pacific-telco. Both describe
     * one Azure programme for one client, split by subject: that page owns the
     * network boundaries, the partner connectivity and the governance, this one
     * owns the database migration, its dependencies and the cutover. The
     * network section that briefly lived here went back to that page on
     * 10 October 2026 when it was reinstated. Do not let either grow into the
     * other's material, or the site publishes one engagement twice.
     *
     * The client’s brand name appears in the source’s document reference in
     * roughly fifteen places and is stripped throughout.
     *
     * "Zero data loss" is claimed here, unlike on the manufacturing study
     * where the same phrase was deliberately avoided. It is defensible in this
     * case and the mechanism is stated alongside it: writes were stopped at a
     * defined point, the final state synchronised and validated, and
     * connectivity redirected only afterwards. That is a controlled cutover,
     * not asynchronous replication with a forced failover.
     */
    slug: 'sql-server-azure-sql-mi-migration-pacific-telco',
    title: 'Migrating a Mission-Critical SQL Server Platform to Azure SQL Managed Instance',
    summary:
      'A cloud database migration where losing a transaction was not an option. The databases moved, and so did the jobs, the logins and the encryption objects the applications depend on — rehearsed first, cut over with writes stopped and the final state validated, then geo-replicated to a second region that also takes read traffic.',
    sector: 'Telecommunications',
    region: 'Pacific',
    deliveredYear: 2021,
    platforms: ['Azure SQL Managed Instance', 'SQL Server', 'Geo-replication', 'Azure Front Door', 'ExpressRoute'],
    seoTitle: 'Azure SQL Managed Instance Migration — Pacific Telco Case Study',
    seoDescription:
      'How Onsys migrated a Pacific telecommunications operator from on-premises SQL Server to Azure SQL Managed Instance — zero data loss at cutover, full dependency migration and multi-region recovery.',
    blocks: [
      {
        type: 'richText',
        heading: 'The problem',
        html: `<p>Moving a critical SQL Server database to the cloud is easy to describe. Moving it without losing a transaction, breaking an application dependency, or discovering a missing SQL Server object the morning after cutover is a different project entirely.</p><p>A backup and a restore will move a database. What it will not move is the service around it — the scheduled jobs that run the overnight processing, the logins the applications authenticate with, the certificates without which an encrypted database will not open. Those arrive as absences, discovered one at a time, after production is already on the other side.</p><p>So the question was never whether a SQL Server database could be restored into Azure. It was whether the complete database service could move and the applications carry on as though nothing had happened.</p>`,
      },
      {
        type: 'checkList',
        eyebrow: 'What had to move with it',
        heading: 'The database is the easy part',
        body: 'Each of the following is a dependency that is invisible while it works and obvious the moment it does not. They were inventoried before the migration rather than discovered after it.',
        items: [
          'The production databases themselves, with their performance characteristics intact',
          'SQL Agent jobs — the scheduled operational and application processing that nothing points at until it stops running',
          'Logins, users and permissions, so applications and the support team authenticate the same way afterwards',
          'Encryption certificates and keys, without which an encrypted database is present but unopenable',
          'Application connection configuration, and the integrations that reach the platform from outside it',
          'Operational settings and database-level configuration that the applications were built against',
          'A rollback route, defined before the cutover rather than improvised during it',
          'No lost transactions — which constrains how the final cutover can be sequenced',
        ],
      },
      {
        type: 'richText',
        heading: 'What we built',
        html: `<p>Azure SQL Managed Instance as the target: a managed Azure SQL service that keeps the broad SQL Server compatibility an established enterprise application estate depends on. Choosing it was the quick decision. Getting production onto it safely was the project.</p><p>That started with an assessment of what actually had to move — at the database level and at the instance level. Jobs, logins, permissions, encryption objects and operational configuration were catalogued as migration items in their own right, not as things to tidy up afterwards. It is the step that separates a database that is online from a database service that works, and the one most often skipped because it produces no visible progress.</p><p>The target was then placed inside the wider Azure design, with the application tier in front of it and a second Azure region behind it for recovery.</p>`,
      },
      {
        type: 'steps',
        eyebrow: 'The part worth copying',
        heading: 'Rehearse it, then cut over with the writes stopped',
        body: 'Production was not the first test of the migration process. The sequence below ran more than once before the live window, so the cutover itself was the shortest and least interesting part of the project.',
        steps: [
          {
            title: 'Rehearse the whole migration',
            body: 'The full move was performed and validated ahead of the live window — which is what surfaces the hidden dependency, the job that does not exist on the target and the certificate nobody listed. Problems found in a rehearsal cost an afternoon; the same problems found at cutover cost an outage.',
          },
          {
            title: 'Test the service, not the database',
            body: 'Connectivity, application functionality, integration and load testing, then remediation, then testing again. A successful query proves the database is up. It does not prove a telecommunications platform is ready to take traffic.',
          },
          {
            title: 'Stop the writes at a defined point',
            body: 'This is what makes zero data loss a fact rather than a slogan. Application writes are halted at an agreed moment, so there is no window in which a transaction can be committed to a source that is no longer the one being migrated.',
          },
          {
            title: 'Synchronise and validate the final state',
            body: 'The last of the data is moved and checked against the source before anything is redirected. The decision to proceed is made on evidence, at a point where not proceeding is still an option.',
          },
          {
            title: 'Redirect, then watch',
            body: 'Application connectivity and the dependent integrations are pointed at Azure, end-to-end validation confirms transactions complete, and the environment is monitored through the stabilisation period rather than signed off at the change window’s end.',
          },
          {
            title: 'Or go back, on a written procedure',
            body: 'Defined before the migration began: return services to the on-premises platform, restore application connections, redirect the dependent systems. The team knew both routes before it started, which is the only state in which a cutover decision can be made calmly.',
          },
        ],
      },
      {
        type: 'richText',
        heading: 'A recovery region that earns its keep',
        html: `<p>The database was then geo-replicated into a second Azure region, giving the operator a geographically separate copy as part of its recovery position rather than everything depending on one location.</p><p>The more interesting decision was what to do with it the rest of the time. Most disaster-recovery infrastructure is paid for monthly and used never — a line item defended once a year. Here, eligible read workloads were directed to the secondary region while transactional writes stayed with the primary.</p><p>That buys two things from one spend. The recovery replica stays ready, and it absorbs reporting and query traffic that would otherwise compete with production writes. It also makes the read and write paths explicit rather than accidental, which is the groundwork for scaling either of them later. Disaster recovery stops being an insurance policy and becomes part of the production architecture — and a DR environment that is carrying real traffic is one you find out about quickly if it breaks.</p>`,
      },
      {
        type: 'richText',
        heading: 'The outcome',
        html: `<p>The measure of this project was never whether a SQL database existed in Azure at the end of the change window. It was whether the business could keep operating from Azure with its transactions, its security, its scheduled processing, its integrations and its recovery capability all intact.</p><p>The databases moved with the service around them. The cutover protected every committed transaction because the writes were stopped before the final synchronisation, not after. The route back existed before the route forward was taken. And the recovery region does real work between the incidents it was bought for.</p>`,
      },
    ],
  },

  {
    /*
     * Written October 2026 from the client-supplied write-up, in the sales
     * tone used across the site.
     *
     * Paired with sql-server-azure-sql-mi-migration-pacific-telco. Both come
     * from one source document describing one Azure programme, and they are
     * split by subject rather than duplicated: this page owns the network
     * boundaries, the partner connectivity and the governance; that page owns
     * the database migration, its dependencies and the cutover. Keep that line
     * or the site publishes one engagement twice.
     *
     * Sector is Payments, not the Telecommunications the source names. Telco
     * plus payments plus Pacific narrows to essentially one operator, and two
     * other studies already sit under Telecommunications in this region.
     *
     * The client\\u2019s brand name is in the source\\u2019s document reference in roughly
     * twenty places and is stripped throughout.
     */
    slug: 'azure-payment-platform-migration-pacific-telco',
    title: 'A payment platform going to cloud, with customers, banks and partners attached',
    summary:
      'Moving the application was only part of the challenge. Public traffic, an existing data centre, banks and remittance partners all needed to reach the new Azure platform \\u2014 without being able to reach each other. A segmented, multi-region design with private hybrid connectivity, isolated partner access and database disaster recovery.',
    sector: 'Payments',
    region: 'Pacific',
    deliveredYear: 2021,
    platforms: ['Azure', 'Azure Front Door', 'Application Gateway', 'ExpressRoute', 'Azure Site Recovery'],
    seoTitle: 'Azure Payment Platform Migration \\u2014 Pacific Case Study',
    seoDescription:
      'How Onsys designed and delivered a secure multi-region Azure migration for a Pacific payment platform \\u2014 segmented networks, private interconnect, isolated partner VPNs and cross-region recovery.',
    blocks: [
      {
        type: 'richText',
        heading: 'The problem',
        html: `<p>Moving a payment platform to the cloud is not a server migration. Public web and mobile traffic still has to reach the service. Internal systems have to stay connected. Banks and remittance partners need tightly controlled access. The database has to be protected. And if a region goes away, the business still needs somewhere to go.</p><p>Payment platforms have an awkward set of neighbours: public users on one side, an existing data centre on another, partner banks and remittance networks on a third. All three need to reach the platform. None of them should be able to reach each other. A lift-and-shift puts them all on one flat network and quietly removes that distinction \\u2014 which is the one thing a payment environment cannot afford to lose.</p>`,
      },
      {
        type: 'checkList',
        eyebrow: 'What it had to solve',
        heading: 'Everything the platform was already connected to',
        body: 'The application was the smallest part of the problem. Each of the following was an existing dependency that had to keep working the day after the migration, and several of them belong to someone else.',
        items: [
          'Public web and mobile users, reaching the service over the internet',
          'An existing data centre that was not moving, and systems on it the platform still depends on',
          'Banking institutions, each with its own integration',
          'Remittance partners, likewise',
          'The application and API tier, and the SQL Server databases behind it',
          'Production and staging, which needed to stay distinguishable rather than merging in the move',
          'Security, governance and operational monitoring, from day one rather than retrofitted',
          'A recovery position that survives losing the whole primary region',
        ],
      },
      {
        type: 'richText',
        heading: 'What we built',
        html: `<p>Separate virtual networks, not one estate. Public traffic enters through a global front-door service and a web application firewall, then an application gateway and firewall decide which backend it reaches \\u2014 production or staging, and never an application server exposed directly to the internet. That boundary, between the public internet and the systems processing the transaction, is the highest-risk surface on a payment platform, so it is the one that got the layers.</p><p>The existing data centre connects over a private circuit rather than the public internet. That is what made a staged migration possible: the payment platform could move to Azure without every system it integrates with having to move at the same time.</p><p>Banks and remittance partners come in through VPN gateways into a network of their own, kept separate from the on-premises path. Each partner reaches the payment services its integration needs and has no route to anything else. The principle is simple and the consequence is not: collapsing that boundary is easy at build time and very hard to unpick once a dozen partners are connected through it.</p>`,
      },
      {
        type: 'richText',
        heading: 'And somewhere to go if the region fails',
        html: `<p>Migrating to cloud does not remove the need for disaster recovery; it changes what the recovery unit is. The environment spans a primary and a secondary Azure region. The managed database replicates across them, region-to-region recovery is provisioned for the rest of the infrastructure rather than the database alone, and the front-door service can redirect traffic to the recovery region when it is needed. Private connectivity reaches both, so a recovery does not stall waiting for a network path to be built under pressure.</p><p>The outcome is not "the application is now in Azure". It is that the application has somewhere to go when its primary region is not.</p>`,
      },
      {
        type: 'steps',
        eyebrow: 'The part worth copying',
        heading: 'A cutover with a rollback written before it started',
        body: 'A successful VM migration means very little if customers, internal systems or financial partners cannot complete a transaction afterwards. So the sequence proved the whole path before production depended on it \\u2014 and the way back was documented before anyone needed it.',
        steps: [
          {
            title: 'Build, then prove the connections',
            body: 'Azure resources stood up, the database migration prepared, the application deployed \\u2014 then connectivity testing to verify that every system and network that has to talk, can.',
          },
          {
            title: 'Test it as a service, not as infrastructure',
            body: 'Functional and integration testing across the application and its connected services, load testing against expected demand, and compliance validation. All of it resolved before the production move rather than discovered during it.',
          },
          {
            title: 'A controlled outage for the data',
            body: 'Application writes stopped, a final backup captured, and the production database moved to the managed service. This is the only part the business feels, and it is short because everything else has already been proven.',
          },
          {
            title: 'Cut over the traffic, then the partners',
            body: 'DNS redirected to the new environment, banking and remittance connectivity repointed to the Azure endpoints, and the remaining on-premises systems and APIs sent to their new destinations.',
          },
          {
            title: 'Validate the whole transaction path',
            body: 'End-to-end verification that a transaction completes, then watch the environment. A green resource list is not the same as a healthy service, and on a payment platform the difference is the whole job.',
          },
          {
            title: 'Or roll back, on a written procedure',
            body: 'Documented before the migration, not during it: stop the Azure application layer, return the database on-premises, restore application connectivity, redirect partners and DNS, validate again. A defined decision path instead of one invented at three in the morning.',
          },
        ],
      },
      {
        type: 'checkList',
        eyebrow: 'Decided before the first workload moved',
        heading: 'Governance, because it is the expensive thing to change later',
        body: 'Subscription layout, resource grouping, naming and policy are the least interesting part of a cloud migration and the most expensive to retrofit. Deciding them first is what keeps a cloud estate auditable; deciding them afterwards means re-homing live resources.',
        items: [
          'Management groups and subscriptions separating production from staging, rather than letting one undifferentiated estate grow',
          'Resource groups organised by function \\u2014 networking, security, database, application, management, storage \\u2014 so operational ownership is obvious',
          'A standard naming model and a tagging strategy covering business criticality, owner, application, cost centre, budget, DR classification and environment',
          'Identity services, network security groups, a managed secrets store and resource locks applied as part of the build',
          'Monitoring, logging, alerting, service health, application insights and network traffic analysis included in the migration scope, not booked as later work',
          'A governance framework oriented to ISO 27001 and PCI DSS expectations, because a payment workload will be asked about both',
        ],
      },
      {
        type: 'richText',
        heading: 'The outcome',
        html: `<p>The valuable part of this engagement was not moving workloads from a data centre into Azure. It was deciding how a payment platform should be shaped once it got there.</p><p>Customers needed access. Banks and remittance partners needed access. The existing data centre needed access. None of those networks needed unrestricted access to each other \\u2014 and keeping that true, while adding regional protection for the database, monitoring the operations team can read and a governed estate that can be audited, is the difference between a migration and a platform.</p>`,
      },
    ],
  },

  {
    /*
     * Written October 2026 from the client-supplied write-up, in the sales
     * tone used across the site.
     *
     * Replaces healthcare-sql-server-high-availability-encryption, which
     * described the same engagement in three blocks. The old slug 301s here.
     * The year is carried over from it, because the source does not state one
     * and it is the same piece of work.
     *
     * The build-document reference threaded through the source is stripped: it
     * opens with the client’s initials and names their internal document, and
     * like the others it is too short and too hyphenated for
     * findForbiddenIdentifiers to catch.
     *
     * No specific SQL Server version, port number, service account name or
     * host name appears, although the source material discusses all four.
     */
    slug: 'sql-server-always-on-healthcare-australia',
    title: 'Building an Always-On SQL Server Platform for an Australian Healthcare Provider',
    summary:
      'A business-critical healthcare database was running without database-level high availability. Now: a two-node Always On architecture with synchronous replication and automatic failover, a stable listener for the applications, and encryption at rest across the databases — so losing the primary server is not the same as losing the service.',
    sector: 'Healthcare',
    region: 'Australia',
    deliveredYear: 2016,
    platforms: ['SQL Server', 'Always On availability groups', 'Windows Server Failover Clustering', 'Transparent Data Encryption'],
    seoTitle: 'SQL Server Always On for Australian Healthcare — Case Study',
    seoDescription:
      'How Onsys moved an Australian healthcare provider to SQL Server Always On — two-node clustering, synchronous replication with automatic failover, a stable application listener and encryption at rest.',
    blocks: [
      {
        type: 'richText',
        heading: 'The problem',
        html: `<p>For a healthcare provider, database availability is not an infrastructure statistic. Clinical and administrative systems are read by people making decisions, and when the database behind one of them stops answering, the effect is immediate and visible to patients.</p><p>This provider’s SQL Server environment was running on standalone virtual machines. Backups existed and were sound, but a backup answers a different question from the one that matters at nine on a Monday morning: it tells you the data is recoverable, not that the service is available. Losing the production server meant somebody restoring a database while the applications waited.</p><p>And availability was only half the requirement. The databases hold health information, which Australian privacy law treats as a special category. A design that delivered resilience by making another unencrypted copy of the data would have solved one problem by creating another.</p>`,
      },
      {
        type: 'checkList',
        eyebrow: 'What it had to solve',
        heading: 'Not just a second SQL Server',
        body: 'Standing up a secondary instance is the easy part and the part that gets mistaken for the job. Each of the following had to be answered before the environment could be called highly available.',
        items: [
          'High availability at the database layer, not only at the virtual machine layer',
          'Windows failover clustering underneath it, with quorum that survives losing a node',
          'Application connectivity after a failover — where the applications point once the primary moves',
          'Controlled initial synchronisation, rather than assuming the databases were ready to be replicated',
          'Encryption of the data at rest, extended to the secondary so encrypted databases can participate properly',
          'Backup, recovery and scheduled maintenance on the new platform',
          'Proactive alerting, so a replication problem is something the team is told about',
          'A patching procedure that works with the architecture instead of against it',
          'A documented quality review before handover, covering performance, security and recoverability',
        ],
      },
      {
        type: 'richText',
        heading: 'What we built',
        html: `<p>Two SQL Server Enterprise instances on virtualised Windows Server, joined by Windows Server Failover Clustering — quorum configured with a file-share witness so the cluster can lose a node and still know it has one, distributed transaction support configured, and the cluster properties tuned rather than left at their defaults.</p><p>On top of that, an availability group with <strong>synchronous commit and automatic failover</strong>. That is the change that matters. A standalone model asks "how quickly can we repair the database server?" This one asks "can another server take over?" — and answers it without waiting for an administrator to decide.</p><p>Applications connect through an availability group listener rather than a server hostname, so when the primary role moves between replicas the application tier keeps using the same endpoint. Without that, a successful failover still leaves every application pointed at a server that is no longer primary, which is how an HA environment manages to fail over and go down at the same time.</p><p>The databases were brought in under a controlled process rather than a switch: a fresh full backup and the required transaction log backup for each, added to the availability group, restored onto the secondary in the correct recovery state, then joined. Repeated per database. It is slower than the automatic seeding option and it means the initial synchronisation is something we watched rather than assumed.</p>`,
      },
      {
        type: 'richText',
        heading: 'Encrypted, without giving up the failover',
        html: `<p>Transparent Data Encryption was applied across the application databases, which is straightforward on a standalone instance and less so inside an availability group: the master key and certificate are created and protected on the primary, and the certificate and its private key have to be present on the secondary as well, or the encrypted database cannot join. Encryption was then enabled per database and the state verified through SQL Server’s own encryption metadata rather than taken on trust.</p><p>The point is that the client was never asked to choose between availability and encryption at rest. Both were engineered in, which is the only acceptable answer when the data is health information and the secondary replica is a second complete copy of it.</p>`,
      },
      {
        type: 'steps',
        eyebrow: 'The part worth copying',
        heading: 'Patching that the architecture survives',
        body: 'High availability has to survive routine maintenance as well as unexpected failure — and more HA environments are broken by a cumulative update than by a server dying. The procedure was written and handed over rather than left for the support team to work out after go-live.',
        steps: [
          {
            title: 'Take the secondary out of the failover path',
            body: 'Its failover mode and synchronisation settings are changed first, so applying an update to it cannot trigger a failover of production in the middle of the work.',
          },
          {
            title: 'Patch the secondary and let it catch up',
            body: 'The update is applied while production carries on untouched on the primary, then the replica is brought back into synchronisation and confirmed healthy before anything else happens.',
          },
          {
            title: 'Move the primary role deliberately',
            body: 'A planned failover onto the patched replica — which also exercises the failover path on a day someone chose, rather than on a day that chose itself.',
          },
          {
            title: 'Patch the remaining node, then restore the settings',
            body: 'The former primary is updated in turn and the synchronisation and automatic-failover settings are returned to their normal state, leaving the environment exactly as it started, one version further on.',
          },
        ],
      },
      {
        type: 'checkList',
        eyebrow: 'Reviewed before handover',
        heading: 'Delivered as an operated platform, not a finished install',
        body: 'The common failure in HA projects is treating the work as complete the moment replication turns green. The environment went through a documented quality review across performance, security, recoverability and robustness before it was handed over.',
        items: [
          'Memory configuration, MAXDOP, trace flags and backup compression set deliberately rather than left at install defaults',
          'TempDB configuration, file placement, database growth settings, page verification and checksums',
          'Scheduled maintenance and integrity checks running, with backups taken and verified on the new platform',
          'Database Mail, operators and alerts configured, plus blocked-process monitoring and automatic error-log cycling',
          'Volume maintenance and lock-pages-in-memory privileges granted to the service accounts that need them',
          'Security review covering service accounts, auditing, a non-default instance port and the SQL Server Browser service disabled',
          'Operating system and SQL Server patch levels confirmed on both nodes before sign-off',
        ],
      },
      {
        type: 'richText',
        heading: 'The outcome',
        html: `<p>A standalone production dependency became an availability group. A server hostname became a listener. A passive recovery option became a synchronised secondary that can take the primary role on its own. The databases are encrypted at rest, on both replicas. And monitoring, maintenance, backups, alerts, patching and a documented quality review went in as part of the platform rather than onto a list of things to do later.</p><p>For an organisation whose critical systems cannot wait for a failed database server to be repaired, that is the whole difference: the question stopped being how fast the server can be fixed, and became whether anyone outside the IT team needs to know it broke.</p>`,
      },
    ],
  },

  {
    /*
     * Rewritten October 2026 from the client-supplied write-up, in the sales
     * tone used across the site.
     *
     * Two things were stripped from the source rather than reworded. It
     * carried the live availability-group name in several places, which names
     * the client in a market where sector plus country already narrows it to a
     * handful of organisations; and it carried document citation markers from
     * whatever tool produced it. Neither is caught by findForbiddenIdentifiers
     * — the AG name is too short for the hostname pattern — which is exactly
     * the case its own comment warns the guard cannot cover.
     *
     * The slug is unchanged. The source suggested a new one, but this URL is
     * published, indexed and linked from the home page card grid, and a better
     * slug is not worth a 404 and the lost equity.
     *
     * The ERP vendor is not named either, on the client's instruction of
     * 7 October 2026. The source write-up named it throughout; sector plus
     * country plus vendor narrows the field further than sector plus country
     * alone, so the copy says "the ERP application" and the platform chips
     * list only the database stack. Do not reinstate it from the source.
     *
     * No zero-data-loss claim appears anywhere, deliberately. Cross-site
     * replication here is asynchronous and the documented site-loss procedure
     * includes a forced failover, so that promise would be stronger than the
     * engineering supports.
     */
    slug: 'manufacturing-distributed-availability-groups-two-data-centres',
    title: 'From legacy replication to tested ERP disaster recovery, for a manufacturing organisation',
    summary:
      'A business-critical ERP database needed a new disaster-recovery strategy as its replication platform reached end of life. Now: a multi-site SQL Server distributed availability group, a runbook for a real site loss, and a DR test that runs while production stays open to applications.',
    sector: 'Manufacturing',
    region: 'Sri Lanka',
    deliveredYear: 2024,
    platforms: ['SQL Server', 'Always On availability groups', 'Windows Server'],
    seoTitle: 'SQL Server Distributed Always On for ERP | Case Study',
    seoDescription:
      'How Onsys replaced an end-of-life replication platform with a SQL Server distributed availability group across two data centres — multi-site HA, a tested DR procedure and a documented runbook.',
    blocks: [
      {
        type: 'richText',
        heading: 'The problem',
        html: `<p>A manufacturing organisation was running its ERP on a database the business could not operate without, and the platform doing the replication and backup underneath it was reaching end of life. Replacing one standalone replication product with another would have solved the immediate problem and recreated the long-term one: another separate tool to license, patch, monitor and eventually migrate off again.</p><p>The production database was already protected inside its primary data centre by an Always On availability group. What it did not have was protection against losing the data centre — and, more to the point, any practical way to find out whether recovery would work. A single availability group stretched across both sites would have coupled them: site-level work touches the production replicas, and a disaster-recovery test means interrupting the thing you are protecting.</p><p>Which is why so many disaster-recovery plans are never tested. If testing costs an outage, the test gets postponed until it is needed, and the first real failover is also the first failover.</p>`,
      },
      {
        type: 'checkList',
        eyebrow: 'What it had to solve',
        heading: 'Seven problems, not one',
        body: 'This was never a database installation. Getting an ERP platform to a recovery position the IT team would actually rely on meant answering all of the following, and a design that answers six of them is not a disaster-recovery capability.',
        items: [
          'High availability inside each data centre, so losing one server is not a site event',
          'Database replication between two geographically separate sites, without another standalone replication product',
          'Application connectivity after a failover — where the ERP application connects once the primary has moved',
          'Monitoring that shows whether replication is actually healthy, rather than the absence of an alert',
          'A repeatable disaster-recovery test the business could run on a schedule',
          'A documented procedure for a genuine site-level disaster',
          'A safe way back to normal operation once a test is finished',
        ],
      },
      {
        type: 'richText',
        heading: 'What we built',
        html: `<p>Two availability groups, joined. The existing production group kept doing its job inside the primary data centre. At the recovery site we built a second two-node Windows Server failover cluster with its own availability group, so the DR location has local resilience of its own rather than being one server someone hopes will be enough.</p><p>The two groups are then connected by a distributed availability group, which replicates between the groups rather than between individual replicas. Each location has its own listener, so applications connect to a name at whichever site they are meant to be using and never need to know which replica is currently primary.</p><p>That gives two distinct levels of protection: server-level resilience within each data centre, and site-level replication between them. The distinction matters more than it sounds. A single replica at another site gives you another copy of the database. A disaster-recovery architecture has to answer what happens when servers, database services, application connections or an entire location go away — and they are four different questions.</p><p>It also retired the end-of-life dependency rather than replacing it. The remote replication now runs inside the SQL Server high-availability architecture itself, on the database engine the ERP platform was already built on, so there is one technology to operate instead of two.</p>`,
      },
      {
        type: 'steps',
        eyebrow: 'The part worth copying',
        heading: 'A disaster-recovery test that does not cost an outage',
        body: 'Plenty of businesses have a second copy of the database somewhere and call it disaster recovery. The question that matters is when the applications were last run against it. This procedure is what makes the honest answer to that question "last quarter" rather than "never".',
        steps: [
          {
            title: 'Detach the recovery replica',
            body: 'The designated DR replica is separated from its availability group for the duration of the test, which leaves its database recoverable in isolation. Production is untouched and replication inside the production group carries on.',
          },
          {
            title: 'Open it at the recovery site',
            body: 'The database is recovered and brought up for application access, reachable through the DR-side listener — the same connection point a real failover would use, so the test exercises the real path.',
          },
          {
            title: 'Point real applications at it',
            body: 'Test application instances are directed to the recovery environment and put through functional validation. This is the step that turns an infrastructure check into an answer: can the application connect, operate and complete its work from the recovery site?',
          },
          {
            title: 'Rebuild and rejoin',
            body: 'When testing is finished the recovery database is rebuilt from the production copy and returned to the availability group, so the environment ends the test in the same state it started — which is what makes it safe to run again.',
          },
        ],
      },
      {
        type: 'richText',
        heading: 'And a written procedure for the real thing',
        html: `<p>Infrastructure without a recovery procedure still leaves the IT team working out what to do during the outage. So the engagement delivered the runbook as well as the architecture: check distributed availability group health, confirm the state of the recovery environment, fail the database workload across to the DR availability group, validate the new primary, redirect the ERP application to the DR-side listener, and release the system for application and integration testing before the business is let back on.</p><p>Every one of those is a step someone would otherwise be inventing at the worst possible moment, with the business watching.</p>`,
      },
      {
        type: 'checkList',
        eyebrow: 'Proof it is still working',
        heading: 'What the operations team can check, any day',
        body: 'Disaster recovery degrades quietly. The implementation documents the queries that read SQL Server’s own availability-group and HADR views, so the team can confirm the two sides are connected and healthy rather than infer it from the fact that nothing has gone off.',
        items: [
          'Distributed availability group connectivity between the two sites',
          'Which replica currently holds the primary role, at each location',
          'Availability mode and operational state of every replica',
          'Synchronisation health across the distributed group',
          'Per-database synchronisation state, not just the group-level summary',
          'The last hardened transaction log position, which is what tells you how far behind the recovery site actually is',
        ],
      },
      {
        type: 'richText',
        heading: 'The outcome',
        html: `<p>The client moved off an end-of-life replication platform onto a SQL Server-native architecture spanning two data centres: local high availability at each site, cross-site replication between them, defined connection points for production and recovery, monitoring the operations team can read, and written procedures for both a test and a real disaster.</p><p>The value was never the extra nodes. It was turning disaster recovery from a line in a document into something the business can exercise on a schedule and watch succeed — so the conversation changes from "we have a DR environment" to "we know how to use it".</p>`,
      },
    ],
  },

  {
    /*
     * Rewritten October 2026 from the client-supplied write-up, in the sales
     * tone used across the site.
     *
     * Three things were taken out of the source rather than reworded.
     *
     * The design-document reference carried through every paragraph of it
     * begins with the client's initials and names their internal project, so
     * it identifies them in a market with very few operators. It is also too
     * short and too hyphenated for findForbiddenIdentifiers to catch, which is
     * the gap that guard's own comment warns about.
     *
     * The MySQL version is gone. The client's standing instruction is that
     * published case studies carry no versions, and no other case study on the
     * site states one — a precise version plus sector plus region is a
     * fingerprint, and it dates the page the moment the estate is upgraded.
     * The products are still named, because those are ours to describe.
     *
     * Node counts are described as "three members and a fourth at the recovery
     * site" where the source gave them, because the shape of the cluster is
     * the engineering and carries no identifying detail.
     *
     * The slug is unchanged. The source suggested a new one, but this URL is
     * published, indexed and linked twice from the home page, and a better
     * slug is not worth a 404 and the lost equity.
     */
    slug: 'telecommunications-mysql-group-replication-cluster-migration',
    title: 'From standalone MySQL to an always-on, multi-site platform, for a Pacific telecommunications operator',
    summary:
      'Single points of failure removed from the database, the routing layer and the recovery position at once: group replication with automatic primary election, redundant routers behind a floating connection point, a replica at a second site, and a migration whose validation gate sat before the cutover.',
    sector: 'Telecommunications',
    region: 'Pacific',
    deliveredYear: 2025,
    platforms: ['MySQL Enterprise', 'Group Replication', 'MySQL Router', 'Keepalived'],
    seoTitle: 'MySQL High Availability for a Pacific Telco — Case Study',
    seoDescription:
      'How Onsys built a MySQL high-availability platform for a Pacific telecommunications operator — group replication, automatic failover, redundant routers and a disaster-recovery replica.',
    blocks: [
      {
        type: 'richText',
        heading: 'The problem',
        html: `<p>For a telecommunications operator, database availability is not an IT statistic. When the database behind a critical application stops answering, the effect reaches operations, customer-facing services and revenue systems within minutes — and it does so in a market where there is often no second provider for customers to fall back on.</p><p>This operator was running a business-critical application against a standalone MySQL server. Every failure scenario ended the same way: somebody recovering a database by hand while the service was down.</p><p>The brief was not "add a replica". A second copy of the database answers exactly one of the ways this environment could fail, and the others would have been left untouched.</p>`,
      },
      {
        type: 'checkList',
        eyebrow: 'What it had to solve',
        heading: 'Eight problems, not one',
        body: 'Availability is not a feature you switch on. Each of the following is a separate way the service could stop, and a design that answers six of them still leaves two ways to take the business offline.',
        items: [
          'Survive the loss of an individual database server without manual recovery',
          'Choose a new writable primary automatically, rather than waiting for someone to be woken up',
          'Stop applications being tied to one named database server',
          'Remove the routing layer as a single point of failure in its own right',
          'Keep a current replica at a separate recovery location',
          'Move the existing databases into the new cluster without losing anything on the way',
          'Keep a real backup and recovery strategy, because replication is not a backup',
          'Leave the operations team written procedures for failover, recovery and routine administration',
        ],
      },
      {
        type: 'richText',
        heading: 'What we built',
        html: `<p>Group replication in single-primary mode on the InnoDB engine: three members in the primary environment and a fourth at the recovery site. One member accepts writes; the rest stay read-only. If the primary leaves the group unexpectedly, the group elects an eligible member to replace it and that member becomes read/write while the others carry on as secondaries. Database availability stops depending on the health of one server.</p><p>That is half a solution. An application pointed directly at a specific host does not benefit from a successful database failover — it reconnects to a server that is no longer the primary and gets errors instead of service. So applications connect through MySQL Router, which knows the role of each member and sends read/write traffic to whichever one currently holds it.</p><p>Which moves the problem rather than solving it, unless you deal with the router too. There are two router instances, with Keepalived holding a floating connection point in front of them: if the active router goes, the address moves to the survivor and the application path stays up.</p><p>The result is protection at two distinct levels. The database layer elects a new primary. The routing layer moves the application-facing connection between redundant routers. Both have to hold for the service to stay up, and each is now someone else’s single point of failure, not this operator’s.</p>`,
      },
      {
        type: 'richText',
        heading: 'And a replica outside the building',
        html: `<p>Local high availability answers server failure. It does nothing about losing the site. A fourth member at the disaster-recovery location takes replicated changes from the group and normally stays read-only, available for promotion if the primary site becomes unavailable.</p><p>Those are genuinely two different capabilities, and conflating them is how estates end up discovering that their "high availability" was only ever server-level. This operator has both, and knows which one answers which question.</p>`,
      },
      {
        type: 'steps',
        eyebrow: 'The part worth copying',
        heading: 'A migration whose validation gate came before the cutover',
        body: 'Building the cluster was the straightforward half. Moving live databases into it without losing anything is where these projects actually fail — so the sequence was designed so that the cutover is the least interesting step in it.',
        steps: [
          {
            title: 'Assess, then back up',
            body: 'The existing databases, the MySQL configuration and the application dependencies are inventoried first, including confirming that the source tables meet what group replication requires. Then a full backup of the existing environment, before anything is touched.',
          },
          {
            title: 'Build the cluster and prove it',
            body: 'The group replication environment is stood up and exercised in full before production has anything to do with it, with global transaction identifiers handled deliberately so the cluster knows exactly what it has already applied.',
          },
          {
            title: 'Dry run with test workloads',
            body: 'Real workloads are put through the new cluster to validate its behaviour under something resembling use, rather than inferring it from the fact that the nodes are green.',
          },
          {
            title: 'Validate the data, then cut over',
            body: 'Data is verified across the cluster members and replication health confirmed — and only then are applications redirected through the router. The gate sits before the cutover, which is the whole point.',
          },
          {
            title: 'Prove the service path, end to end',
            body: 'After the move: every member confirmed online, replication health rechecked, monitoring enabled, a fresh backup of the new cluster taken, and a primary-role change tested on purpose. That validates application to router to current primary, not just the data migration.',
          },
        ],
      },
      {
        type: 'checkList',
        eyebrow: 'What the operations team got',
        heading: 'An operational service, not a pile of servers',
        body: 'A high-availability platform nobody has been shown how to run is a high-availability platform that gets switched off during the first confusing incident. Backups sit alongside replication here rather than being replaced by it — replicating a database is not the same as being able to restore one.',
          items: [
          'Written procedures for starting and stopping the cluster, and for bringing group replication up and validating it',
          'Router operations and floating connection-point validation, so the layer applications depend on can be checked independently',
          'Both automatic and deliberate failover: the primary role can be moved between members for maintenance or testing, not only during an emergency',
          'Full and incremental backups through MySQL Enterprise Backup, with database and backup storage kept apart',
          'Cluster health monitoring, so the state of replication is something the team reads rather than assumes',
          'Routine maintenance procedures, written down before they were needed rather than during',
        ],
      },
      {
        type: 'richText',
        heading: 'The outcome',
        html: `<p>The valuable thing here was never four MySQL servers running group replication. It was removing, one at a time, every place where a single failure could interrupt application access — the database server, the routing layer, and the site itself — and then building the migration and the operating procedures around that architecture rather than bolting them on afterwards.</p><p>For a Pacific telecommunications operator, that is the difference between a server failure and an outage. And when something larger goes wrong, there is a defined path to recovery that somebody has already walked.</p>`,
      },
    ],
  },

  {
    /*
     * Written October 2026 from the client-supplied write-up, in the sales
     * tone used across the site.
     *
     * Replaces oracle-rac-disaster-recovery-full-production-load, retired on
     * the client's instruction of 8 October 2026 and 301'd to this URL. They
     * were different engagements — that one resized an undersized recovery
     * site, this one moved a production estate off NFS onto SAN — so the two
     * arguments it made and this page does not are patch parity between
     * production and recovery, and disaster recovery being sized as insurance
     * rather than as production. Worth folding in if this page is revised.
     *
     * The design-document reference carried through the source names the
     * client’s system and shares a prefix with a hostname already listed as an
     * example in findForbiddenIdentifiers, so it is stripped rather than
     * reworded. No storage product, array model or node name appears either.
     *
     * deliveredYear is inherited from the sibling Oracle engagement because
     * the source does not state one. CONFIRM THIS before it matters — it is
     * the only unverified fact on the page.
     */
    slug: 'oracle-rac-migration-australian-telco',
    title: 'Migrating a Business-Critical Oracle RAC Estate with Minimal Cutover Risk',
    summary:
      'Replacing the storage under a business-critical Oracle RAC estate put databases, applications, failover and disaster recovery at risk at once. The replacement cluster was built alongside production and tested against real applications first, with Data Guard closing the gap at cutover and the old cluster kept as the way back.',
    sector: 'Telecommunications',
    region: 'Australia',
    deliveredYear: 2018,
    platforms: ['Oracle Database', 'Oracle RAC', 'Oracle ASM', 'Oracle Data Guard', 'Oracle Enterprise Manager'],
    seoTitle: 'Oracle RAC Migration Australia — Telco Case Study',
    seoDescription:
      'How Onsys delivered an Oracle RAC migration for an Australian telco — a parallel RAC and ASM platform on new SAN storage, application testing before cutover, Data Guard sync and a defined rollback.',
    blocks: [
      {
        type: 'richText',
        heading: 'The problem',
        html: `<p>An Australian telecommunications business was running a business-critical Oracle RAC estate on NFS shared storage, and a new enterprise SAN was arriving. On paper this is a storage refresh. In practice, changing the storage underneath a RAC estate changes almost everything that sits on top of it.</p><p>The databases move. The cluster layer moves with them. Application connectivity has to be repointed. The Data Guard relationships protecting the estate have to be rebuilt. Monitoring and the management repository have to follow, or they end up stranded on storage that is being decommissioned. And every one of those is a place where a migration becomes an outage.</p><p>So the question was never "how do we move the files". It was how to move the platform while proving the applications, RAC failover, database performance and the recovery architecture all still work — before the business depends on the answer.</p>`,
      },
      {
        type: 'checkList',
        eyebrow: 'What it had to solve',
        heading: 'Everything the storage was sitting under',
        body: 'The estate carried production, non-production, monitoring and disaster-recovery workloads. Each of the following had to survive the move, and several of them are only discovered to be dependencies when they break.',
        items: [
          'Oracle RAC and the grid infrastructure underneath it',
          'Shared storage, restructured through ASM rather than carried across as-is',
          'The production databases themselves, with their performance characteristics intact',
          'Application connectivity, which is pointed at the cluster rather than at a database',
          'Backup and recovery, reconfigured on infrastructure that did not exist yet',
          'Data Guard replication, and the disaster-recovery site in a second Australian data centre',
          'The Oracle Enterprise Manager repository, which monitors everything else and is easily forgotten',
          'Patch-level consistency, so a failover never becomes an unplanned version change',
          'Oracle licensing exposure, which infrastructure placement can quietly increase',
        ],
      },
      {
        type: 'richText',
        heading: 'What we built',
        html: `<p>A new cluster, not an in-place conversion. New virtual machines, grid infrastructure, RAC and ASM installed fresh, and the database software deployed at patch levels matching the existing environment — so the migration moves the data without also moving the version.</p><p>The new SAN was presented as shared raw devices and organised into ASM disk groups by function: database files, redo, archive and the recovery area, cluster voting storage, and dedicated groups for the larger workloads. That is the part that makes the difference between new storage and a storage architecture.</p><p>Because the replacement was built beside production rather than on top of it, the existing cluster stayed available and untouched throughout. The estate was never in a half-migrated state, and the project could be stopped at any point before cutover with nothing lost. That single decision is what turned a high-risk storage change into a controlled platform transition.</p><p>One more thing shaped the design: where the new virtual machines were placed. Oracle licensing follows infrastructure, and a technically valid architecture is not the right architecture if it creates commercial exposure nobody budgeted for. Placement was specified to keep the new machines within the existing RAC licensing boundary.</p>`,
      },
      {
        type: 'steps',
        eyebrow: 'The part worth copying',
        heading: 'Test first. Cut over second.',
        body: 'Most database migrations find out whether the new platform works after production is on it. This one was sequenced to answer that question before the cutover window opened — which is also what makes a rollback plan realistic rather than theoretical.',
        steps: [
          {
            title: 'Restore production copies into the new cluster',
            body: 'Copies of the live databases are restored onto the new RAC and ASM platform and opened for the client’s own application teams. Not a smoke test: real applications against real data on the real target.',
          },
            {
            title: 'Prove five things, not one',
            body: 'Migrated data, SQL and query performance, application performance, application connectivity, and RAC failover behaviour. The platform does not progress until the client confirms all five have passed.',
          },
          {
            title: 'Close the gap with Data Guard',
            body: 'Only then are fresh production backups restored and Data Guard configured, so transaction changes flow from the live database to the new platform. The new cluster tracks production right up to the switchover instead of being a copy that is already stale.',
          },
          {
            title: 'Cut over on the business’s terms',
            body: 'Databases move individually or as a coordinated group, so the sequence follows business risk and application readiness rather than forcing every workload into one all-or-nothing event. Applications are redirected to the new SCAN listeners, which is the only interruption users see.',
          },
          {
            title: 'Keep the way back',
            body: 'After a database switches over, the original cluster becomes its standby. The migration was not built on the assumption that nothing would go wrong — it was built so the recovery path existed before the change started.',
          },
        ],
      },
      {
        type: 'richText',
        heading: 'And disaster recovery, rebuilt as part of the same job',
        html: `<p>The estate had Data Guard protection between two Australian data centres, and moving production breaks it. Rather than leaving that as a follow-on project, rebuilding the standby databases on the new storage and re-establishing Data Guard was planned into the migration itself.</p><p>Including the uncomfortable part: the plan identified the window after cutover during which disaster-recovery protection would not be available, until the new standby was rebuilt. That exposure was known, sized and sequenced in advance. The alternative is discovering it afterwards, which is how an organisation ends up unprotected without having decided to be.</p><p>The management layer moved too. The Oracle Enterprise Manager repository was relocated onto the new storage under its own controlled procedure — snapshot, new filesystem, shutdown, file movement, restart, agent connectivity confirmed, fresh backup — so monitoring did not stay behind on storage that was being retired.</p>`,
      },
      {
        type: 'checkList',
        eyebrow: 'Staged, so one thing changes at a time',
        heading: 'Four stages with a validation point between each',
        body: 'Delivered as an operational platform rather than as installed binaries: RMAN backups, monitoring and alerts, management agents, OEM integration, RAC verification and as-built documentation were all part of the scope.',
        items: [
          'Stage 1 — production RAC: build the new cluster and ASM storage, restore, synchronise with Data Guard, validate, cut over',
          'Stage 2 — Oracle Enterprise Manager: move the repository database and its storage across',
          'Stage 3 — disaster recovery: rebuild the standby environment and restore Data Guard protection',
          'Stage 4 — non-production: migrate the remaining workloads and their storage',
          'Backups configured and monitoring live on the new platform before it carried production, not after',
          'As-built documentation handed over, so the estate is operable by the people who own it',
        ],
      },
      {
        type: 'richText',
        heading: 'The outcome',
        html: `<p>At a glance this was a move from NFS to SAN. In practice the storage changed, the RAC platform changed, the cluster connection point changed, the production databases moved, the Data Guard relationships changed, disaster recovery had to be rebuilt and monitoring had to follow — and none of it was allowed to become an unacceptable outage.</p><p>What made that possible was sequence. The replacement was built and proven alongside production, the final data was synchronised rather than copied, the rollback path was designed before the change began, and recovery was rebuilt as part of the project instead of after it. The client did not migrate and then find problems; they found the problems while production was still running somewhere else.</p>`,
      },
    ],
  }

];
