import { org } from '../lib/env';
import type { SeedPage } from './seed-content';

/**
 * City pages: Sydney, Brisbane, Perth, Adelaide, Auckland.
 *
 * The brief was explicit that these must not be the Melbourne page with the
 * city name swapped, which is what city pages usually are and why they usually
 * rank for nothing. The Melbourne page can make a claim none of these can: the
 * DBAs are there and will attend in person. Repeating that for Sydney would be
 * a lie, and a prospect in Sydney finds out it is a lie on the first call.
 *
 * So each page is built around something that is true, specific to that city,
 * and actually operationally relevant:
 *
 * - Sydney: Azure Australia East and AWS ap-southeast-2 are physically there,
 *   so most "cloud" databases in the country already sit in Sydney.
 * - Brisbane: Queensland does not observe daylight saving, so for roughly five
 *   months a year Brisbane runs an hour behind the eastern states. That moves
 *   change windows, batch overlaps and SLA clocks.
 * - Perth: AWST is two hours behind AEST and three behind AEDT. An eastern
 *   provider's "after hours" is Perth's working afternoon, and there is no
 *   major cloud region in Western Australia.
 * - Adelaide: a half-hour offset that breaks naive scheduling, plus a defence
 *   supply chain with its own security expectations.
 * - Auckland: a different country, a different privacy statute, two hours ahead
 *   of Melbourne, and prices published in AUD.
 *
 * Three rules were applied throughout.
 *
 * 1. No page claims an office, staff or a client in that city. Onsys is
 *    Melbourne-based and each page says so in its own words rather than
 *    implying otherwise by omission.
 * 2. Only verifiable specifics. Time-zone offsets, cloud region locations and
 *    the names of real government security policies — no statistics, no client
 *    names, no claims about the local market we cannot stand behind.
 * 3. Database access stays Australian. The onshore rule does not change with
 *    the postcode, and no page implies round-the-clock offshore cover.
 *
 * Pricing is AUD on every page including Auckland, because AUD is what is
 * published. NZD pricing and an 0800 number remain open decisions; when they
 * land, the Auckland page and /database-support-new-zealand are where they go.
 */

/** The access rule, worded identically wherever it appears. */
const sovereigntyBlock = {
  type: 'relatedService' as const,
  eyebrow: 'Data sovereignty',
  heading: 'Who touches your database',
  body: 'Your production databases are accessed by Onsys DBAs based in Australia, and only by them. No offshore engineer holds credentials to a client database — on every plan, by default, not as an upgrade.',
  cta: { label: 'Read the access policy', href: '/who-can-access-your-database' },
};

/**
 * Said plainly on every page rather than left to be discovered. A city page
 * that implies a local office is a page that gets found out on the first call.
 */
const whereWeAreBlock = (city: string, detail: string) => ({
  type: 'checkList' as const,
  anchor: 'where-we-are',
  eyebrow: 'Being straight about this',
  heading: `We are not based in ${city}`,
  body: `Onsys is a Melbourne practice. ${detail}`,
  items: [
    `Our office is at ${org.postalAddress}, and our DBAs are in Australia`,
    'Database support is remote, which is how specialist database work is delivered everywhere — the alternative is an in-house DBA, not a local one',
    'On-site attendance is available in the Melbourne metropolitan area as part of an engagement; elsewhere it is arranged and quoted case by case',
    'What you get instead of proximity is a guaranteed response time, a named consultant who knows your estate, and published prices',
    'If physical attendance matters more to you than any of that, we will say so rather than talk you out of it',
  ],
  sidebar: {
    title: 'The practical facts',
    rows: [
      { label: 'Head office', value: `${org.address.locality} ${org.address.region}` },
      { label: 'Database access', value: 'Australian-based DBAs only' },
      { label: 'Cover', value: '24/7, every plan' },
      { label: 'Phone', value: org.phone },
      { label: 'Plans from', value: '$1,500/mo ex GST' },
    ],
  },
});

export const cityPages: SeedPage[] = [
  // ------------------------------------------------------------------ Sydney
  {
    slug: 'sql-server-dba-sydney',
    title: 'SQL Server DBA Sydney',
    heading: 'SQL Server DBA services in Sydney',
    eyebrow: 'Same timezone · where the cloud regions actually are',
    lede: 'Your production database is probably already in Sydney even if your team is not — Azure Australia East and AWS ap-southeast-2 are both there. Remote SQL Server DBA cover on the same clock as your business, from $1,500 a month.',
    heroImage: '/images/hero-db-managed.jpg',
    heroCtas: [
      { label: 'Free 20-point health check', href: '/free-20-point-sql-server-health-check' },
      { label: `Call ${org.phone}`, href: `tel:${org.phoneE164}` },
    ],
    seoTitle: 'SQL Server DBA Sydney | Remote DBA from $1,500/mo',
    seoDescription:
      'Remote SQL Server DBA services for Sydney organisations. Same timezone, 24/7 cover, Australian-only database access, published pricing from $1,500 per month.',
    navOrder: 30,
    blocks: [
      {
        type: 'richText',
        html: `
<p><strong>Sydney is where most Australian cloud databases physically live.</strong> Azure's Australia East region and AWS's ap-southeast-2 are both in Sydney, which means a large share of the country's Azure SQL databases, managed instances and RDS instances are sitting in a data centre a Sydney organisation could drive past — including plenty belonging to organisations in other states.</p>
<p>That matters more than it sounds. If your workload is in Australia East and your users are in Sydney, you have the best latency position in the country and performance problems are almost never about distance. It also means the decisions that do affect you are configuration decisions: instance sizing, storage tier, index design, how reporting shares the instance with transactional work. Those are DBA problems, and they are the same whether your consultant is in Sydney or Melbourne.</p>`,
      },
      {
        type: 'cardGrid',
        anchor: 'what-we-see',
        eyebrow: 'What we get called about in Sydney',
        heading: 'The problems that come with being in the cloud region',
        body: 'Sydney estates skew cloud-first and financial-services-heavy, and both of those produce a recognisable set of database problems.',
        centered: true,
        altBackground: true,
        columns: 3,
        cards: [
          {
            title: 'A cloud bill nobody can explain',
            body: 'Azure SQL and RDS make it trivial to solve a performance problem by increasing the tier. That works, monthly, forever. Most of the time the underlying cause is indexing or a query plan, and it is cheaper to fix than to rent around.',
            icon: '#s-cloud',
            coverColor: '#EAF1FB',
          },
          {
            title: 'Managed does not mean administered',
            body: 'Azure SQL Managed Instance removes patching and a lot of infrastructure work. It does not tune queries, design indexes, test your restores or decide your recovery objective. Estates that moved expecting otherwise are a steady source of calls.',
            icon: '#s-managed',
            coverColor: '#E7F5EC',
          },
          {
            title: 'A hybrid estate nobody owns end to end',
            body: 'Part on-premises, part in Australia East, integrations crossing between them. The failure modes live in the seam, and the seam usually belongs to nobody.',
            icon: '#s-consult',
            coverColor: '#FFF1E0',
          },
          {
            title: 'Regulated workloads needing evidence',
            body: 'Sydney concentrates financial services, and with it APRA CPS 234 expectations and third-party reviews that ask who holds database credentials and in which country. We answer that in writing.',
            icon: '#s-shield',
            coverColor: '#F3F2F1',
          },
          {
            title: 'Single-region by accident',
            body: 'Everything in Australia East, including the backups. It is the default, it is rarely a decision anyone made, and it is worth knowing before an auditor asks rather than after.',
            icon: '#s-emergency',
            coverColor: '#FDECEC',
          },
          {
            title: 'An ageing version under a cloud veneer',
            body: 'SQL Server 2016 or 2017 lifted onto an Azure VM is still SQL Server 2016 or 2017. The infrastructure modernised; the end-of-support date did not move.',
            icon: '#s-ha',
            coverColor: '#EAF1FB',
          },
        ],
      },
      {
        type: 'checkList',
        anchor: 'same-clock',
        eyebrow: 'Why the timezone matters',
        heading: 'Sydney and Melbourne run on the same clock',
        body: 'This is the one genuine advantage an eastern-states provider has for a Sydney client, and it is worth being concrete about what it buys.',
        items: [
          'NSW and Victoria share AEST and AEDT, including the daylight saving changeover dates — so there is never an offset to reason about',
          'Your business hours are our business hours: a question at 9am is answered at 9am, not the following day',
          'Change windows do not have to be negotiated across a time difference, which matters most for the overnight work where they are tightest',
          'A 2am incident is 2am for the DBA who answers it, not a handover note written by someone finishing their afternoon',
          'Nothing about remote support degrades at distance — Sydney to Melbourne is a secure connection, the same as a Sydney office to a Sydney data centre',
        ],
        sidebar: {
          title: 'Where your data probably is',
          rows: [
            { label: 'Azure Australia East', value: 'Sydney' },
            { label: 'Azure Australia Southeast', value: 'Melbourne' },
            { label: 'Azure Australia Central', value: 'Canberra' },
            { label: 'AWS ap-southeast-2', value: 'Sydney' },
            { label: 'AWS ap-southeast-4', value: 'Melbourne' },
          ],
        },
      },
      whereWeAreBlock(
        'Sydney',
        'We support Sydney organisations remotely, on the same clock, and we would rather say that plainly than let a city page imply a local office.',
      ),
      sovereigntyBlock,
      {
        type: 'ctaBand',
        heading: 'Start with one Sydney instance',
        body: 'The free 20-point health check is read-only, needs no access to your environment, and gives you a written report within 3 business days — including when the answer is that your estate is in good shape.',
        cta: { label: 'Book the free health check', href: '/free-20-point-sql-server-health-check' },
      },
    ],
    faqs: [
      {
        question: 'Do you have an office in Sydney?',
        answer:
          'No. Onsys is a Melbourne practice and our DBAs are in Australia. Sydney clients are supported remotely on the same timezone, with a guaranteed response time at any hour. We would rather tell you that up front than have you find out on the first call. On-site attendance outside the Melbourne metropolitan area is arranged and quoted case by case.',
      },
      {
        question: 'Our databases are in Azure Australia East. Does that change anything?',
        answer:
          'Only in your favour. Australia East is the Sydney region, so if your users are in Sydney you already have the best latency position in the country. What we administer there is the same as anywhere else: performance, indexing, backup and restore verification, high availability, security and cost. Azure SQL Database, Managed Instance and SQL Server on Azure VMs are all in scope, as is Amazon RDS for SQL Server.',
      },
      {
        question: 'We already pay Microsoft for a managed database. Why would we also pay a DBA?',
        answer:
          'Because the managed platform covers infrastructure, not administration. Microsoft patches the platform and keeps it available. It does not tune your queries, design your indexes, test that your restores work, decide your recovery objective, or tell you that your reporting workload is competing with your transactional one. Those are the things that produce the bill and the incident.',
      },
      {
        question: 'Can you meet an Australian-resident-only access requirement?',
        answer:
          'Yes, and it is the default rather than an upgrade. Every login to a client database instance is made by an Onsys DBA based in Australia, and no offshore engineer holds credentials to a client database on any plan. We tell you which engineers hold access before you sign, and the terms go into the agreement.',
      },
      {
        question: 'What does it cost?',
        answer:
          'Plan A is $1,500 per month excluding GST for up to 10 SQL Server instances — $150 per instance — with a guaranteed two-hour response at any hour and 10 professional service hours a month. Plan B is $3,000 and Plan C is $7,500 for larger and mixed-platform estates. Ad-hoc consultancy is $150 per hour with a four-hour minimum. Every figure is published.',
      },
    ],
  },

  // ---------------------------------------------------------------- Brisbane
  {
    slug: 'sql-server-dba-brisbane',
    title: 'SQL Server DBA Brisbane',
    heading: 'SQL Server DBA services in Brisbane',
    eyebrow: 'Queensland time, properly accounted for',
    lede: 'Queensland does not observe daylight saving, so for about five months a year Brisbane runs an hour behind the southern states — which quietly moves every change window, batch overlap and SLA clock. Remote SQL Server DBA cover that is scheduled in your time, from $1,500 a month.',
    heroImage: '/images/hero-db-managed.jpg',
    heroCtas: [
      { label: 'Free 20-point health check', href: '/free-20-point-sql-server-health-check' },
      { label: `Call ${org.phone}`, href: `tel:${org.phoneE164}` },
    ],
    seoTitle: 'SQL Server DBA Brisbane | Remote DBA, Queensland Time',
    seoDescription:
      'Remote SQL Server DBA services for Brisbane and Queensland. Change windows scheduled in AEST year-round, 24/7 cover, Australian-only database access, from $1,500/month.',
    navOrder: 31,
    blocks: [
      {
        type: 'richText',
        html: `
<p><strong>Queensland stays on AEST all year.</strong> From the first Sunday in October to the first Sunday in April, Sydney and Melbourne move to AEDT and Brisbane does not — so for roughly five months a year a Brisbane organisation is an hour behind the southern states, and every schedule agreed in "10pm" has to be asked about.</p>
<p>That is not a trivia point. Overnight maintenance windows, cross-state batch dependencies, replication to a southern DR site, SLA clocks, and the hand-off between a Brisbane operations team finishing at 5pm AEST and a provider still at their desk until 6pm AEDT — all of it shifts twice a year. In our experience it is the single most common source of a missed change window for Queensland estates, and it is entirely avoidable by writing the timezone next to the time.</p>`,
      },
      {
        type: 'checkList',
        anchor: 'timezone',
        eyebrow: 'How we handle it',
        heading: 'Scheduling that accounts for Queensland time',
        body: 'None of this is clever. It is just done deliberately, because the alternative is an annual round of windows that drift by an hour.',
        items: [
          'Every change window, maintenance schedule and report time is written with its timezone attached, never as a bare clock time',
          'Schedules are reviewed at both daylight saving transitions rather than left to drift — the October change is the one that catches Queensland estates',
          'Where a Brisbane database replicates to or from a southern site, the overlap between the two maintenance windows is worked out explicitly rather than assumed',
          'SLA response times are measured in elapsed time, so the clock is unaffected by which state is on which offset',
          'For estates spanning Queensland and the southern states, we document which system runs on which offset — frequently the first time that has been written down',
        ],
        sidebar: {
          title: 'The offsets that matter',
          rows: [
            { label: 'Brisbane', value: 'AEST, UTC+10, all year' },
            { label: 'Sydney & Melbourne', value: 'AEST or AEDT' },
            { label: 'Oct – Apr', value: 'Brisbane 1 hour behind' },
            { label: 'Apr – Oct', value: 'Same time' },
            { label: 'Nearest cloud region', value: 'Sydney' },
          ],
        },
      },
      {
        type: 'cardGrid',
        anchor: 'what-we-see',
        eyebrow: 'What we get called about in Queensland',
        heading: 'The problems that come with distributed operations',
        body: 'Queensland estates are more geographically spread than most, and that shapes the database problems that reach us.',
        centered: true,
        altBackground: true,
        columns: 3,
        cards: [
          {
            title: 'Databases at regional sites',
            body: 'Mine sites, ports, processing plants, regional offices and council depots running local instances over connectivity that was never designed for a database. Backups that technically run but could not be restored across that link in any useful time.',
            icon: '#s-managed',
            coverColor: '#EAF1FB',
          },
          {
            title: 'Operations that genuinely do not stop',
            body: 'Resources, logistics and utilities estates where there is no quiet period to schedule into. The work becomes finding a window that exists rather than negotiating the one you want.',
            icon: '#s-emergency',
            coverColor: '#FDECEC',
          },
          {
            title: 'A DR site in another state',
            body: 'Replication to Sydney or Melbourne, often configured once and never tested, and often with the two sites on different daylight saving offsets for half the year.',
            icon: '#s-ha',
            coverColor: '#E7F5EC',
          },
          {
            title: 'Queensland government information security',
            body: 'Queensland government agencies work to the state Information Security Policy, which — like the ACSC Essential Eight — expects vendor-supported, patched software. An out-of-support SQL Server version is the control that quietly fails.',
            icon: '#s-shield',
            coverColor: '#FFF1E0',
          },
          {
            title: 'One administrator, many systems',
            body: 'The common Queensland pattern outside the CBD: a capable generalist running an estate well until something needs a database specialist, with no escalation path when it does.',
            icon: '#s-consult',
            coverColor: '#F3F2F1',
          },
          {
            title: 'Weather as a continuity event',
            body: 'Queensland is the state most likely to need its continuity plan for reasons unrelated to IT. A recovery that has been tested is worth considerably more there than one that has been documented.',
            icon: '#s-cloud',
            coverColor: '#EAF1FB',
          },
        ],
      },
      whereWeAreBlock(
        'Brisbane',
        'We support Queensland organisations remotely, and we schedule in your time rather than ours.',
      ),
      sovereigntyBlock,
      {
        type: 'ctaBand',
        heading: 'Start with one Brisbane instance',
        body: 'The free 20-point health check is read-only, needs no access to your environment, and comes back as a written report within 3 business days. If the estate is healthy, we will tell you that.',
        cta: { label: 'Book the free health check', href: '/free-20-point-sql-server-health-check' },
      },
    ],
    faqs: [
      {
        question: 'Do you have an office in Brisbane?',
        answer:
          'No. Onsys is a Melbourne practice and our DBAs are in Australia. Queensland clients are supported remotely, with change windows and reporting scheduled in AEST year-round and a guaranteed response time at any hour. On-site attendance outside the Melbourne metropolitan area is arranged and quoted case by case.',
      },
      {
        question: 'Does the daylight saving difference cause problems in practice?',
        answer:
          'It causes scheduling problems rather than technical ones, and they are avoidable. We write the timezone next to every scheduled time, review schedules at both transitions, and work out the overlap explicitly where a Queensland database replicates to a southern site. SLA response times are measured as elapsed time, so the clock itself is unaffected.',
      },
      {
        question: 'We have databases at regional sites with poor connectivity. Can you still support them?',
        answer:
          'Yes, and it is worth looking at specifically. The usual finding is not that monitoring cannot reach the site, but that the backup strategy cannot — a backup that exists on the local server and could not be pulled across the link in any useful time is a backup that will not help you. We size the recovery approach against the connectivity you actually have rather than the one the design assumed.',
      },
      {
        question: 'Do you work with Queensland government agencies?',
        answer:
          'We support public sector organisations across Australia, including councils and agencies. Queensland government agencies work to the state Information Security Policy, which expects vendor-supported and patched software — so the first useful output is usually a written inventory of every instance with its version and patch level, which is exactly what the free health check produces.',
      },
      {
        question: 'What does it cost?',
        answer:
          'Plan A is $1,500 per month excluding GST for up to 10 SQL Server instances — $150 per instance — with a guaranteed two-hour response at any hour and 10 professional service hours a month. Plan B is $3,000 and Plan C is $7,500 for larger and mixed-platform estates. Every figure is published on the pricing page.',
      },
    ],
  },

  // ------------------------------------------------------------------- Perth
  {
    slug: 'sql-server-dba-perth',
    title: 'SQL Server DBA Perth',
    heading: 'SQL Server DBA services in Perth',
    eyebrow: 'AWST · two hours behind, and it matters',
    lede: 'Perth runs two hours behind the eastern states in winter and three in summer, which makes an eastern provider’s "after hours" your working afternoon. Remote SQL Server DBA cover with a response SLA measured in elapsed time, not business hours — from $1,500 a month.',
    heroImage: '/images/hero-db-managed.jpg',
    heroCtas: [
      { label: 'Free 20-point health check', href: '/free-20-point-sql-server-health-check' },
      { label: `Call ${org.phone}`, href: `tel:${org.phoneE164}` },
    ],
    seoTitle: 'SQL Server DBA Perth | Remote DBA on AWST',
    seoDescription:
      'Remote SQL Server DBA services for Perth and Western Australia. 24/7 response measured in elapsed time, not eastern business hours. Australian-only database access.',
    navOrder: 32,
    blocks: [
      {
        type: 'richText',
        html: `
<p><strong>Western Australia is on AWST, UTC+8, with no daylight saving.</strong> That puts Perth two hours behind Sydney and Melbourne for roughly half the year and three hours behind for the other half — the largest standing time difference inside Australia, and the one that does the most damage to a support arrangement designed around eastern business hours.</p>
<p>The consequences are specific. Your 8am is 10am or 11am in the east, so a problem raised first thing lands mid-morning for an eastern team. Your 3pm is their 5pm or 6pm, so anything raised in your working afternoon arrives as they are leaving. And your overnight change window sits squarely inside the eastern small hours, which is precisely where a provider running "business hours plus best efforts" has the least to offer.</p>
<p>The answer is not pretending the offset does not exist. It is a response time measured in elapsed hours under an SLA, rostered to be answered whenever the clock runs out — which is what a 24/7 plan is actually for.</p>`,
      },
      {
        type: 'checkList',
        anchor: 'timezone',
        eyebrow: 'What the offset actually costs you',
        heading: 'Why "we support Australia" is not the same as supporting Perth',
        body: 'Plenty of eastern providers list WA on the website. The question to ask is what happens at 3pm your time, and what happens during your change window.',
        items: [
          'AWST is UTC+8 with no daylight saving — two hours behind AEST, three behind AEDT',
          'A response SLA expressed in elapsed hours is unaffected by the offset; one expressed as "business hours" quietly becomes next-day cover for a Perth client raising anything after about 2pm',
          'Your overnight change window falls inside the eastern small hours, so it needs a rostered on-call engineer rather than goodwill',
          'Onsys plans guarantee a response in one to two hours depending on tier, at any hour, measured from when the alert or ticket is raised',
          'There is no major public cloud region in Western Australia — Perth workloads in Azure or AWS are almost always served from Sydney or Melbourne, which is a design constraint worth being explicit about',
          'Where latency to an eastern region is a real problem for your application, that is an architecture conversation and we will have it honestly rather than sell you a plan that cannot fix it',
        ],
        sidebar: {
          title: 'The offsets that matter',
          rows: [
            { label: 'Perth', value: 'AWST, UTC+8, all year' },
            { label: 'vs Sydney/Melbourne', value: '2 hrs behind (Apr–Oct)' },
            { label: 'vs Sydney/Melbourne', value: '3 hrs behind (Oct–Apr)' },
            { label: 'vs Brisbane', value: '2 hrs behind, all year' },
            { label: 'Nearest cloud region', value: 'Sydney or Melbourne' },
            { label: 'SLA basis', value: 'Elapsed time, 24/7' },
          ],
        },
      },
      {
        type: 'cardGrid',
        anchor: 'what-we-see',
        eyebrow: 'What we get called about in WA',
        heading: 'Resources, remote sites and systems that never stop',
        body: 'Western Australian estates are shaped by continuous operations and long distances, and the database problems follow from that.',
        centered: true,
        altBackground: true,
        columns: 3,
        cards: [
          {
            title: 'No maintenance window at all',
            body: 'Continuous operations in resources, utilities and logistics, where there is no overnight quiet period because there is no overnight. Patching becomes a high-availability design problem rather than a scheduling one.',
            icon: '#s-ha',
            coverColor: '#EAF1FB',
          },
          {
            title: 'Databases at remote sites',
            body: 'Instances at mine sites, ports and processing facilities, on connectivity that constrains the recovery strategy far more than anyone assumed when the backup job was written.',
            icon: '#s-managed',
            coverColor: '#E7F5EC',
          },
          {
            title: 'Latency to an eastern region',
            body: 'With no cloud region in WA, a Perth application talking to a database in Sydney pays for every round trip. Sometimes that is fine; sometimes it is the whole problem, and the fix is in the application’s query pattern.',
            icon: '#s-cloud',
            coverColor: '#FFF1E0',
          },
          {
            title: 'Operational technology databases',
            body: 'Historians, SCADA back-ends and plant systems on SQL Server, often owned by engineering rather than IT, and often outside whatever the corporate patching regime covers.',
            icon: '#s-consult',
            coverColor: '#F3F2F1',
          },
          {
            title: 'A DR site three hours away by clock',
            body: 'Replication to an eastern site, where the two ends disagree about what time it is for half the year and the failover has never been rehearsed against the real workload.',
            icon: '#s-emergency',
            coverColor: '#FDECEC',
          },
          {
            title: 'WA government security expectations',
            body: 'Western Australian public sector entities work to the state cyber security policy, which, like the ACSC Essential Eight, expects vendor-supported and patched software. An ageing SQL Server version is the control that fails quietly.',
            icon: '#s-shield',
            coverColor: '#EAF1FB',
          },
        ],
      },
      whereWeAreBlock(
        'Perth',
        'We support Western Australian organisations remotely under a 24/7 SLA measured in elapsed time, which is the only arrangement that survives a three-hour offset.',
      ),
      sovereigntyBlock,
      {
        type: 'ctaBand',
        heading: 'Start with one Perth instance',
        body: 'The free 20-point health check is read-only and needs no access to your environment — you run the scripts in your own time, on your own clock, and we send the written findings within 3 business days.',
        cta: { label: 'Book the free health check', href: '/free-20-point-sql-server-health-check' },
      },
    ],
    faqs: [
      {
        question: 'Do you have an office in Perth?',
        answer:
          'No. Onsys is a Melbourne practice and our DBAs are in Australia. Western Australian clients are supported remotely under a 24/7 response SLA measured in elapsed time, so the two or three hour offset does not extend the time it takes to get a DBA on your problem. On-site attendance outside the Melbourne metropolitan area is arranged and quoted case by case.',
      },
      {
        question: 'How does the time difference affect your response time?',
        answer:
          'It does not. The SLA is one to two hours depending on tier, measured from when the alert fires or the ticket is raised, 24 hours a day including weekends and public holidays. That is a rostered on-call arrangement rather than business-hours cover, which is precisely why it works across a three-hour offset. If a provider quotes you a response time in business hours, ask which business hours they mean.',
      },
      {
        question: 'Our change windows are in the middle of the night in the east. Is that a problem?',
        answer:
          'No — that is the normal case for WA clients and it is planned for rather than tolerated. Changes are scheduled in AWST, carry a tested rollback, and are staffed by the on-call roster. Where you have no maintenance window at all, which is common in continuous operations, patching becomes a high-availability design question and we will address it that way.',
      },
      {
        question: 'There is no cloud region in WA. Does that rule out Azure SQL for us?',
        answer:
          'Not usually, but it has to be a decision rather than an accident. A Perth application talking to a database in Sydney pays a latency cost on every round trip, and whether that matters depends entirely on how chatty the application is. For some workloads it is unnoticeable; for others it is the whole problem, and the fix is in the query pattern rather than the hosting. We will tell you which one you have before you commit to a migration.',
      },
      {
        question: 'What does it cost?',
        answer:
          'Plan A is $1,500 per month excluding GST for up to 10 SQL Server instances — $150 per instance — with a guaranteed two-hour response at any hour and 10 professional service hours a month. Plan B is $3,000 with a one-hour SLA and Plan C is $7,500 for larger mixed-platform estates. There is no loading for being in Western Australia.',
      },
    ],
  },

  // ---------------------------------------------------------------- Adelaide
  {
    slug: 'sql-server-dba-adelaide',
    title: 'SQL Server DBA Adelaide',
    heading: 'SQL Server DBA services in Adelaide',
    eyebrow: 'ACST · the half-hour nobody schedules for',
    lede: 'South Australia runs half an hour behind the eastern states, which is just small enough that everyone ignores it and just large enough to put a job in the wrong window. Remote SQL Server DBA cover scheduled in ACST, from $1,500 a month.',
    heroImage: '/images/hero-db-managed.jpg',
    heroCtas: [
      { label: 'Free 20-point health check', href: '/free-20-point-sql-server-health-check' },
      { label: `Call ${org.phone}`, href: `tel:${org.phoneE164}` },
    ],
    seoTitle: 'SQL Server DBA Adelaide | Remote DBA on ACST',
    seoDescription:
      'Remote SQL Server DBA services for Adelaide and South Australia. Scheduling that accounts for the ACST half-hour offset, 24/7 cover, Australian-only database access.',
    navOrder: 33,
    blocks: [
      {
        type: 'richText',
        html: `
<p><strong>South Australia is half an hour behind the eastern states — ACST at UTC+9:30, ACDT at UTC+10:30.</strong> It is the offset most likely to be quietly assumed away, because half an hour feels like a rounding error until a maintenance job starts thirty minutes into a batch run, or an agreed 11pm window turns out to have meant 11pm somewhere else.</p>
<p>Adelaide estates also tend to carry a particular obligation profile. South Australia has a concentrated defence and defence-supply-chain sector, and organisations in it frequently have to answer security questions that go beyond the usual — specifically about who holds credentials to systems, where those people are, and whether any of that can be committed contractually rather than asserted on a website.</p>
<p>Both of those are answerable. They just have to be asked about rather than assumed.</p>`,
      },
      {
        type: 'checkList',
        anchor: 'timezone',
        eyebrow: 'The half hour',
        heading: 'Scheduling that accounts for ACST',
        body: 'A thirty-minute offset is not technically difficult. It is just the one people round away, which is why it is worth being explicit about.',
        items: [
          'ACST is UTC+9:30 and ACDT is UTC+10:30 — half an hour behind the eastern states year-round, including during daylight saving',
          'Every change window, maintenance schedule and report time is written with its timezone attached rather than as a bare clock time',
          'Where an Adelaide database replicates to or from an eastern site, the overlap between the two maintenance windows is worked out in both offsets rather than assumed to be the same',
          'SQL Agent job schedules are checked against the server timezone, which in cross-state estates is frequently not the timezone the business is operating in',
          'SLA response times are measured in elapsed time, so the half hour has no effect on how quickly a DBA reaches your problem',
          'South Australia and the eastern states change daylight saving on the same dates, so unlike Queensland the offset is constant — which is easy to plan for once it is written down',
        ],
        sidebar: {
          title: 'The offsets that matter',
          rows: [
            { label: 'Adelaide', value: 'ACST UTC+9:30 / ACDT +10:30' },
            { label: 'vs Sydney/Melbourne', value: '30 min behind, all year' },
            { label: 'vs Brisbane', value: '30 min behind (Apr–Oct)' },
            { label: 'vs Perth', value: '1.5 hrs ahead (Apr–Oct)' },
            { label: 'Nearest cloud region', value: 'Melbourne or Sydney' },
            { label: 'SLA basis', value: 'Elapsed time, 24/7' },
          ],
        },
      },
      {
        type: 'cardGrid',
        anchor: 'what-we-see',
        eyebrow: 'What we get called about in South Australia',
        heading: 'Defence supply chain, health and mid-market estates',
        body: 'Adelaide estates are frequently smaller than their obligations, which is a specific and solvable problem.',
        centered: true,
        altBackground: true,
        columns: 3,
        cards: [
          {
            title: 'Security questions beyond your size',
            body: 'A defence prime or a government customer asks a supplier of forty people the same supply-chain security questions it asks an enterprise. Answering "who holds database credentials and where are they" in writing is usually the sticking point.',
            icon: '#s-shield',
            coverColor: '#EAF1FB',
          },
          {
            title: 'Patch currency as a contract condition',
            body: 'The ACSC Essential Eight expects vendor-supported, patched software, and it increasingly appears as a condition rather than a recommendation. An out-of-support SQL Server version is the control that fails first.',
            icon: '#s-ha',
            coverColor: '#E7F5EC',
          },
          {
            title: 'No DBA, and no plan to hire one',
            body: 'The common mid-market pattern: a capable systems administrator running a production estate competently until something needs a specialist, with no escalation path when it does.',
            icon: '#s-managed',
            coverColor: '#FFF1E0',
          },
          {
            title: 'A DR plan nobody has tested',
            body: 'Disaster recovery that exists on paper because testing it would mean an outage, and the test keeps being deferred. We have rebuilt exactly this for clients so the DR test runs while production stays open.',
            icon: '#s-emergency',
            coverColor: '#FDECEC',
          },
          {
            title: 'Jobs running in the wrong window',
            body: 'Server timezone, application timezone and business timezone disagreeing, so a maintenance job lands inside a batch run. Small, embarrassing, and genuinely common in cross-state estates.',
            icon: '#s-consult',
            coverColor: '#F3F2F1',
          },
          {
            title: 'Health and research databases',
            body: 'Adelaide has a dense health and research sector, where identified data frequently sits in databases administered by whoever built them. A good place to start an access review.',
            icon: '#s-code',
            coverColor: '#EAF1FB',
          },
        ],
      },
      whereWeAreBlock(
        'Adelaide',
        'We support South Australian organisations remotely, scheduled in ACST, with the access terms available in writing for the supply-chain reviews that sector tends to attract.',
      ),
      sovereigntyBlock,
      {
        type: 'ctaBand',
        heading: 'Start with one Adelaide instance',
        body: 'The free 20-point health check reports the version and patch level of the instance in writing, which is usually the first thing a supply-chain security review asks for — and it needs no access to your environment.',
        cta: { label: 'Book the free health check', href: '/free-20-point-sql-server-health-check' },
      },
    ],
    faqs: [
      {
        question: 'Do you have an office in Adelaide?',
        answer:
          'No. Onsys is a Melbourne practice and our DBAs are in Australia. South Australian clients are supported remotely, scheduled in ACST, with a guaranteed response time at any hour. On-site attendance outside the Melbourne metropolitan area is arranged and quoted case by case.',
      },
      {
        question: 'Can you put the database access terms into our contract?',
        answer:
          'Yes, and we encourage it — a commitment that lives only on a website is a marketing claim. Database access is held by Onsys DBAs based in Australia only, no offshore engineer holds credentials to a client database on any plan, access is through named accounts with session logging, and it is revoked the day an engagement ends. Raise it during scoping and all of that is written into the agreement you sign.',
      },
      {
        question: 'We supply into the defence sector. Can you support our security questionnaire?',
        answer:
          'We can answer the parts that concern us: who holds credentials to your database environment, where those people are, how access is granted and logged, and how it is revoked. We provide the current access list on request at any point in the engagement. We are a service provider rather than your assurance function — we supply the evidence and your team makes the attestation.',
      },
      {
        question: 'Does the half-hour time difference cause real problems?',
        answer:
          'It causes scheduling mistakes rather than technical ones. The two we see most are a maintenance job starting thirty minutes into a batch run, and a SQL Agent schedule set against a server timezone that is not the one the business operates in. Both are trivial to fix once someone has written down which clock each system is on, which is part of the initial assessment.',
      },
      {
        question: 'What does it cost?',
        answer:
          'Plan A is $1,500 per month excluding GST for up to 10 SQL Server instances — $150 per instance — with a guaranteed two-hour response at any hour and 10 professional service hours a month. Plan B is $3,000 and Plan C is $7,500 for larger and mixed-platform estates. Ad-hoc consultancy is $150 per hour with a four-hour minimum.',
      },
    ],
  },

  // ---------------------------------------------------------------- Auckland
  {
    slug: 'sql-server-dba-auckland',
    title: 'SQL Server DBA Auckland',
    heading: 'SQL Server DBA services in Auckland',
    eyebrow: 'New Zealand · two hours ahead · NZ Privacy Act 2020',
    lede: 'Auckland runs two hours ahead of Melbourne, which means your morning is covered before the Australian market opens. Remote SQL Server DBA cover for New Zealand organisations, with the privacy and sovereignty questions answered up front.',
    heroImage: '/images/hero-db-managed.jpg',
    heroCtas: [
      { label: 'Free 20-point health check', href: '/free-20-point-sql-server-health-check' },
      { label: `Call ${org.phone}`, href: `tel:${org.phoneE164}` },
    ],
    seoTitle: 'SQL Server DBA Auckland | Remote DBA for New Zealand',
    seoDescription:
      'Remote SQL Server DBA services for Auckland and New Zealand. 24/7 cover two hours ahead of Melbourne, NZ Privacy Act 2020 considerations, published AUD pricing.',
    navOrder: 34,
    blocks: [
      {
        type: 'richText',
        html: `
<p><strong>Auckland is two hours ahead of Melbourne, consistently.</strong> New Zealand and Australia both observe daylight saving and the offset holds at two hours through most of the year, widening to three for about a week each spring when New Zealand changes first. Practically, that means a New Zealand morning incident is raised into an Australian team that is already rostered on, and a New Zealand overnight change window sits in the small hours of both countries.</p>
<p>The harder question for a New Zealand organisation is not the clock. It is the one about jurisdiction: a New Zealand agency or regulated business has to be able to say where its data sits, who can reach it, and under whose law that arrangement operates. Those are fair questions and they deserve a direct answer rather than a reassurance.</p>`,
      },
      {
        type: 'checkList',
        anchor: 'jurisdiction',
        eyebrow: 'The questions a New Zealand buyer should ask',
        heading: 'Jurisdiction, privacy and where your data actually sits',
        body: 'We would rather set these out plainly than have them surface during a procurement. Some of the answers will suit you and some may not.',
        items: [
          'Onsys is an Australian company with an Australian head office, so an engagement is contracted under Australian law unless your procurement requires otherwise — raise it during scoping',
          'The New Zealand Privacy Act 2020 governs your handling of personal information, including a notifiable privacy breach regime and specific obligations when information is disclosed to an overseas party — these differ from the Australian scheme and your privacy officer should be across them',
          'Your data stays where you host it. We administer the database; we do not move it, and nothing in a support engagement requires it to leave the country it is in',
          'Azure and AWS both operate regions in New Zealand now — if data residency is a requirement, confirm current service availability for your specific workload, because not every service lands in a new region immediately',
          'Database access is held by Onsys DBAs based in Australia and only by them; no offshore engineer holds credentials to a client database on any plan',
          'If your policy requires New Zealand-resident-only access, say so during scoping and we will tell you plainly that we cannot meet it rather than find a way to word around it',
        ],
        sidebar: {
          title: 'The practical facts',
          rows: [
            { label: 'Auckland vs Melbourne', value: '2 hours ahead' },
            { label: 'Cover', value: '24/7, every plan' },
            { label: 'Database access', value: 'Australian-based DBAs only' },
            { label: 'Contract', value: 'Australian entity, ABN held' },
            { label: 'Pricing', value: 'Published in AUD' },
            { label: 'Phone', value: org.phone },
          ],
        },
      },
      {
        type: 'cardGrid',
        anchor: 'what-we-see',
        eyebrow: 'What we get called about in New Zealand',
        heading: 'A smaller market with the same database problems',
        body: 'New Zealand estates run the same platforms as Australian ones. What differs is the depth of the local specialist pool, which is the gap we are usually filling.',
        centered: true,
        altBackground: true,
        columns: 3,
        cards: [
          {
            title: 'A thin local specialist market',
            body: 'Plenty of capable infrastructure teams, far fewer dedicated DBAs — and the ones who exist are already employed. Hiring is slow and expensive; an escalation path is neither.',
            icon: '#s-managed',
            coverColor: '#EAF1FB',
          },
          {
            title: 'One person holding the estate',
            body: 'The single-point-of-failure pattern, which in a smaller market is harder to solve by hiring. Leave cover and after-hours response are usually what is actually being bought.',
            icon: '#s-consult',
            coverColor: '#E7F5EC',
          },
          {
            title: 'Cloud migration decisions',
            body: 'With cloud regions now available in New Zealand, estates that stayed on-premises for residency reasons are reopening the question. Whether to move, and to what, is a different answer per application.',
            icon: '#s-cloud',
            coverColor: '#FFF1E0',
          },
          {
            title: 'Trans-Tasman estates',
            body: 'Organisations operating both sides of the Tasman, with databases in two countries, two privacy regimes and two sets of residency expectations. The seam between them is where the work is.',
            icon: '#s-ha',
            coverColor: '#F3F2F1',
          },
          {
            title: 'Out-of-support versions',
            body: 'SQL Server 2016 is already past its end of support and 2017 ends in October 2027. Both show up in New Zealand estates as readily as Australian ones, and both fail a patch-currency control.',
            icon: '#s-shield',
            coverColor: '#FDECEC',
          },
          {
            title: 'Recovery that has never been tested',
            body: 'Backups that run nightly and have never been restored. The most common finding we make anywhere, and the one that costs the most when it is left.',
            icon: '#s-emergency',
            coverColor: '#EAF1FB',
          },
        ],
      },
      {
        type: 'relatedService',
        eyebrow: 'Looking wider than Auckland?',
        heading: 'Database support across New Zealand',
        body: 'This page is about Auckland specifically. If you are in Wellington, Christchurch or anywhere else in New Zealand, the national page covers the same service with the market context set out for the country as a whole.',
        cta: { label: 'New Zealand database support', href: '/database-support-new-zealand' },
      },
      whereWeAreBlock(
        'Auckland',
        'We support New Zealand organisations remotely from Australia, two hours behind you, under a 24/7 SLA — and we would rather state the jurisdiction plainly than let a city page imply a local presence.',
      ),
      sovereigntyBlock,
      {
        type: 'ctaBand',
        heading: 'Start with one Auckland instance',
        body: 'The free 20-point health check is read-only, requires no access to your environment and no data to leave New Zealand — you run the scripts and send us the output. Written report within 3 business days.',
        cta: { label: 'Book the free health check', href: '/free-20-point-sql-server-health-check' },
      },
    ],
    faqs: [
      {
        question: 'Do you have an office in Auckland?',
        answer:
          'No. Onsys is an Australian company with a Melbourne head office, and our DBAs are in Australia. New Zealand clients are supported remotely under a 24/7 response SLA. Auckland is two hours ahead of Melbourne, so your morning is covered by a team already rostered on. We would rather say that plainly than let a city page imply a local presence.',
      },
      {
        question: 'Does our data have to leave New Zealand?',
        answer:
          'No. Your data stays where you host it — we administer the database remotely and nothing in a support engagement requires the data to move. The free health check requires no access at all: you run read-only scripts and send us the output, so you control exactly what is shared. If you have a formal data residency requirement, raise it during scoping and we will address it in writing.',
      },
      {
        question: 'How does the New Zealand Privacy Act 2020 affect an arrangement like this?',
        answer:
          'It governs how you handle personal information, including a notifiable privacy breach regime and specific obligations around disclosing personal information to an overseas party — and those differ from the Australian scheme, so your privacy officer should form their own view rather than rely on ours. What we can tell you is the factual basis they need: who holds credentials, where they are, how access is logged and when it is revoked. All of it can go into the agreement.',
      },
      {
        question: 'Is your pricing in New Zealand dollars?',
        answer:
          'Not currently. Plans are published in Australian dollars — Plan A at $1,500 a month, Plan B at $3,000, Plan C at $7,500, all excluding GST — and that is what a New Zealand engagement is quoted and invoiced in today. We will tell you the figure in AUD rather than converting it to a number that moves. If NZD pricing matters to your procurement, raise it and we will give you a straight answer.',
      },
      {
        question: 'Can you meet a New Zealand-resident-only access requirement?',
        answer:
          'No, and we will say so rather than word around it. Our DBAs are based in Australia, which is where every login to a client database instance is made from. If your policy requires New Zealand-resident access specifically, we are not the right provider for that engagement — and you should ask any provider who says otherwise exactly where their engineers sit.',
      },
    ],
  },
];
