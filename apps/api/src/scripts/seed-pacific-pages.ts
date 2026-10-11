import { org } from '../lib/env';
import type { SeedPage } from './seed-content';

/**
 * New Zealand and Pacific market pages.
 *
 * The August and October SEO reviews both recorded the same gap: every page on
 * this site says "Australia" or "Melbourne", so a New Zealand or Pacific
 * searcher sees no reason to click and Google has no reason to show the site.
 * Competitors already hold dedicated New Zealand pages.
 *
 * Three rules were applied while writing these.
 *
 * 1. No country page claims a named client or a named engagement. The case
 *    studies describe Pacific work as "Pacific Islands" precisely because
 *    sector plus country identifies a client in a market with one operator —
 *    and a country page that says "our Fiji payments work" would undo that in
 *    one sentence. These pages link to the case studies generically.
 *
 * 2. Database access stays Australian. The onshore rule is not relaxed because
 *    the client is in Suva rather than Sydney, and none of these pages implies
 *    round-the-clock offshore cover.
 *
 * 3. Country detail is kept to what is safely true: time-zone overlap, the
 *    shape of the market, the problem of thin local DBA capacity. No submarine
 *    cable names, no regulator names, no statistics — a wrong specific on a
 *    market page is worse than a general one that is right.
 *
 * Pricing is in AUD throughout, because that is what is published. NZD pricing
 * and an 0800 number are still open decisions; when they land, the New Zealand
 * page is where they go.
 */

/** Reused verbatim: the access rule reads identically wherever it appears. */
const sovereigntyBlock = {
  type: 'relatedService' as const,
  eyebrow: 'Data sovereignty',
  heading: 'Who touches your database',
  body: 'Your production databases are accessed by Onsys DBAs based in Australia, and only by them. No offshore engineer holds credentials to a client database — on every plan, by default, not as an upgrade.',
  cta: { label: 'Read the access policy', href: '/who-can-access-your-database' },
};

export const pacificPages: SeedPage[] = [
  {
    slug: 'database-support-pacific-islands',
    title: 'Pacific Islands Database Support',
    heading: 'Database support across the Pacific Islands',
    eyebrow: 'Fiji · PNG · Vanuatu · Solomon Islands · Samoa · Tonga',
    lede: 'Remote DBA cover for telcos, banks, utilities and government ICT units running production databases with no database administrator on the island — delivered from Australia, in your working day.',
    seoTitle: 'Pacific Islands Database Support | Remote DBA for Island Operators',
    seoDescription:
      'Remote DBA support across Fiji, Papua New Guinea, Vanuatu, the Solomon Islands, Samoa and Tonga. SQL Server, Oracle, PostgreSQL and MySQL cover from Australian consultants, in your working day.',
    heroImage: '/images/hero-pacific-islands.jpg',
    heroCtas: [
      { label: 'Free 20-point health check', href: '/free-20-point-sql-server-health-check' },
      { label: `Call ${org.phone}`, href: `tel:${org.phoneE164}` },
    ],
    blocks: [
      {
        /*
         * Rewritten in a plainer register. The previous version leaned on the
         * same two devices twice over — "the hard part is not X, it is Y",
         * "what is scarce is not X, it is Y" — plus a three-item list and a
         * two-word closer. Individually each is fine; stacked in three
         * paragraphs they read as a pattern rather than as someone talking.
         * Contractions, uneven sentence lengths and one joke do more work here
         * than another balanced clause.
         */
        type: 'richText',
        heading: 'When something breaks at 2am, who actually picks up?',
        html: `<p>You are running the same databases as any bank or telco in Sydney. Billing, core banking, ERP, revenue collection, the government systems people queue for — SQL Server, Oracle, PostgreSQL, MySQL. Same software, same versions, same problems.</p><p>What is different is what happens when one of them stops. In a small economy your platform is often the only one serving that sector. There is no competitor for customers to switch to while you fix it. Everybody just waits, and they all know who to blame.</p><p>Most of the teams we talk to here are good. They keep the environment running year after year and they do not need us for the day-to-day. What they do not have is the second person: the one who has seen a corrupt page before, who knows why a cluster will not fail over, who can tell inside ten minutes whether a restore is going to mount. That person is hard to hire anywhere. On an island it is close to impossible — and the day you find one, you have hired a single point of failure with a passport.</p><p>So the fallback ends up being a vendor contract that answers in a European business day, or ringing round for a consultant while the system is down and the phone is going. We would rather be the number you already have.</p>`,
      },
      {
        type: 'checkList',
        anchor: 'why-australia',
        eyebrow: 'Why call Australia',
        heading: 'Your working day is our working day',
        body: 'This is the practical case for an Australian provider over a northern-hemisphere one, and it stops being abstract the moment something is down.',
        items: [
          'Every Pacific time zone sits within a few hours of Australian Eastern time — a problem at 9am in Suva or Port Moresby reaches a DBA already at their desk, not an overnight queue',
          'Cover is 24/7 regardless, on the same response SLAs as our Australian clients: one hour on Plans B and C, two hours on Plan A',
          'Delivered over secure remote access, so nothing waits on a scheduled flight — which in this region can mean days',
          'The same senior consultants who work on Australian environments. There is no separate tier for island clients',
          'Published pricing in AUD, so procurement can start without a discovery call to find out what it costs',
        ],
        sidebar: {
          title: 'Markets we cover',
          rows: [
            { label: 'Fiji', value: 'Telco, banking, government' },
            { label: 'Papua New Guinea', value: 'Resources, telco, banking' },
            { label: 'Vanuatu', value: 'Finance, telco, government' },
            { label: 'Solomon Islands', value: 'Telco, government, banking' },
            { label: 'New Caledonia', value: 'PostgreSQL, mining, telco' },
            { label: 'Samoa & Tonga', value: 'Government, utilities, telco' },
            { label: 'Others', value: 'Ask — the list is not closed' },
          ],
        },
      },
      {
        type: 'cardGrid',
        anchor: 'whats-included',
        eyebrow: 'What you actually get',
        heading: 'A DBA team for your environment, without the headcount',
        body: 'Remote database support covers the work an in-house DBA would do, delivered by a team over a secure connection — without the salary, the recruitment, the leave cover or the single point of failure that one person always is.',
        centered: true,
        altBackground: true,
        columns: 3,
        cards: [
          { title: 'Monitoring that reaches a person', body: 'Continuous checks on availability, space, jobs, replication health and error logs — with alerts routed to an on-call engineer rather than an inbox nobody opens until Monday.', icon: '#s-managed', coverColor: '#EAF1FB' },
          { title: 'Incident response, at any hour', body: 'A senior DBA on the problem inside the response time your plan guarantees, 24 hours a day. Including the ones at 2am, and the ones on a public holiday you have and we do not.', icon: '#s-emergency', coverColor: '#FDECEC' },
          { title: 'Backups you have seen restored', body: 'Backups verified, restores actually performed, and recovery objectives documented against what the configuration can really deliver — not what the policy says it should.', icon: '#s-ha', coverColor: '#E7F5EC' },
          { title: 'Patching without surprises', body: 'Cumulative updates and security patches applied inside your change window, with a tested rollback. Patch currency is the control most environments quietly fail.', icon: '#s-cloud', coverColor: '#FFF1E0' },
          { title: 'Performance work, every month', body: 'Query, index and configuration tuning using the professional service hours included in every plan. Not an upsell — hours you have already paid for and should be spending.', icon: '#s-consult', coverColor: '#F3F2F1' },
          { title: 'A named consultant who knows you', body: 'A monthly health report and the same person on your environment month after month, rather than whoever happens to pick up the ticket. In a small market that continuity is worth more than the SLA.', icon: '#s-code', coverColor: '#EAF1FB' },
        ],
      },
      {
        type: 'platformChips',
        anchor: 'platforms',
        eyebrow: 'Platforms',
        heading: 'Whatever your environment grew into, we cover it',
        body: 'Pacific environments are rarely one vendor. A telco with Oracle billing, MySQL behind a mobile money platform and SQL Server under finance is the normal shape, not the exception — and it is the shape that makes hiring one DBA impossible.',
        groups: [
          { title: 'Microsoft', chips: [
            { label: 'SQL Server 2008–2022', color: '#CC2927' },
            { label: 'Azure SQL Database', color: '#0078D4' },
            { label: 'Azure SQL Managed Instance', color: '#0063B1' },
            { label: 'Always On availability groups', color: '#CC2927' },
            { label: 'SSIS · SSRS · SSAS', color: '#0E336A' },
          ] },
          { title: 'Oracle', chips: [
            { label: 'Oracle 10g – 23ai', color: '#C74634' },
            { label: 'Oracle RAC', color: '#C74634' },
            { label: 'Oracle Data Guard', color: '#C74634' },
            { label: 'RMAN & recovery', color: '#8A5A44' },
            { label: 'Oracle Cloud (OCI)', color: '#C74634' },
          ] },
          { title: 'Open source', chips: [
            { label: 'PostgreSQL', color: '#336791' },
            { label: 'EDB Postgres', color: '#336791' },
            { label: 'MySQL & MariaDB', color: '#00758F' },
            { label: 'Group replication', color: '#00758F' },
            { label: 'MongoDB', color: '#13AA52' },
          ] },
        ],
      },
      {
        type: 'steps',
        anchor: 'onboarding',
        eyebrow: 'Getting started',
        heading: 'Two weeks from signature to cover',
        body: 'Nothing is billed until cover actually starts, and nobody needs to get on a plane.',
        steps: [
          { title: 'Week 1 — discovery', body: 'We inventory the environment, run the free 20-point check on the instance that worries you most, and agree the escalation path and change process with your team.' },
          { title: 'Week 1 — secure access', body: 'Connectivity established by your preferred method, with individually named accounts and logged sessions. No shared credentials, and the access list is yours to ask for at any time.' },
          { title: 'Week 2 — monitoring tuned', body: 'Alerting configured against your thresholds, so you are paged for problems and not for noise. This is the step that decides whether anyone trusts the alerts in six months.' },
          { title: 'Week 2 — cover starts', body: 'The SLA clock begins, the first monthly report is scheduled, and you get the direct number for the consultant who knows your environment.' },
        ],
      },
      {
        type: 'cardGrid',
        anchor: 'conversations',
        eyebrow: 'Where most engagements start',
        heading: 'Four conversations we have again and again',
        body: 'If one of these is familiar, the work is already proven — and it is the fastest route to a scoped, fixed price.',
        centered: false,
        altBackground: false,
        columns: 2,
        cards: [
          {
            title: 'Nobody here has done a restore in years',
            body: 'Backups that run nightly and have never been proven. We test the restore path end to end and tell you what your real recovery position is, which is rarely the one written in the policy.',
            icon: '#s-shield',
            coverColor: '#EAF1FB',
            link: { label: 'Free health check', href: '/free-20-point-sql-server-health-check' },
          },
          {
            title: 'High availability that has never failed over',
            body: 'A cluster built once and never exercised is a hope, not a capability. We rehearse the failover, write the procedure down, and where the design allows it, arrange the test so it costs no outage.',
            icon: '#s-ha',
            coverColor: '#E7F5EC',
            link: { label: 'Upgrades, migrations & DR', href: '/database-upgrades-migrations-dr' },
          },
          {
            title: 'A platform move with no margin for error',
            body: 'Migrations and cloud moves where the system serves an entire market and there is no competitor to fall back on. Fixed price, written acceptance criteria, and a dry run against a copy of production before anything cuts over.',
            icon: '#s-cloud',
            coverColor: '#FFF1E0',
            link: { label: 'SQL Server projects', href: '/sql-server-migration-and-upgrade-services' },
          },
          {
            title: 'One person is the whole database team',
            body: 'Your team runs the environment day to day and we stand behind them: escalation for what needs a specialist, plus leave and after-hours cover so a resignation is not an operational risk.',
            icon: '#s-managed',
            coverColor: '#F3F2F1',
            link: { label: 'Remote database support', href: '/remote-database-support' },
          },
        ],
      },
      {
        type: 'relatedService',
        eyebrow: 'Proof',
        heading: 'We have already delivered here',
        body: 'Telecommunications and payments work across the Pacific: a MySQL group replication cluster with automatic failover and the migration onto it, a payment platform moved to Azure across two regions with banks and remittance partners kept in separate networks, and a SQL Server environment migrated to a managed cloud database without losing a transaction. Clients are not named — in markets this size, the sector and the country name them.',
        cta: { label: 'Read the case studies', href: '/case-studies' },
      },
      sovereigntyBlock,
      {
        type: 'ctaBand',
        heading: 'Start with one instance, at no cost',
        body: 'The free 20-point check is read-only, needs no access to your environment, and takes about twenty minutes of your time. You get the written findings whether or not you engage us — and if the environment is in good shape, we will tell you that.',
        cta: { label: 'Get the free health check', href: '/free-20-point-sql-server-health-check' },
      },
    ],
    faqs: [
      {
        question: 'Do you support organisations outside Australia and New Zealand?',
        answer:
          'Yes. Onsys supports Pacific Island organisations including Fiji, Papua New Guinea, Vanuatu, the Solomon Islands, Samoa and Tonga. Support is delivered remotely from Australia under the same plans and the same response SLAs as Australian clients, and every Pacific time zone sits within a few hours of Australian Eastern time.',
      },
      {
        question: 'Who actually accesses our database?',
        answer:
          'Onsys DBAs based in Australia, and only them. No offshore engineer holds credentials to a client database environment, on any plan. That is the default rather than an upgrade, and the access terms are documented before signature and written into the agreement.',
      },
      {
        question: 'Is pricing different for Pacific clients?',
        answer:
          'No. The published plans apply: from AUD 1,500 a month for up to 10 SQL Server instances, AUD 150 an hour for consultancy with a four-hour minimum, all GST exclusive. Fixed-price project work is quoted against written acceptance criteria.',
      },
      {
        question: 'What if we need someone on the ground?',
        answer:
          'Most database work does not require it — the engagement runs over secure remote access. Where a project genuinely needs on-site presence we will say so when we scope it, and price the travel separately rather than build an assumption into the rate.',
      },
    ],
  },

  {
    slug: 'database-support-new-zealand',
    title: 'Database Support New Zealand',
    heading: 'Remote DBA support for New Zealand organisations',
    eyebrow: 'New Zealand · Auckland · Wellington · Christchurch',
    lede: '24/7 cover for SQL Server, Oracle, PostgreSQL and MySQL estates, delivered from Australia inside your business day — with published prices and no lock-in.',
    seoTitle: 'Database Support New Zealand | Remote DBA & SQL Server Cover',
    seoDescription:
      'Remote DBA and SQL Server support for New Zealand organisations. 24/7 cover with a one-hour response SLA, published pricing, and consultants in Australia who are the only people with access to your instances.',
    heroImage: '/images/hero-pacific-new-zealand.jpg',
    heroCtas: [
      { label: 'Free 20-point health check', href: '/free-20-point-sql-server-health-check' },
      { label: `Call ${org.phone}`, href: `tel:${org.phoneE164}` },
    ],
    blocks: [
      {
        type: 'richText',
        heading: 'Close enough to be useful, far enough to be independent',
        html: `<p>New Zealand organisations face the same database problem as Australian ones, in a smaller labour market: a production estate that cannot stop, and not enough senior database people to go round. Hiring a dedicated DBA is expensive and, once hired, that person is a single point of failure — on leave, in a meeting, or eventually resigning.</p><p>Onsys covers New Zealand estates remotely from Australia. New Zealand runs two to three hours ahead of Australian Eastern time, which means something practical: a problem raised at the start of a Auckland business day reaches people who are already working, not a voicemail waiting for a European morning.</p>`,
      },
      {
        type: 'checkList',
        eyebrow: 'What cover includes',
        heading: 'The same plans our Australian clients buy',
        body: 'Nothing is a New Zealand variant. The plans, the SLAs and the prices are the published ones.',
        items: [
          '24/7/365 proactive monitoring and alerting across SQL Server, Oracle, PostgreSQL, MySQL, MariaDB and MongoDB',
          'A guaranteed response SLA — one hour on Plan B and Plan C, two hours on Plan A — with the clock starting when the alert fires rather than when somebody notices',
          'Professional service hours every month for the improvement work that otherwise never gets scheduled',
          'Patching, upgrades and version currency on a schedule, so an unsupported version is a decision rather than an accident',
          'Published pricing from AUD 1,500 a month, GST exclusive, with no lock-in contract on any plan',
        ],
      },
      {
        type: 'steps',
        eyebrow: 'Getting started',
        heading: 'From a free check to live cover',
        steps: [
          {
            title: 'Free 20-point health check',
            body: 'You run read-only scripts on one SQL Server instance and send us the output. Nothing is installed, and you can read every line before it runs.',
          },
          {
            title: 'Findings on a call',
            body: 'A senior DBA walks you through what the check found and what it would take to fix, in writing and on a call — within five business days of your results reaching us.',
          },
          {
            title: 'Secure access and onboarding',
            body: 'If you go ahead: instance count and versions confirmed, secure remote access established, escalation paths documented and your support number issued.',
          },
          {
            title: 'Cover goes live',
            body: 'Monitoring, alerting and your response SLA start, 24 hours a day including New Zealand public holidays.',
          },
        ],
      },
      {
        type: 'relatedService',
        eyebrow: 'Data residency',
        heading: 'Where your data sits, and who can reach it',
        body: 'Remote database administration does not move your data. Your databases stay where they are — in your data centre or your cloud tenancy, under your control and your retention rules. What changes is who is watching them: Onsys consultants in Australia, and only them. If your obligations require specific residency or access terms, they are documented before signature and written into the agreement.',
        cta: { label: 'Read the access policy', href: '/who-can-access-your-database' },
      },
      {
        type: 'ctaBand',
        heading: 'Find out where your estate actually stands.',
        body: 'One instance, no charge, no obligation — and you keep the report and the scripts whether or not you engage us.',
        cta: { label: 'Get the free health check', href: '/free-20-point-sql-server-health-check' },
      },
    ],
    faqs: [
      {
        question: 'Does Onsys support New Zealand clients?',
        answer:
          'Yes. Onsys provides 24/7 remote DBA and database support to New Zealand organisations, delivered from Australia. New Zealand runs two to three hours ahead of Australian Eastern time, so a New Zealand business day overlaps almost entirely with ours and support is available through it.',
      },
      {
        question: 'Is support priced in New Zealand dollars?',
        answer:
          'Prices are published in Australian dollars and invoiced in Australian dollars: from AUD 1,500 a month for up to 10 SQL Server instances, GST exclusive. If NZD invoicing matters for your procurement, ask us and we will tell you where that stands rather than quote a rate we have not set.',
      },
      {
        question: 'Does our data leave New Zealand?',
        answer:
          'No. Remote administration does not move or copy your databases — they stay in your data centre or your cloud tenancy, under your control. Onsys consultants connect to them over secure remote access from Australia. Specific residency or access requirements are documented before signature and written into the agreement.',
      },
      {
        question: 'Who accesses our instances?',
        answer:
          'Onsys DBAs based in Australia, and only them. No offshore engineer holds credentials to a client database environment, on any plan, by default rather than as an upgrade.',
      },
    ],
  },

  {
    slug: 'database-support-fiji',
    title: 'Database Support Fiji',
    heading: 'Database support for Fijian organisations',
    eyebrow: 'Fiji · Suva · Nadi · Lautoka',
    lede: 'Remote DBA cover for telecommunications, banking, utilities and government systems in Fiji — delivered from Australia, inside the Fijian business day.',
    seoTitle: 'Database Support Fiji | Remote DBA for Fijian Organisations',
    seoDescription:
      'Remote DBA and SQL Server support for organisations in Fiji. 24/7 cover across SQL Server, Oracle, PostgreSQL and MySQL, delivered from Australia inside the Fijian business day.',
    heroImage: '/images/hero-pacific-fiji.jpg',
    heroCtas: [
      { label: 'Free 20-point health check', href: '/free-20-point-sql-server-health-check' },
      { label: `Call ${org.phone}`, href: `tel:${org.phoneE164}` },
    ],
    blocks: [
      {
        type: 'richText',
        heading: 'Critical systems, a small pool of specialists',
        html: `<p>Fiji runs a concentrated set of systems that a great many people depend on: telecommunications and mobile money platforms, core banking, utilities billing and government services. In a market this size, one platform often serves a whole sector — which makes an outage a national inconvenience rather than a company problem.</p><p>The constraint is senior database depth. There are capable infrastructure teams in Fiji, and far fewer people who have spent a career inside SQL Server or Oracle internals. For day-to-day operation that is usually fine. For a corrupt database, a cluster that will not fail over, or a migration that must not lose a transaction, it is the difference between an afternoon and a week.</p>`,
      },
      {
        type: 'checkList',
        eyebrow: 'How cover works',
        heading: 'Specialist depth without a specialist on the payroll',
        items: [
          'Fiji sits ahead of Australian Eastern time, so a problem raised at the start of your day reaches DBAs who are already working — not a northern-hemisphere support desk that opens as you are going home',
          '24/7 cover under the published response SLAs, one hour on Plan B and Plan C',
          'Your existing team keeps running the estate; we stand behind them for escalation, leave cover and the work that needs a specialist',
          'Secure remote access, so nothing depends on a flight',
          'SQL Server, Oracle, PostgreSQL, MySQL, MariaDB and MongoDB on one team and one agreement',
        ],
      },
      {
        type: 'relatedService',
        eyebrow: 'Experience in this market',
        heading: 'We have delivered for Pacific telecommunications and payments',
        body: 'Our Pacific engagements include a group replication cluster with automatic promotion and a phased migration onto it, a payments platform moved to the cloud across two regions with partner banks isolated in their own network, and the database platform behind a mobile money launch in a new market. We do not name clients: in a market this size, naming the sector and the country names the organisation.',
        cta: { label: 'Read the case studies', href: '/case-studies' },
      },
      sovereigntyBlock,
      {
        type: 'ctaBand',
        heading: 'Start with a free check of one instance.',
        body: 'Read-only, about twenty minutes of your time, and a written report within three business days. No charge and no obligation.',
        cta: { label: 'Get the free health check', href: '/free-20-point-sql-server-health-check' },
      },
    ],
    faqs: [
      {
        question: 'Does Onsys support organisations in Fiji?',
        answer:
          'Yes. Onsys provides remote DBA and database support to Fijian organisations across telecommunications, banking, utilities and government, delivered from Australia. Fiji sits ahead of Australian Eastern time, so support is available throughout the Fijian business day, and cover is 24/7 under the published response SLAs.',
      },
      {
        question: 'Do you have Pacific delivery experience?',
        answer:
          'Yes. Onsys has delivered telecommunications and payments database and cloud engagements in the Pacific Islands, including group replication clustering, a multi-region cloud migration for a payments platform, and the database platform behind a mobile money launch. Clients are not named because the work was done under confidentiality.',
      },
      {
        question: 'Who holds credentials to our database?',
        answer:
          'Onsys DBAs based in Australia, and only them. No offshore engineer holds credentials to a client database environment, on any plan, by default.',
      },
    ],
  },

  {
    slug: 'database-support-papua-new-guinea',
    title: 'Database Support Papua New Guinea',
    heading: 'Database support for Papua New Guinea',
    eyebrow: 'Papua New Guinea · Port Moresby · Lae',
    lede: 'Remote DBA cover for resources, telecommunications, banking and government systems in PNG — delivered from Australia, on the same clock.',
    seoTitle: 'Database Support Papua New Guinea | Remote DBA for PNG',
    seoDescription:
      'Remote DBA and SQL Server support for organisations in Papua New Guinea. 24/7 cover across SQL Server, Oracle, PostgreSQL and MySQL from Australian consultants, on the same time zone as Port Moresby.',
    heroImage: '/images/hero-pacific-png.jpg',
    heroCtas: [
      { label: 'Free 20-point health check', href: '/free-20-point-sql-server-health-check' },
      { label: `Call ${org.phone}`, href: `tel:${org.phoneE164}` },
    ],
    blocks: [
      {
        type: 'richText',
        heading: 'Same time zone, different problem',
        html: `<p>Port Moresby shares Australian Eastern Standard Time. For database support that is unusually convenient: there is no overlap to manage and no handover window. A problem raised in PNG at nine in the morning reaches a DBA whose day started at the same moment.</p><p>What PNG organisations contend with is the combination of critical systems — resources operations, telecommunications, banking, government — and a thin local market for deep database specialists. Add connectivity that is better than it was but still not something to take for granted, and the sensible design decisions change: you want fewer moving parts, tested recovery, and a support relationship that does not depend on anybody travelling.</p>`,
      },
      {
        type: 'checkList',
        eyebrow: 'How cover works',
        heading: 'Built for the constraints you actually have',
        items: [
          'Port Moresby and Australian Eastern Standard Time are the same clock — no overlap window to manage and no waiting for another hemisphere to wake up',
          '24/7 monitoring and incident response under the published SLAs, one hour on Plan B and Plan C',
          'Recovery proven rather than assumed: we test the restore path and tell you what your real recovery position is',
          'Designs that favour fewer moving parts and tested failover over architectural elegance, because the cost of complexity is higher when specialist help is further away',
          'Everything delivered over secure remote access',
        ],
      },
      {
        type: 'relatedService',
        eyebrow: 'Experience in this market',
        heading: 'Pacific delivery, including new-market launches',
        body: 'Our Pacific work includes the database platform behind a mobile money launch in a new market — clustered databases, availability groups, backups and monitoring all proven before the platform carried a single transaction, because a launch has nothing to fall back on. Clients are not named.',
        cta: { label: 'Read the case studies', href: '/case-studies' },
      },
      sovereigntyBlock,
      {
        type: 'ctaBand',
        heading: 'Find out where your estate stands.',
        body: 'A free 20-point check of one SQL Server instance. Read-only, no charge, and you keep the report either way.',
        cta: { label: 'Get the free health check', href: '/free-20-point-sql-server-health-check' },
      },
    ],
    faqs: [
      {
        question: 'Does Onsys support organisations in Papua New Guinea?',
        answer:
          'Yes. Onsys provides remote DBA and database support to PNG organisations across resources, telecommunications, banking and government, delivered from Australia. Port Moresby shares Australian Eastern Standard Time, so there is no time-zone gap to manage, and cover is 24/7 under the published response SLAs.',
      },
      {
        question: 'Does support depend on anyone travelling to PNG?',
        answer:
          'No. Database administration, monitoring and incident response are delivered over secure remote access. Where a project genuinely needs someone on site we say so when we scope it and price the travel separately.',
      },
      {
        question: 'Who accesses our instances?',
        answer:
          'Onsys DBAs based in Australia, and only them. No offshore engineer holds credentials to a client database environment, on any plan, by default rather than as an upgrade.',
      },
    ],
  },

  {
    slug: 'database-support-vanuatu',
    title: 'Database Support Vanuatu',
    heading: 'Database support for Vanuatu',
    eyebrow: 'Vanuatu · Port Vila · Luganville',
    lede: 'Remote DBA cover for finance, telecommunications, utilities and government systems in Vanuatu — with disaster recovery treated as something you test, not something you file.',
    seoTitle: 'Database Support Vanuatu | Remote DBA for Ni-Vanuatu Organisations',
    seoDescription:
      'Remote DBA and database support for organisations in Vanuatu. 24/7 cover across SQL Server, Oracle, PostgreSQL and MySQL from Australian consultants, within hours of the Vanuatu business day.',
    heroImage: '/images/hero-pacific-vanuatu.jpg',
    heroCtas: [
      { label: 'Free 20-point health check', href: '/free-20-point-sql-server-health-check' },
      { label: `Call ${org.phone}`, href: `tel:${org.phoneE164}` },
    ],
    blocks: [
      {
        type: 'richText',
        heading: 'Where disaster recovery is not a paperwork exercise',
        html: `<p>Vanuatu runs within a couple of hours of Australian Eastern time, so a working day here and a working day there are effectively the same. That makes remote database support practical in a way that a northern-hemisphere arrangement never is.</p><p>It is also a market where disaster recovery deserves to be taken literally. Organisations in the region plan for events that elsewhere are treated as hypothetical, and a recovery plan that has never been exercised is not a plan — it is a document. The most valuable thing we do for clients in this position is not building the DR environment. It is proving that it works, on a schedule, without taking production down to find out.</p>`,
      },
      {
        type: 'checkList',
        eyebrow: 'How cover works',
        heading: 'Recovery you have actually seen work',
        items: [
          'Restore paths tested end to end, so your recovery position is a measured fact rather than a policy statement',
          'Failover rehearsed and documented, with the procedure written down for the people who will run it under pressure',
          'Where the architecture allows, DR testing arranged so it does not require a production outage — which is what turns an annual test into one that actually happens',
          '24/7 monitoring and incident response under the published SLAs',
          'Delivered remotely from Australia, within a couple of hours of your business day',
        ],
      },
      sovereigntyBlock,
      {
        type: 'ctaBand',
        heading: 'When did you last prove a restore?',
        body: 'The free 20-point check covers backups, configuration, security and patch currency on one instance. Read-only, no charge, no obligation.',
        cta: { label: 'Get the free health check', href: '/free-20-point-sql-server-health-check' },
      },
    ],
    faqs: [
      {
        question: 'Does Onsys support organisations in Vanuatu?',
        answer:
          'Yes. Onsys provides remote DBA and database support to organisations in Vanuatu across finance, telecommunications, utilities and government, delivered from Australia. Vanuatu sits within a couple of hours of Australian Eastern time, and cover is 24/7 under the published response SLAs.',
      },
      {
        question: 'Can you help us test disaster recovery without an outage?',
        answer:
          'Often, yes. Where the architecture allows it, a disaster-recovery test can be run against the recovery site while production stays open to applications — we have built and documented exactly that for a client with two data centres. Whether it is possible depends on your topology, and we will tell you honestly after looking at it.',
      },
      {
        question: 'Who accesses our database?',
        answer:
          'Onsys DBAs based in Australia, and only them. No offshore engineer holds credentials to a client database environment, on any plan.',
      },
    ],
  },

  {
    slug: 'database-support-solomon-islands',
    title: 'Database Support Solomon Islands',
    heading: 'Database support for the Solomon Islands',
    eyebrow: 'Solomon Islands · Honiara',
    lede: 'Remote DBA cover for telecommunications, banking, utilities and government systems in the Solomon Islands — delivered from Australia, inside your working day.',
    seoTitle: 'Database Support Solomon Islands | Remote DBA from Australia',
    seoDescription:
      'Remote DBA and database support for organisations in the Solomon Islands. 24/7 cover across SQL Server, Oracle, PostgreSQL and MySQL from Australian consultants, within hours of the Honiara business day.',
    heroImage: '/images/hero-pacific-solomon-islands.jpg',
    heroCtas: [
      { label: 'Free 20-point health check', href: '/free-20-point-sql-server-health-check' },
      { label: `Call ${org.phone}`, href: `tel:${org.phoneE164}` },
    ],
    blocks: [
      {
        type: 'richText',
        heading: 'Specialist cover for a small, critical estate',
        html: `<p>The Solomon Islands sits within a couple of hours of Australian Eastern time, which makes remote support from Australia practical rather than awkward. Telecommunications, banking, utilities and government systems here carry the same weight as much larger estates elsewhere, with far fewer people available to look after them.</p><p>The pattern we see most often is a small, competent infrastructure team who can run the estate day to day but have no realistic escalation path when something unusual happens. That is the gap a support plan fills: not replacing your people, but making sure they are never the end of the line.</p>`,
      },
      {
        type: 'checkList',
        eyebrow: 'How cover works',
        heading: 'An escalation path that actually answers',
        items: [
          'Within a couple of hours of Australian Eastern time, so your morning reaches people who are already at work',
          '24/7 monitoring and incident response under the published SLAs, with a dedicated support line rather than a generic queue',
          'Certified senior DBAs on the call, with no first-line triage layer in front of them',
          'Your team keeps ownership of the estate; we provide depth, leave cover and after-hours response',
          'Secure remote access across SQL Server, Oracle, PostgreSQL, MySQL, MariaDB and MongoDB',
        ],
      },
      sovereigntyBlock,
      {
        type: 'ctaBand',
        heading: 'Start with one instance, free.',
        body: 'A 20-point read-only check and a written report within three business days. You keep the report and the scripts whether or not you engage us.',
        cta: { label: 'Get the free health check', href: '/free-20-point-sql-server-health-check' },
      },
    ],
    faqs: [
      {
        question: 'Does Onsys support organisations in the Solomon Islands?',
        answer:
          'Yes. Onsys provides remote DBA and database support to organisations in the Solomon Islands across telecommunications, banking, utilities and government, delivered from Australia. The Solomon Islands sits within a couple of hours of Australian Eastern time, and cover is 24/7 under the published response SLAs.',
      },
      {
        question: 'We already have an infrastructure team. What would you add?',
        answer:
          'Depth and availability. Your team keeps running the estate; Onsys provides the specialist escalation path for the problems that need one, plus leave cover and after-hours response so a single person is not the only thing standing between an incident and an outage.',
      },
      {
        question: 'Who accesses our database?',
        answer:
          'Onsys DBAs based in Australia, and only them. No offshore engineer holds credentials to a client database environment, on any plan, by default rather than as an upgrade.',
      },
    ],
  },

  {
    /*
     * New Caledonia.
     *
     * Added on the client's instruction, with PostgreSQL as the lead rather
     * than SQL Server. The reasoning given was that PostgreSQL is what the
     * territory mostly runs, which is consistent with open-source database
     * adoption across French public sector and industry generally — so the
     * page is written around PostgreSQL and says so, without claiming a
     * market-share figure nobody here has measured.
     *
     * Two things are stated plainly rather than left for a prospect to find
     * out on the first call: Onsys works in English, and New Caledonia is a
     * French-speaking territory. A page that quietly omits that wastes the
     * enquiry of anyone who needs French-language support.
     *
     * WhatsApp is the primary contact here because it is the channel the
     * client named for this market. The link degrades to /contact when
     * ORG_WHATSAPP is unset, so the page never offers a dead number.
     */
    slug: 'postgresql-support-new-caledonia',
    title: 'PostgreSQL Support New Caledonia',
    heading: 'PostgreSQL consultancy and support for New Caledonia',
    eyebrow: 'Nouvelle-Calédonie · Nouméa · PostgreSQL · UTC+11',
    lede: 'Senior PostgreSQL consultants an hour from your working day, reachable on WhatsApp. High availability, replication, tuning, upgrades and recovery for the organisations running New Caledonia’s critical systems.',
    seoTitle: 'PostgreSQL Support New Caledonia | Remote DBA Consultancy',
    seoDescription:
      'PostgreSQL consultancy and remote DBA support for organisations in New Caledonia — replication, high availability, tuning, upgrades and recovery, in your working day, on WhatsApp.',
    heroImage: '/images/hero-pacific-new-caledonia.jpg',
    heroCtas: [
      { label: 'Talk to a PostgreSQL consultant', href: '/contact' },
      org.whatsappUrl
        ? { label: 'Message us on WhatsApp', href: org.whatsappUrl }
        : { label: `Call ${org.phone}`, href: `tel:${org.phoneE164}` },
    ],
    blocks: [
      {
        type: 'richText',
        heading: 'PostgreSQL expertise, an hour away',
        html: `<p>New Caledonia runs the same shape of estate as any small, concentrated economy: a handful of platforms that a great many people depend on, in telecommunications, banking, utilities, mining and government. What is less common is the database underneath them. Where much of the Pacific defaults to Microsoft SQL Server, open-source databases — PostgreSQL above all — are far better represented across French-speaking public sector and industry.</p><p>That changes who can help. A provider whose depth is in SQL Server can keep a PostgreSQL estate running; it is a different thing from having designed replication topologies, tuned autovacuum on a large table, recovered a cluster to a point in time, or planned a major-version upgrade that cannot be rolled back the easy way.</p><p>Nouméa is on UTC+11. That is the same clock as Sydney and Melbourne through the Australian summer and one hour ahead of them for the rest of the year — the closest working-day overlap of any market Onsys serves outside Australia itself. An incident raised at nine in the morning in Nouméa reaches a consultant who is already at their desk.</p>`,
      },
      {
        type: 'checkList',
        eyebrow: 'What we do on PostgreSQL',
        heading: 'The work, specifically',
        body: 'Not "we support PostgreSQL". These are the engagements that actually come up, and each one is something we have built or recovered on a production estate.',
        items: [
          'Streaming replication and physical standbys, with the failover rehearsed rather than assumed',
          'High availability with automatic promotion, and a connection layer that follows the primary when it moves',
          'Point-in-time recovery: continuous WAL archiving, retention that reaches back to the oldest usable backup, and a restore somebody has actually performed',
          'Performance work — query plans, indexing, autovacuum and bloat, connection pooling, and the configuration defaults nobody revisited after go-live',
          'Major-version upgrades, planned and tested against a restored copy before the change window opens',
          'Migrations onto PostgreSQL from Oracle, SQL Server or MySQL, scoped against what the application actually uses rather than against the schema alone',
          'EDB Postgres where the estate is on the enterprise distribution',
          'Monitoring and alerting that tells you replication has stopped before a user does',
        ],
        sidebar: {
          title: 'The practical facts',
          rows: [
            { label: 'Nouméa', value: 'UTC+11' },
            { label: 'vs Sydney, Oct–Apr', value: 'Same clock' },
            { label: 'vs Sydney, Apr–Oct', value: '1 hour ahead' },
            { label: 'Cover', value: '24/7, every plan' },
            { label: 'Database access', value: 'Australian-based DBAs only' },
            { label: 'Pricing', value: 'Published, in AUD' },
          ],
        },
      },
      {
        type: 'richText',
        heading: 'Two things worth saying before you call',
        html: `<p><strong>We work in English.</strong> New Caledonia is a French-speaking territory and Onsys does not deliver in French. In our experience the technical conversation — replication lag, WAL, query plans, recovery targets — carries across in English with engineers who work with these tools daily, because the vocabulary is already English. The commercial conversation is a fair question to raise early, and we would rather you raised it than discovered it mid-engagement.</p><p><strong>We are not in Nouméa.</strong> Onsys is an Australian practice and the work is remote, which is how specialist database work is delivered everywhere — the alternative is an in-house DBA, not a local one. What you get instead of proximity is a guaranteed response time, a named consultant who knows your estate, and published prices.</p>`,
      },
      {
        type: 'ctaBand',
        heading: 'Message us on WhatsApp',
        body: 'The quickest way to reach a database consultant from New Caledonia. Tell us what you are running and what is worrying you; if it is not something we should take on, we will say so.',
        cta: {
          label: org.whatsappUrl ? 'Start a WhatsApp conversation' : 'Talk to a consultant',
          href: org.whatsappUrl ?? '/contact',
        },
      },
      sovereigntyBlock,
    ],
    faqs: [
      {
        question: 'Does Onsys support PostgreSQL in New Caledonia?',
        answer:
          'Yes. PostgreSQL is the lead platform for this market: replication and standbys, high availability with automatic promotion, point-in-time recovery, performance and autovacuum tuning, major-version upgrades, and migrations onto PostgreSQL from Oracle, SQL Server or MySQL. EDB Postgres is covered where the estate runs the enterprise distribution. Support is delivered remotely from Australia under the published response SLAs.',
      },
      {
        question: 'What time zone is Nouméa, and does that work for support?',
        answer:
          'New Caledonia is UTC+11, which is the same clock as Sydney and Melbourne during the Australian summer and one hour ahead for the rest of the year. It is the closest working-day overlap of any market Onsys serves outside Australia, so a question raised first thing in Nouméa reaches a consultant who is already working. Cover is 24/7 on every monthly plan regardless.',
      },
      {
        question: 'Can we contact Onsys on WhatsApp?',
        answer:
          'Yes, and for New Caledonia it is the channel we would suggest first. WhatsApp avoids international call costs and gives both sides a written record of what was said, which matters when the conversation is about version numbers and error messages. Phone and email work too, and once an engagement starts you get a direct line to the consultant who knows your estate.',
      },
      {
        question: 'Does Onsys provide support in French?',
        answer:
          'No. Onsys works in English, and we would rather say so here than let you find out during an engagement. The technical vocabulary of PostgreSQL is already English, so in practice the engineering conversation carries across; whether that is acceptable for the commercial and reporting side is a reasonable question to settle before you commit to anything.',
      },
      {
        question: 'Who would have access to our database?',
        answer:
          'Onsys DBAs based in Australia, and only them. No offshore engineer holds credentials to a client database environment, on any plan. Access is through individually named accounts rather than shared credentials, every session is logged, we tell you which engineers hold access before you sign, and it is revoked the day an engagement ends.',
      },
    ],
  },
];
