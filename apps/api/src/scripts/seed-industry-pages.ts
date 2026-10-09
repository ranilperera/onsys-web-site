import { org } from '../lib/env';
import type { SeedPage } from './seed-content';

/**
 * Industry pages: SQL Server support for healthcare, local government, ERP and
 * finance systems.
 *
 * These exist because "SQL Server DBA services" is one search and "SQL Server
 * support for our patient administration system" is a different one, made by
 * someone with a different problem. The service is identical; what changes is
 * which failure mode keeps them awake, and which obligation they have to answer
 * to. A page that cannot name those is a keyword page, and reads like one.
 *
 * Four rules while writing these.
 *
 * 1. No client is named, and no engagement is described in a way that would
 *    identify one. The case studies already carry that work under their own
 *    anonymisation rules; these pages link to them generically.
 *
 * 2. Only obligations that genuinely exist are named — My Health Records Act,
 *    the Privacy Act and its notifiable data breach scheme, the ACSC Essential
 *    Eight, PCI DSS, APRA CPS 234. Where a requirement varies by state or by
 *    entity type, the page says so instead of flattening it into a claim.
 *
 * 3. No statistics. A wrong number on a page aimed at a compliance-minded buyer
 *    costs more than a general statement that is right.
 *
 * 4. Database access stays Australian on every page. These sectors are the ones
 *    most likely to ask, and the answer does not change by industry.
 */

/** The access rule, worded identically wherever it appears. */
const sovereigntyBlock = {
  type: 'relatedService' as const,
  eyebrow: 'Data sovereignty',
  heading: 'Who touches your database',
  body: 'Your production databases are accessed by Onsys DBAs based in Australia, and only by them. No offshore engineer holds credentials to a client database — on every plan, by default, not as an upgrade.',
  cta: { label: 'Read the access policy', href: '/who-can-access-your-database' },
};

/** Closing band. The offer is the same on every page; the opening line is not. */
const ctaBand = (heading: string, body: string) => ({
  type: 'ctaBand' as const,
  heading,
  body,
  cta: { label: 'Book the free health check', href: '/free-20-point-sql-server-health-check' },
});

export const industryPages: SeedPage[] = [
  // ---------------------------------------------------------------- healthcare
  {
    slug: 'sql-server-support-healthcare',
    title: 'SQL Server Support for Healthcare',
    heading: 'SQL Server support for healthcare',
    eyebrow: 'Clinical systems · 24/7 · Australian DBAs only',
    lede: 'Patient administration, pathology, radiology and electronic medical records run on databases that cannot be taken down at a convenient hour, and that hold the most sensitive category of personal information in the country. Remote DBA cover from Australian consultants, from $1,500 a month.',
    heroImage: '/images/hero-db-managed.jpg',
    heroCtas: [
      { label: 'Free 20-point health check', href: '/free-20-point-sql-server-health-check' },
      { label: `Call ${org.phone}`, href: `tel:${org.phoneE164}` },
    ],
    seoTitle: 'SQL Server Support for Healthcare | Australian DBAs',
    seoDescription:
      'Remote SQL Server DBA support for Australian healthcare: PAS, EMR, pathology and radiology databases. 24/7 cover, Australian-only database access, from $1,500/month.',
    navOrder: 20,
    blocks: [
      {
        type: 'richText',
        html: `
<p><strong>Healthcare databases have two properties that change how they must be run.</strong> They are read at three in the morning by someone making a clinical decision, and they hold health information — which Australian privacy law treats as a special category, with a higher bar and a mandatory breach notification regime behind it.</p>
<p>That combination rules out a lot of ordinary database practice. A maintenance window that suits a retailer does not suit an emergency department. A backup you have never restored is not a backup when the system holding a medication chart is unavailable. And an access model you cannot describe in writing is a problem the first time a privacy officer asks who can see what.</p>`,
      },
      {
        type: 'cardGrid',
        anchor: 'what-we-cover',
        eyebrow: 'The systems we are usually called about',
        heading: 'What sits on SQL Server in a health service',
        body: 'Most of the clinical estate, in practice — and it is rarely one vendor. The job is keeping a mixed, vendor-certified estate current without breaking a certification.',
        centered: true,
        altBackground: true,
        columns: 3,
        cards: [
          {
            title: 'Patient administration and EMR',
            body: 'The system the whole organisation schedules around. Usually vendor-supported on top, which means the database must be patched to a level the vendor still certifies — not simply to the latest build.',
            icon: '#s-managed',
            coverColor: '#EAF1FB',
          },
          {
            title: 'Pathology, radiology and PACS',
            body: 'Large, growing, and intolerant of slow storage. Index and query work here shows up directly as how long a clinician waits for a result to open.',
            icon: '#s-consult',
            coverColor: '#E7F5EC',
          },
          {
            title: 'Integration and messaging',
            body: 'HL7 and FHIR interfaces, SSIS packages and interface engines sitting between systems that were never designed to talk. When these stall, nothing visibly breaks until results stop arriving.',
            icon: '#s-code',
            coverColor: '#FFF1E0',
          },
          {
            title: 'Reporting and clinical analytics',
            body: 'SSRS, SSAS and data marts that are often running on the production instance because that is where they were first built. Separating them is one of the commonest quick wins.',
            icon: '#s-ha',
            coverColor: '#F3F2F1',
          },
          {
            title: 'Rostering, payroll and ERP',
            body: 'Not clinical, but a health service that cannot roster staff is in as much trouble as one that cannot schedule theatre.',
            icon: '#s-cloud',
            coverColor: '#EAF1FB',
          },
          {
            title: 'Research and registry databases',
            body: 'Often the least governed part of the estate, frequently holding identified data, and usually administered by whoever built it. A good place to start an access review.',
            icon: '#s-shield',
            coverColor: '#FDECEC',
          },
        ],
      },
      {
        type: 'checkList',
        anchor: 'obligations',
        eyebrow: 'What you have to be able to answer',
        heading: 'The obligations that shape a clinical database',
        body: 'These are the questions a privacy officer, an auditor or a board risk committee will eventually ask. They are easier to answer when the database was configured with them in mind.',
        items: [
          'Health information is sensitive information under the Privacy Act, which sets a higher bar for collection, use and disclosure than ordinary personal information',
          'The Notifiable Data Breaches scheme requires assessment and, where the threshold is met, notification to the OAIC and to affected individuals — so you must be able to establish what was accessed, by whom, and when',
          'Where My Health Record is involved, the My Health Records Act carries its own obligations and its own penalties, separate from the Privacy Act',
          'State and territory health records legislation applies on top of the federal regime, and differs by jurisdiction — public health services usually carry additional departmental requirements as well',
          'The ACSC Essential Eight expects vendor-supported, patched software, which is the control that an ageing SQL Server version quietly fails',
          'Encryption at rest across the data files and the backups together, because a backup tape or a restored copy is the part of the estate most often forgotten',
        ],
        sidebar: {
          title: 'What we commit to',
          rows: [
            { label: 'Database access', value: 'Australian-based DBAs only' },
            { label: 'Named accounts', value: 'Yes, never shared credentials' },
            { label: 'Session logging', value: 'Logged and auditable' },
            { label: 'Access list', value: 'Given before you sign' },
            { label: 'Response SLA', value: 'From one hour, 24/7' },
          ],
        },
      },
      {
        type: 'steps',
        anchor: 'how-we-start',
        eyebrow: 'Getting started',
        heading: 'How an engagement with a health service usually runs',
        body: 'Nothing is changed in a clinical system before we understand what depends on it. The first phase is deliberately read-only.',
        steps: [
          {
            title: 'Read-only assessment first',
            body: 'The free 20-point health check runs against one instance using read-only scripts you can read before they run. Nothing is installed and no configuration changes, which is what makes it approvable inside a change-controlled environment.',
          },
          {
            title: 'Map the vendor certification constraints',
            body: 'Which SQL Server version and patch level each clinical vendor certifies, in writing. This decides what is actually possible, and it is the step that turns a patching backlog into a plan.',
          },
          {
            title: 'Fix recoverability before performance',
            body: 'Restores tested rather than assumed, recovery objectives documented against what the configuration can really deliver, and encryption extended across backups as well as data files.',
          },
          {
            title: 'Then run it',
            body: '24/7 monitoring with alerts routed to an on-call DBA, patching inside your change windows with a tested rollback, and a named consultant who knows which of your systems cannot be touched between 7am and 7pm.',
          },
        ],
      },
      sovereigntyBlock,
      {
        type: 'relatedService',
        eyebrow: 'Proof',
        heading: 'A healthcare estate with no DBA and no tolerance for downtime',
        body: 'An Australian healthcare provider ran business-critical databases on standalone servers. They now sit in a two-node Always On availability group with synchronous replication and automatic failover, behind a listener the applications keep using when the primary moves — and encrypted at rest on both replicas.',
        cta: { label: 'Read the engagement', href: '/case-studies/sql-server-always-on-healthcare-australia' },
      },
      ctaBand(
        'Start with one instance',
        'The free 20-point health check is read-only, takes about twenty minutes of your time, and gives you a written report whether or not you engage us. For a clinical estate it is the cheapest way to find out what you are actually running.',
      ),
    ],
    faqs: [
      {
        question: 'Can you work inside our change control process?',
        answer:
          'Yes — it is the normal case rather than an exception. Changes are raised, scheduled into your windows, and carry a tested rollback. The initial health check is read-only and installs nothing, which is usually what makes it approvable quickly in a clinical environment.',
      },
      {
        question: 'Our clinical vendor only certifies an older SQL Server version. Can you still support it?',
        answer:
          'Yes. SQL Server 2008 through 2022 is in scope, including versions past their support end date — we can keep those running safely while the upgrade is negotiated. What we will not do is tell you that an out-of-support version is fine; we will document the exposure so you can put it in front of the vendor and your risk committee.',
      },
      {
        question: 'Who would have access to patient data?',
        answer:
          'Onsys DBAs based in Australia, and only them. No offshore engineer holds credentials to a client database environment, on any plan. Access is through individually named accounts rather than shared credentials, every session is logged, and we tell you which engineers hold access before you sign — it goes into the agreement. Access is revoked the day an engagement ends.',
      },
      {
        question: 'Do we have to give you access at all?',
        answer:
          'No. The health check needs no access whatsoever — you run the scripts and send the output. For ongoing support, if your policy prohibits external logins, we work screen-shared with your own staff driving. It is slower, and we will say so, but it is a legitimate way to run the engagement.',
      },
      {
        question: 'How much does it cost?',
        answer:
          'Monthly plans start at $1,500 excluding GST for up to 10 SQL Server instances — $150 per instance — with a two-hour response SLA at any hour and 10 professional service hours a month. Plan B is $3,000 and Plan C is $7,500 for larger and mixed-platform estates. Project work is quoted as a fixed price after the assessment.',
      },
    ],
  },

  // --------------------------------------------------------- local government
  {
    slug: 'sql-server-support-local-government',
    title: 'SQL Server Support for Local Government',
    heading: 'SQL Server support for local government',
    eyebrow: 'Councils · rates, property and ERP systems · Australian DBAs',
    lede: 'Rates, property, planning, animal registration and payroll all sit on a database somewhere in the council, usually with one systems administrator covering the lot. Remote DBA cover, published pricing, and no procurement surprise — from $1,500 a month.',
    heroImage: '/images/hero-db-managed.jpg',
    heroCtas: [
      { label: 'Free 20-point health check', href: '/free-20-point-sql-server-health-check' },
      { label: `Call ${org.phone}`, href: `tel:${org.phoneE164}` },
    ],
    seoTitle: 'SQL Server Support for Local Government | Councils',
    seoDescription:
      'Remote SQL Server DBA support for Australian councils — rates, property, planning and ERP databases. Published pricing for procurement, Australian-only database access.',
    navOrder: 21,
    blocks: [
      {
        type: 'richText',
        html: `
<p><strong>A council runs an enterprise estate on a small-business IT team.</strong> Rates and property, planning and development applications, asset and works management, animal registration, libraries, payroll and the finance ledger — most of it on SQL Server, much of it on vendor-supported applications, and typically supported by a handful of people who also run the desktop fleet and the phones.</p>
<p>That is a workable arrangement until it needs a specialist. A corrupt page in the rates database the week before a levy run, a property system that will not restore into test, or an upgrade a vendor has made conditional on a SQL Server version nobody has budgeted for — none of those are failures of the team. They are the predictable gap between a generalist estate and specialist work.</p>`,
      },
      {
        type: 'cardGrid',
        anchor: 'what-we-cover',
        eyebrow: 'What we are usually called about',
        heading: 'The council systems that sit on SQL Server',
        body: 'Almost all of them, and almost always from several different vendors — which is the actual difficulty.',
        centered: true,
        altBackground: true,
        columns: 3,
        cards: [
          {
            title: 'Rates and property',
            body: 'The system the revenue depends on, with hard external deadlines that do not move. Levy runs and valuation loads are the two windows where performance problems become visible to the executive.',
            icon: '#s-managed',
            coverColor: '#EAF1FB',
          },
          {
            title: 'Planning and development',
            body: 'Statutory clocks, public-facing portals and document stores. Usually integrated with the website, which makes a database outage a service outage residents can see.',
            icon: '#s-consult',
            coverColor: '#E7F5EC',
          },
          {
            title: 'Asset and works management',
            body: 'Spatial data, work orders and long-lived asset registers — often the largest databases in the council and the least frequently reviewed.',
            icon: '#s-ha',
            coverColor: '#FFF1E0',
          },
          {
            title: 'Finance, payroll and HR',
            body: 'Pay runs and end-of-month have the same property as a levy run: a fixed date, and no appetite for the word "degraded".',
            icon: '#s-cloud',
            coverColor: '#F3F2F1',
          },
          {
            title: 'Reporting and the annual report',
            body: 'SSRS and data extracts feeding statutory reporting, which tends to reveal every data quality problem accumulated over the year, all in one fortnight.',
            icon: '#s-code',
            coverColor: '#EAF1FB',
          },
          {
            title: 'The system nobody owns',
            body: 'Every council has one — a database behind a service that matters, built by someone who has left, running on a server nobody wants to reboot. We find these during the assessment, routinely.',
            icon: '#s-emergency',
            coverColor: '#FDECEC',
          },
        ],
      },
      {
        type: 'checkList',
        anchor: 'procurement',
        eyebrow: 'For the procurement file',
        heading: 'What makes this easy to put through a council procurement',
        body: 'Public sector procurement rewards things that can be written down and compared. Most of this is already published, which is deliberate.',
        items: [
          'Prices are published on the website, so a quote can be checked against a public figure rather than taken on trust',
          'No lock-in contract: monthly plans run on a rolling basis with no minimum term and no exit fee, which avoids a multi-year commitment going to council for approval',
          'An Australian company with an ABN and an ACN, contracting under Australian law, with a Melbourne head office',
          'Database access is held by Australian-based DBAs only, and the access terms can be written into the agreement rather than cited from a web page',
          'The ACSC Essential Eight patch-currency control is the one an ageing SQL Server version fails — the assessment reports the version and patch level of every instance in writing',
          'Project work is quoted as a fixed price after the assessment, so a capital request is based on a scoped number rather than an estimate',
        ],
        sidebar: {
          title: 'The numbers to quote',
          rows: [
            { label: 'Plan A', value: '$1,500/mo — up to 10 instances' },
            { label: 'Per instance', value: '$150/mo' },
            { label: 'Consultancy', value: '$150/hr, 4-hour minimum' },
            { label: 'Response SLA', value: '2 hours on Plan A, 24/7' },
            { label: 'Minimum term', value: 'None' },
            { label: 'Prices', value: 'GST exclusive' },
          ],
        },
      },
      {
        type: 'steps',
        anchor: 'how-we-start',
        eyebrow: 'Getting started',
        heading: 'How a council engagement usually starts',
        body: 'Usually with one instance and no money, because that is the sensible way to find out whether this is worth doing.',
        steps: [
          {
            title: 'One free health check',
            body: 'Twenty checkpoints against the instance that worries you most — typically rates or finance. Read-only scripts you run yourself, a written report, and no obligation. It is a legitimate way to get an independent opinion without raising a purchase order.',
          },
          {
            title: 'A written finding list, prioritised',
            body: 'Rated findings with the script output behind each one, ordered by what is actually at risk. This is the document that turns "the database feels slow" into something a manager can act on and a budget can be written against.',
          },
          {
            title: 'Fix what is urgent, as scoped work',
            body: 'Quoted as a fixed price against the findings, so there is no open-ended time-and-materials exposure to explain. Where nothing urgent is found, we say so — about half the time, that is the outcome.',
          },
          {
            title: 'Then a plan, if it is worth it',
            body: 'A monthly plan makes sense when the estate genuinely needs ongoing cover. Where your team is managing fine and only needs an escalation path, hourly consultancy is cheaper and we will tell you that.',
          },
        ],
      },
      sovereigntyBlock,
      ctaBand(
        'Start with the instance that worries you most',
        'One free 20-point health check per organisation, on one SQL Server instance. Read-only, no access required, written report within 3 business days — and no obligation to engage us afterwards.',
      ),
    ],
    faqs: [
      {
        question: 'Do you work with councils outside Victoria?',
        answer:
          'Yes. The work is remote and we support councils across every Australian state and territory, plus New Zealand. Being Melbourne-based means Australian Eastern business hours and the option of an on-site visit in the Melbourne metropolitan area; it is not a requirement for the service.',
      },
      {
        question: 'Can we trial this without going through a full procurement?',
        answer:
          'That is what the free 20-point health check is for. It is genuinely free, covers one instance, requires no access to your environment and commits you to nothing — so it needs no purchase order. If the findings justify work, you then have a written, independent basis for the procurement rather than a vendor claim.',
      },
      {
        question: 'Our application vendor says they support the database. Do we need you as well?',
        answer:
          'Sometimes not, and we will say so. Application vendor support usually covers the application and its certified configuration — not query tuning, not your backup strategy, not the instance hosting four other systems, and rarely a 2am outage. The question worth asking your vendor is what they will do when the database is slow but the application is behaving correctly.',
      },
      {
        question: 'Who would hold access to resident data?',
        answer:
          'Onsys DBAs based in Australia, and only them. No offshore engineer holds credentials to a client database environment, on any plan. We tell you which engineers hold access before you sign and it goes into the agreement, access is through named accounts with session logging, and it is revoked the day the engagement ends.',
      },
      {
        question: 'What does it cost?',
        answer:
          'Plan A is $1,500 per month excluding GST for up to 10 SQL Server instances — $150 per instance — with a guaranteed two-hour response at any hour and 10 professional service hours a month. Ad-hoc consultancy is $150 per hour with a four-hour minimum. Every figure is published on the pricing page, so nothing in a quote should be a surprise.',
      },
    ],
  },

  // ----------------------------------------------------------------- ERP
  {
    slug: 'sql-server-support-erp-systems',
    title: 'SQL Server Support for ERP Systems',
    heading: 'SQL Server support for ERP systems',
    eyebrow: 'Dynamics · SAP · JD Edwards · Epicor · and the rest',
    lede: 'When the ERP is slow, the business stops — and the application vendor will tell you the application is behaving correctly. Specialist SQL Server support for the database underneath your ERP, from $1,500 a month.',
    heroImage: '/images/hero-db-managed.jpg',
    heroCtas: [
      { label: 'Free 20-point health check', href: '/free-20-point-sql-server-health-check' },
      { label: `Call ${org.phone}`, href: `tel:${org.phoneE164}` },
    ],
    seoTitle: 'SQL Server Support for ERP Systems | Database DBA',
    seoDescription:
      'Specialist SQL Server DBA support for the database under your ERP — Dynamics, SAP, JD Edwards, Epicor and more. Month-end performance, upgrades, 24/7 cover from $1,500/month.',
    navOrder: 22,
    blocks: [
      {
        type: 'richText',
        html: `
<p><strong>An ERP support contract rarely covers the database.</strong> It covers the application: its code, its certified configuration, its patches. When finance reports that month-end is taking three hours longer than last quarter, the vendor checks the application, finds it behaving exactly as designed, and closes the ticket — correctly.</p>
<p>The problem is usually a layer down. Statistics that have gone stale on a table that has doubled in size, an index that was right three years ago, a query plan that changed after a patch, tempdb contention that only shows up under month-end concurrency, or a maintenance job that silently stopped running in March. None of that is the vendor's to fix, and none of it is visible from inside the application.</p>`,
      },
      {
        type: 'cardGrid',
        anchor: 'symptoms',
        eyebrow: 'What this usually looks like',
        heading: 'The calls we get about ERP databases',
        body: 'Different ERP products, remarkably similar failure modes — because they are database failure modes, not application ones.',
        centered: true,
        altBackground: true,
        columns: 3,
        cards: [
          {
            title: 'Month-end got slower, gradually',
            body: 'Nobody can point to the day it changed, which is the signature of growth meeting a configuration that was tuned for a smaller database. Usually statistics, indexing and tempdb rather than hardware.',
            icon: '#s-consult',
            coverColor: '#EAF1FB',
          },
          {
            title: 'The vendor says the application is fine',
            body: 'And they are usually right. The question nobody is positioned to answer is what the database is doing while the application waits — which needs someone looking at wait statistics and query plans, not application logs.',
            icon: '#s-managed',
            coverColor: '#E7F5EC',
          },
          {
            title: 'An upgrade is blocked on a version',
            body: 'The ERP vendor certifies a SQL Server version you are not on, or will not certify the one you have moved to. Resolving that is a database project with an application deadline attached.',
            icon: '#s-ha',
            coverColor: '#FFF1E0',
          },
          {
            title: 'Reporting is competing with the ledger',
            body: 'Reports and extracts running against the production instance, at the same time as the people trying to close the month. Separating them is often the single largest improvement available.',
            icon: '#s-code',
            coverColor: '#F3F2F1',
          },
          {
            title: 'The database has never been restored',
            body: 'Backups have run every night for years and nobody has ever mounted one. An ERP restore is also a test of whether the integrations, interfaces and reporting layer come back with it.',
            icon: '#s-shield',
            coverColor: '#FDECEC',
          },
          {
            title: 'Nobody owns the database',
            body: 'The ERP is owned by finance, the server by infrastructure, the application by a vendor — and the database by nobody in particular. That gap is where most of these problems live.',
            icon: '#s-emergency',
            coverColor: '#EAF1FB',
          },
        ],
      },
      {
        type: 'checkList',
        anchor: 'how-we-work-with-vendors',
        eyebrow: 'Working alongside your ERP vendor',
        heading: 'How we stay on the right side of your support agreement',
        body: 'The fastest way to create a problem is to tune a database in a way that voids the application vendor’s support. So the constraint comes first.',
        items: [
          'We establish what the ERP vendor certifies and supports before changing anything — version, patch level, configuration settings and, critically, whether index changes are permitted',
          'Where the vendor prohibits schema or index changes, we work within that and say plainly what it costs you in performance',
          'Changes are evidenced: a measured baseline before, the change, and the same measurement after, so the vendor can see what was done and why',
          'We will talk directly to your ERP vendor where it helps, with your approval — a database engineer and an application engineer on the same call resolves things that email cannot',
          'Upgrades are tested against a restored copy, including the integrations and the reporting layer, not just the database',
          'Nothing is changed in production without an agreed window and a tested rollback',
        ],
        sidebar: {
          title: 'Platforms we see most',
          rows: [
            { label: 'Microsoft', value: 'Dynamics 365 BC, NAV, AX, GP' },
            { label: 'SAP', value: 'On SQL Server' },
            { label: 'Oracle', value: 'JD Edwards, E-Business Suite' },
            { label: 'Mid-market', value: 'Epicor, Sage, Pronto, MYOB' },
            { label: 'Also', value: 'In-house and heavily customised' },
          ],
        },
      },
      {
        type: 'steps',
        anchor: 'how-we-start',
        eyebrow: 'Getting started',
        heading: 'From "month-end is slow" to a measured answer',
        body: 'The point of the first phase is to replace an opinion with a measurement, because that is what any argument with a vendor needs.',
        steps: [
          {
            title: 'Measure before touching anything',
            body: 'Wait statistics, the expensive query plans, index and statistics health, tempdb configuration and the maintenance jobs that are meant to be running. The free 20-point health check covers this on one instance.',
          },
          {
            title: 'Separate database from application',
            body: 'Establish which of them is actually waiting. This is the finding that ends the loop with the vendor, in either direction — including when the honest answer is that the application is the problem.',
          },
          {
            title: 'Fix inside the certified envelope',
            body: 'Statistics, indexing where permitted, tempdb, memory and maxdop, maintenance jobs, and moving reporting off the production instance. Measured against the same baseline afterwards.',
          },
          {
            title: 'Then keep it that way',
            body: 'ERP databases regress as they grow. Ongoing monitoring catches the drift, and the monthly service hours exist to act on it before finance notices it again.',
          },
        ],
      },
      sovereigntyBlock,
      ctaBand(
        'Is it the database or the application?',
        'The free 20-point health check answers that for one instance, using read-only scripts you can read before they run. You get the written findings whether or not you engage us — including when the answer is that the database is fine.',
      ),
    ],
    faqs: [
      {
        question: 'Our ERP vendor supports the system. Why would we need a DBA as well?',
        answer:
          'Because the two cover different things. The vendor supports the application and its certified configuration. A DBA covers the database underneath it: query and index performance, statistics, tempdb, backup and restore, high availability, patching and the 2am outage. The clearest test is to ask your vendor what they will do when the application is behaving correctly and month-end is still slow.',
      },
      {
        question: 'Will you make changes that void our ERP support agreement?',
        answer:
          'No. We establish what the vendor certifies and permits before anything changes, and where they prohibit index or schema changes we work within that constraint and tell you plainly what it costs in performance. Every change is evidenced with a before-and-after measurement, which is also what the vendor needs if they are asked to look at it.',
      },
      {
        question: 'Which ERP products do you work with?',
        answer:
          'Any ERP whose database runs on SQL Server, Oracle, PostgreSQL or MySQL — in practice that covers Microsoft Dynamics 365 Business Central, NAV, AX and GP, SAP on SQL Server, Oracle JD Edwards and E-Business Suite, and mid-market products such as Epicor, Sage, Pronto and MYOB, plus heavily customised in-house systems. We are specialists in the database, not in the application, and we are explicit about that line.',
      },
      {
        question: 'Can you help with an ERP upgrade?',
        answer:
          'Yes, on the database side: version and compatibility assessment, the migration itself, testing against a restored copy including integrations and reporting, and a tested rollback. These run as fixed-price projects scoped after the assessment. The application side stays with your ERP partner, and we coordinate with them.',
      },
      {
        question: 'How quickly can you look at a month-end problem?',
        answer:
          'The free health check is a set of read-only scripts you can run the same day, with a written report within 3 business days of the output reaching us. If it is urgent and you have no agreement with us, emergency support is available at $180 per hour. On a monthly plan the response SLA is one to two hours depending on tier, at any hour.',
      },
    ],
  },

  // --------------------------------------------------------------- finance
  {
    slug: 'sql-server-support-finance-systems',
    title: 'SQL Server Support for Finance Systems',
    heading: 'SQL Server support for finance systems',
    eyebrow: 'Banking · payments · insurance · superannuation · fintech',
    lede: 'Core banking, payments, ledgers and settlement run on databases where the recovery point objective is not a preference and the auditor is not optional. Specialist SQL Server cover from Australian consultants, with the access terms written into the agreement.',
    heroImage: '/images/hero-db-managed.jpg',
    heroCtas: [
      { label: 'Free 20-point health check', href: '/free-20-point-sql-server-health-check' },
      { label: `Call ${org.phone}`, href: `tel:${org.phoneE164}` },
    ],
    seoTitle: 'SQL Server Support for Finance Systems | Australia',
    seoDescription:
      'Remote SQL Server DBA support for banking, payments, insurance and fintech. RPO and RTO you can evidence, Australian-only database access, 24/7 cover from $1,500/month.',
    navOrder: 23,
    blocks: [
      {
        type: 'richText',
        html: `
<p><strong>Finance systems are the case where "we have backups" is not an answer.</strong> A ledger, a payments switch or a settlement system has a recovery point objective expressed in minutes or seconds, and somebody outside the organisation is entitled to ask you to demonstrate that the configuration can actually deliver it.</p>
<p>That is a different standard from most database work. It is not enough for the backups to run; the restore has to have been performed, the failover has to have been rehearsed, and the gap between the recovery objective written in the policy and the one the configuration can meet has to be either zero or documented.</p>
<p>In our experience that gap is the single most common finding in this sector — not because teams are careless, but because testing it properly has always required an outage nobody could justify scheduling.</p>`,
      },
      {
        type: 'cardGrid',
        anchor: 'what-we-cover',
        eyebrow: 'Where we are usually brought in',
        heading: 'What finance estates ask us for',
        body: 'Availability and evidence, in roughly that order — with performance a distant third until settlement starts running late.',
        centered: true,
        altBackground: true,
        columns: 3,
        cards: [
          {
            title: 'Recovery objectives you can evidence',
            body: 'Not what the policy says, but what the configuration can actually deliver — measured, documented, and with the difference between the two stated plainly rather than smoothed over.',
            icon: '#s-shield',
            coverColor: '#E7F5EC',
          },
          {
            title: 'High availability that has been tested',
            body: 'Always On availability groups and failover clustering, designed and built — and then failed over on purpose, which is the part most estates skip until the night it matters.',
            icon: '#s-ha',
            coverColor: '#EAF1FB',
          },
          {
            title: 'A DR site that can carry production',
            body: 'A recovery environment sized as insurance rather than as production delivers a service too slow to use. Sizing it against the real workload, at matching patch levels, with the cutover rehearsed.',
            icon: '#s-emergency',
            coverColor: '#FDECEC',
          },
          {
            title: 'Encryption across data and backups',
            body: 'Transparent Data Encryption applied across the data files and the backups together, with key management documented — because a restored copy on a test server is part of the estate too.',
            icon: '#s-managed',
            coverColor: '#FFF1E0',
          },
          {
            title: 'Access that survives an audit',
            body: 'Named accounts rather than shared credentials, least privilege, logged sessions, and a current access list you can produce on request rather than reconstruct.',
            icon: '#s-consult',
            coverColor: '#F3F2F1',
          },
          {
            title: 'Settlement and batch windows',
            body: 'Overnight batch that has grown past its window, where the question is whether to tune it, reshape it or move the reporting load off the instance entirely.',
            icon: '#s-code',
            coverColor: '#EAF1FB',
          },
        ],
      },
      {
        type: 'checkList',
        anchor: 'obligations',
        eyebrow: 'What you have to be able to evidence',
        heading: 'The obligations that shape a finance database',
        body: 'Which of these apply depends on what you are and what you process. The common thread is that each one asks for evidence rather than intent.',
        items: [
          'APRA CPS 234 applies to APRA-regulated entities and requires information security capability, controls over information assets managed by third parties, and systematic testing of those controls — including the ability to demonstrate it',
          'Where cardholder data is in scope, PCI DSS carries its own requirements for encryption, access control, logging and the separation of duties',
          'The Privacy Act and the Notifiable Data Breaches scheme require you to establish what was accessed, by whom and when — which depends on logging decided long before the incident',
          'The ACSC Essential Eight expects vendor-supported, patched software, which is the control an ageing SQL Server version quietly fails',
          'Business continuity obligations ask for a tested recovery, not a documented intention to recover — the distinction is the one auditors press on',
          'Third-party and supply-chain reviews increasingly ask who holds database credentials and in which country they sit, in writing',
        ],
        sidebar: {
          title: 'What we commit to',
          rows: [
            { label: 'Database access', value: 'Australian-based DBAs only' },
            { label: 'Credentials', value: 'Named, least privilege' },
            { label: 'Sessions', value: 'Logged and auditable' },
            { label: 'Access terms', value: 'Written into the agreement' },
            { label: 'On exit', value: 'Revoked the day it ends' },
            { label: 'Response SLA', value: 'From one hour, 24/7' },
          ],
        },
      },
      {
        type: 'steps',
        anchor: 'how-we-start',
        eyebrow: 'Getting started',
        heading: 'Replacing an assumed recovery objective with a measured one',
        body: 'The first engagement in this sector is almost always about recoverability, because that is the finding that cannot wait.',
        steps: [
          {
            title: 'Establish what the configuration can deliver',
            body: 'Backup chains, log shipping intervals, replication lag and failover behaviour, measured rather than read off a policy document. The free 20-point health check covers this on one instance.',
          },
          {
            title: 'Compare it against what you have committed to',
            body: 'The recovery point and recovery time objectives in your policy, against the ones the estate can actually meet. Where there is a gap, it is stated in writing with what it would take to close it.',
          },
          {
            title: 'Test the failover on purpose',
            body: 'A rehearsed failover and a documented procedure that can be run without interrupting production — so a DR test stops being an outage nobody will schedule.',
          },
          {
            title: 'Then run it under an SLA',
            body: '24/7 monitoring with alerts routed to an on-call Australian DBA, a guaranteed response time from one hour, and a monthly report your risk function can file rather than interpret.',
          },
        ],
      },
      sovereigntyBlock,
      {
        type: 'relatedService',
        eyebrow: 'Proof',
        heading: 'Payments and financial services engagements',
        body: 'Payments platforms moved to the cloud across two regions, a clustered database platform behind a mobile money launch, and a financial services estate rebuilt for availability — all delivered to a fixed price, with the clients anonymised.',
        cta: { label: 'Read the case studies', href: '/case-studies' },
      },
      ctaBand(
        'Can you evidence your recovery objective?',
        'The free 20-point health check measures what the configuration can actually deliver on one instance, read-only, with a written report you can hand to your risk function — whether or not you engage us.',
      ),
    ],
    faqs: [
      {
        question: 'Can you meet an Australian-resident-only access requirement?',
        answer:
          'Yes, and it is the default rather than an upgrade. Database work is Australian-only: every login to a client database instance is made by an Onsys DBA based in Australia, and no offshore engineer holds credentials to a client database on any plan. We will tell you which engineers hold access before you sign, and the access terms go into the agreement rather than living on a web page.',
      },
      {
        question: 'Will you support a CPS 234 or audit evidence request?',
        answer:
          'Yes. We provide the current access list on request at any point in the engagement, every session against your environment is logged and auditable, and changes carry a documented before-and-after. Where your reviewers want the access terms contractually committed rather than asserted, raise it during scoping and it is written in. We are a service provider, not your assurance function — we supply the evidence, your team makes the attestation.',
      },
      {
        question: 'How do you test disaster recovery without taking production down?',
        answer:
          'Depending on the configuration, by failing over to a replica or by bringing a recovery copy up in isolation while production stays open to applications. We have built exactly this for clients whose DR plan existed on paper because testing it meant an outage that kept being postponed. The deliverable is a written procedure your team can run again without us.',
      },
      {
        question: 'Our estate is not only SQL Server. Does that work?',
        answer:
          'Yes. Plan C covers mixed estates across SQL Server, PostgreSQL and Oracle, and we also support MySQL, MariaDB, MongoDB and EDB Postgres, on-premises and on Azure, AWS and Oracle Cloud Infrastructure. Mixed finance estates are the normal case rather than the exception.',
      },
      {
        question: 'What does it cost?',
        answer:
          'Plan B is $3,000 per month excluding GST with a one-hour response SLA at any hour and 20 professional service hours, which is where most finance estates sit. Plan C is $7,500 for larger mixed-platform estates with 50 hours. Project work — high availability builds, DR rebuilds, migrations — is quoted as a fixed price after the assessment.',
      },
    ],
  },
];
