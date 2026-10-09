import type { Block } from '@onsys/shared';
import { org } from '../lib/env';
import type { SeedPage } from './seed-content';

/**
 * SQL Server 2017 end of support.
 *
 * Same structure as the 2016 page, deliberately a different argument. 2016 is a
 * page about a deadline that has already passed, so it is written to surface an
 * exposure that exists today. 2017 ends on 12 October 2027 — about a year out
 * from this page going live — so it is written to produce a plan, which is the
 * only thing anyone can actually buy twelve months ahead.
 *
 * Dates are Microsoft's published lifecycle. ESU pricing is deliberately not
 * stated as a figure: ESU terms change, and a wrong number on a page like this
 * is exactly the one a prospect checks.
 */
const sqlServer2017Blocks: Block[] = [
  {
    type: 'richText',
    html: `
<p><strong>Extended support for SQL Server 2017 ends on 12 October 2027.</strong> After that date the instance keeps running and stops receiving security updates — the same quiet exposure that caught estates still sitting on 2016. The difference is that you are reading this with time left, which makes it a planning problem rather than an incident.</p>
<p>Twelve months sounds like plenty. It is roughly one budget cycle, one round of application vendor certification and one end-of-year change freeze. Most upgrades that miss the date miss it because the application testing started late, not because the database move was hard.</p>`,
  },
  {
    type: 'stats',
    eyebrow: 'The dates that matter',
    heading: 'Where SQL Server 2017 sits in its lifecycle',
    stats: [
      { value: '2 Oct 2017', label: 'Released' },
      { value: '11 Oct 2022', label: 'Mainstream support ended' },
      { value: '12 Oct 2027', label: 'Extended support ends' },
      { value: 'Up to 3 yrs', label: 'Extended Security Updates after that' },
    ],
  },
  {
    type: 'checkList',
    anchor: 'what-it-means',
    eyebrow: 'What changes on the day',
    heading: 'What ending support actually means',
    body: 'Nothing breaks on 12 October 2027. That is precisely why this gets deferred — the cost of waiting stays invisible until the week it is not.',
    items: [
      'No security updates, so any vulnerability disclosed after that date stays unpatched in production',
      'No bug fixes, and no Microsoft support case you can raise when something goes wrong',
      'A patch-currency finding against the ACSC Essential Eight, which expects vendor-supported software',
      'Questions from auditors, insurers and enterprise customers reviewing your supply chain',
      'Compatibility drift as drivers, tooling and cloud services drop support for older versions',
      'A shrinking pool of engineers who have worked on it recently, which raises the cost of the upgrade the longer it waits',
    ],
    sidebar: {
      title: 'Verify it yourself',
      rows: [
        { label: 'Source', value: 'Microsoft Lifecycle' },
        { label: 'Mainstream end', value: '11 October 2022' },
        { label: 'Extended end', value: '12 October 2027' },
        { label: 'Required level', value: 'Current cumulative update' },
        { label: 'ESUs', value: 'Up to three further years' },
      ],
    },
  },
  {
    type: 'cardGrid',
    anchor: 'options',
    eyebrow: 'Your options',
    heading: 'Three routes, and the honest trade-off in each',
    body: 'Which one is right depends on the application sitting on top, not on the database. We assess that before recommending anything.',
    centered: true,
    altBackground: true,
    columns: 3,
    cards: [
      {
        title: 'Upgrade in place',
        body: 'Move to SQL Server 2022 on the same or new hardware. Usually the cheapest outcome over three years and the one your team already knows how to operate — but it needs application compatibility testing, which is the work most plans underestimate.',
        tag: 'Usually best',
        coverColor: '#E7F5EC',
        icon: '#s-ha',
      },
      {
        title: 'Move to Azure SQL Managed Instance',
        body: 'Ends the version treadmill, because Microsoft patches the platform and there is no next end-of-support date to diarise. The right fit when the application tolerates a small set of T-SQL differences and you would rather not do this again in five years.',
        tag: 'No more upgrades',
        coverColor: '#EAF1FB',
        icon: '#s-cloud',
      },
      {
        title: 'Buy Extended Security Updates',
        body: 'Keeps security patches arriving for up to three further years. A bridge with a dated end, not a destination: the cost rises each year and the version keeps ageing. Sensible when a migration is genuinely planned; expensive when it is a way of not deciding. Confirm current pricing and eligibility with your licensing partner.',
        tag: 'Buys time',
        coverColor: '#FFF1E0',
        icon: '#s-shield',
      },
    ],
  },
  {
    type: 'steps',
    anchor: 'how-we-help',
    eyebrow: 'How we help',
    heading: 'What a year of lead time actually buys you',
    body: 'Most failed upgrades fail on application compatibility, not on the database move. With twelve months you can test that properly instead of discovering it inside a change window.',
    steps: [
      {
        title: 'Now — assess what you are running',
        body: 'Every SQL Server instance, its version, edition, patch level and the applications depending on it. Our free 20-point health check covers one instance and gives you the written baseline to plan against.',
      },
      {
        title: 'Next — get the vendors on record',
        body: 'Each application vendor confirms in writing which SQL Server version they certify. This is the step that slips, and it is the one that decides whether you are running an upgrade or a negotiation.',
      },
      {
        title: 'Then — test compatibility',
        body: 'Database Experimentation Assistant and compatibility level testing against a restored copy, so the surprises happen in a test environment rather than on the night.',
      },
      {
        title: 'Finally — move, with a rollback',
        body: 'An agreed change window, a tested rollback, and verification against the baseline from step one — so "it worked" is a measurement rather than an opinion.',
      },
    ],
  },
  {
    type: 'relatedService',
    eyebrow: 'Still on 2016 as well?',
    heading: 'SQL Server 2016 support has already ended',
    body: 'Extended support for SQL Server 2016 ended on 15 July 2026. If your estate runs both, 2016 is the exposure that exists today and 2017 is the one you can still plan for calmly. Most estates we assess have a mix.',
    cta: { label: 'SQL Server 2016 end of support', href: '/sql-server-2016-end-of-support' },
  },
  {
    type: 'ctaBand',
    heading: 'Running SQL Server 2017?',
    body: 'Start with the free 20-point health check. It tells you the patch level, the edition and what depends on the instance — which is what any upgrade decision needs before a budget can be written for it.',
    cta: { label: 'Book the free health check', href: '/free-20-point-sql-server-health-check' },
  },
];

export const sqlServer2017Pages: SeedPage[] = [
  {
    slug: 'sql-server-2017-end-of-support',
    title: 'SQL Server 2017 End of Support',
    heading: 'SQL Server 2017 end of support',
    eyebrow: 'Support ends 12 October 2027',
    lede: 'Extended support for SQL Server 2017 ends on 12 October 2027. Nothing breaks that day — security updates simply stop, and every vulnerability found afterwards stays open. Here is the timeline, your three options, and what a year of lead time is worth.',
    heroImage: '/images/hero-db-upgrade.jpg',
    heroCtas: [
      { label: 'Free 20-point health check', href: '/free-20-point-sql-server-health-check' },
      { label: `Call ${org.phone}`, href: `tel:${org.phoneE164}` },
    ],
    seoTitle: 'SQL Server 2017 End of Support | 12 October 2027',
    seoDescription:
      'SQL Server 2017 extended support ends 12 October 2027. What it means for security and Essential Eight patch currency, your three options, and how to plan the upgrade.',
    navOrder: 9,
    blocks: sqlServer2017Blocks,
    faqs: [
      {
        question: 'When does SQL Server 2017 support end?',
        answer:
          'Mainstream support ended on 11 October 2022 and extended support ends on 12 October 2027, according to Microsoft’s published lifecycle. To stay in support up to that date the instance needs to be on a current cumulative update. Extended Security Updates are available for up to three further years after that.',
      },
      {
        question: 'What happens if we keep running SQL Server 2017 after that date?',
        answer:
          'The instance keeps working — nothing stops on the day, which is exactly what makes this easy to defer. What stops is security updates, so any vulnerability disclosed after 12 October 2027 stays unpatched. You also lose the ability to raise a Microsoft support case, and you will fail patch-currency expectations under the ACSC Essential Eight and most enterprise supply-chain reviews.',
      },
      {
        question: 'We have a year. Is that enough time to upgrade?',
        answer:
          'Comfortably, if the application work starts now. A year is roughly one budget cycle plus one vendor certification round plus one change freeze. The database migration itself is usually a single change window; the time goes on confirming which SQL Server version each application vendor certifies, and on testing against a restored copy. Upgrades that miss the date almost always miss it because that started late.',
      },
      {
        question: 'Should we upgrade to SQL Server 2022 or move to Azure SQL Managed Instance?',
        answer:
          'It depends on the application, not the database. Upgrading in place is usually cheapest over three years and keeps everything familiar to your team. Azure SQL Managed Instance ends the upgrade treadmill permanently because Microsoft patches the platform, but it needs the application to tolerate a small set of T-SQL differences. We test compatibility before recommending either, rather than after.',
      },
      {
        question: 'What are Extended Security Updates and should we buy them?',
        answer:
          'ESUs are paid security patches that continue after extended support ends, for up to three further years. They are a bridge, not a destination — the cost rises each year and the version keeps ageing. They make sense when a migration is genuinely planned and dated, and they are expensive when used to avoid making the decision. Confirm current pricing and eligibility with your licensing partner, because ESU terms change.',
      },
      {
        question: 'Can you upgrade SQL Server without downtime?',
        answer:
          'Near-zero downtime is achievable using Always On availability groups or log shipping — moving the workload to the upgraded instance and cutting over. Whether that is worth the extra complexity depends on what an hour of downtime actually costs you, and we will tell you honestly when it is not.',
      },
      {
        question: 'Who would do the work?',
        answer:
          'Onsys consultants based in Australia. Database work is Australian-only: every login to a client database instance is made by an Australian-based Onsys DBA, and no offshore engineer holds credentials to a client database. Upgrades run as fixed-price projects, scoped after the assessment so the price reflects your estate rather than an assumption about it.',
      },
    ],
  },
];
