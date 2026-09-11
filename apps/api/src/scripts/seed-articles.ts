/**
 * Editorial articles, authored here rather than imported.
 *
 * These exist to answer queries the SEO audit found returning nothing useful,
 * and to give the service pages something to link from. Lifecycle dates were
 * taken from Microsoft's own lifecycle pages on 11 September 2026 rather than
 * from memory — the previous round of this work had a date wrong by a year,
 * and on a page whose whole value is the date, that is the only thing that
 * matters.
 *
 * Every price quoted matches the pricing page. When a plan price changes, these
 * change with it or they become a liability.
 */

export interface ArticleSeed {
  slug: string;
  title: string;
  excerpt: string;
  bodyHtml: string;
  seoTitle: string;
  seoDescription: string;
  readMinutes: number;
  /** Category slug; must exist in the seed's category list. */
  category: string;
  faqs: Array<{ question: string; answer: string }>;
}

export const articles: ArticleSeed[] = [
  // -------------------------------------------------------------------------
  // 1. Supporting article for /sql-server-2016-end-of-support.
  //
  // The service page owns "sql server 2016 end of support". This deliberately
  // does not: it targets the decision that follows, and links to the page, so
  // the two support each other instead of competing for one query.
  // -------------------------------------------------------------------------
  {
    slug: 'sql-server-2016-out-of-support-what-to-do',
    title: 'SQL Server 2016 Is Out of Support: What Australian Organisations Should Do Now',
    excerpt:
      'Extended support for SQL Server 2016 ended on 15 July 2026. Here are the four options actually open to an Australian organisation still running it, what each one costs, and how to decide between them.',
    seoTitle: 'SQL Server 2016 Out of Support: Your Options in 2026',
    seoDescription:
      'SQL Server 2016 support ended 15 July 2026. The four options open to Australian organisations still running it — ESU, upgrade, Azure SQL MI or accept the risk.',
    readMinutes: 8,
    category: 'database',
    bodyHtml: `
<p>Extended support for SQL Server 2016 ended on <strong>15 July 2026</strong>. If you are reading this in the months after that date with instances still running it, you are not unusual and you are not out of options — but the options have narrowed, and one of them now costs money it did not cost before.</p>

<p>This article is about the decision. If you want the detail of what end of support means and how to inventory your estate, the <a href="/sql-server-2016-end-of-support">SQL Server 2016 end of support page</a> covers that.</p>

<h2>What actually changed on 15 July 2026</h2>

<p>One thing: Microsoft stopped shipping security updates. Nothing broke. Your instances did not stop working, no licence expired, and no feature switched off. That is precisely what makes this risk easy to defer — there is no outage to force the issue.</p>

<p>What accumulates instead is unpatched vulnerabilities. Every SQL Server vulnerability disclosed after that date stays open on a 2016 instance permanently. The exposure compounds rather than sitting still, and it does so quietly.</p>

<p>For most Australian organisations the sharper edge is not technical. It is the contractual and regulatory one: an unsupported database engine holding personal information is difficult to defend under the Privacy Act's security requirements, and for APRA-regulated entities, CPS 234 asks you to maintain information security capability commensurate with the threat. Insurers and enterprise customers increasingly ask the question directly in due-diligence questionnaires. Being the vendor who has to answer "no, it is unsupported" is a commercial problem before it is a security one.</p>

<h2>Option 1: Extended Security Updates</h2>

<p>This is the option most organisations do not realise they have. Microsoft sells Extended Security Updates for SQL Server 2016 in yearly blocks, and the schedule runs further than most people expect:</p>

<ul>
  <li><strong>ESU Year 1</strong> — 15 July 2026 to 13 July 2027</li>
  <li><strong>ESU Year 2</strong> — 14 July 2027 to 18 July 2028</li>
  <li><strong>ESU Year 3</strong> — 19 July 2028 to 17 July 2029</li>
</ul>

<p>ESU delivers security updates rated Critical and Important. It does not include feature updates, and it does not include general technical support for problems unrelated to those patches.</p>

<p>It is worth being honest about what ESU is for. It is a bridge, not a destination — it buys a planned migration the time to be planned properly rather than done badly over a weekend. Three years sounds generous, and organisations that treat it as three years of not thinking about the problem arrive at July 2029 in exactly the same position with fewer options and no further extensions.</p>

<p>ESU is free for SQL Server 2016 instances running in Azure — on Azure Virtual Machines, Azure VMware Solution or Azure Stack. That asymmetry is deliberate on Microsoft's part, and it changes the arithmetic for anyone already part-way to Azure.</p>

<h2>Option 2: Upgrade in place, or side by side</h2>

<p>The obvious answer, and usually the right one. The question is which version, and the answer is less obvious than it looks.</p>

<p><strong>SQL Server 2022</strong> is supported until <strong>12 January 2033</strong>, with mainstream support running to 12 January 2028. That is the longest runway available on a released version and the default recommendation for most estates.</p>

<p><strong>SQL Server 2019</strong> is still supported until <strong>9 January 2030</strong> — but its mainstream support ended on <strong>1 March 2025</strong>, so it is already in extended support today. It receives security updates and nothing else: no feature updates, no design changes, no free support incidents. Choosing 2019 in 2026 means deliberately landing on a version that is already past half its life. It is occasionally the right call when a third-party application is certified against 2019 and not 2022, and it is rarely the right call for any other reason.</p>

<p>The work itself is rarely the engine upgrade. On the estates we review, the effort sits in three places: deprecated features that a 2016-era application still uses, compatibility level changes that alter the query optimiser's behaviour and therefore your execution plans, and third-party software whose vendor support matrix has not kept up. None of those are discovered on cutover night if the project includes a dry run against a copy of production, and all three are discovered on cutover night if it does not.</p>

<h2>Option 3: Move to a managed platform</h2>

<p>If you are going to touch every instance anyway, it is a reasonable moment to ask whether you should still be patching database servers at all.</p>

<p><strong>Azure SQL Managed Instance</strong> is the closest managed equivalent to a SQL Server instance — it keeps SQL Agent, cross-database queries, linked servers and the instance-level surface that a lift from 2016 usually depends on. It is evergreen, so the end-of-support conversation does not recur.</p>

<p><strong>Azure SQL Database</strong> is a smaller unit and a bigger change: no SQL Agent, no cross-database queries, and application changes that a 2016-era codebase will feel. It suits a single application database and suits a consolidated estate poorly.</p>

<p>The honest caveat is that a managed platform moves cost from capital to operating expenditure and from licences to a monthly bill. That is an improvement for some organisations and a budgeting problem for others. It is worth modelling before it is worth deciding.</p>

<h2>Option 4: Accept the risk, in writing</h2>

<p>Sometimes the instance is a reporting copy behind three firewalls, holds nothing personal, and is scheduled for decommission in six months. Spending a migration budget on it would be poor judgement.</p>

<p>If that is the call, make it a decision rather than a drift. Write it down, name the compensating controls — network isolation, restricted authentication, monitoring — put a review date on it, and have someone accountable sign it. A documented risk acceptance is a defensible position. An undocumented one is indistinguishable from not having noticed, which is the position you least want to be in if the question is ever asked by a regulator, an insurer or a customer.</p>

<h2>How to decide</h2>

<p>The decision is usually made per instance rather than per estate, and it turns on three questions:</p>

<ol>
  <li><strong>What does this instance hold?</strong> Personal information, payment data or anything contractually protected moves the instance to the front of the queue regardless of how convenient it is to leave alone.</li>
  <li><strong>What can reach it?</strong> An instance reachable from an application that is reachable from the internet is a different risk from one on an isolated management network.</li>
  <li><strong>What does the application vendor support?</strong> This constrains the answer more often than anything technical, and it is the question that most often turns a simple upgrade into a project.</li>
</ol>

<p>Most estates end up with a mix: a handful of instances upgraded quickly, a few covered by ESU while a larger application project runs, and one or two documented as accepted risk pending decommission. A plan that puts every instance in the same bucket is usually a plan that has not been tested against the estate.</p>

<h2>Where to start</h2>

<p>Start with an inventory, because almost nobody has an accurate one. You need version and build per instance, what each database supports, who can reach it, and what the application vendor certifies. Our <a href="/free-20-point-sql-server-health-check">free 20-point health check</a> produces most of that for one instance from scripts you can read before you run them, and you keep the output whether or not you engage us.</p>

<p>If you would rather talk it through, our consultants are in Australia and so is every DBA who would touch your instances. <a href="/contact">Ask us what your options look like</a> — including when the answer is that you have less to do than you feared.</p>
`,
    faqs: [
      {
        question: 'When did SQL Server 2016 support end?',
        answer:
          'Extended support for SQL Server 2016 ended on 15 July 2026. Mainstream support had ended earlier, on 14 July 2021. After 15 July 2026 Microsoft no longer ships security updates for SQL Server 2016 unless the instance is covered by Extended Security Updates.',
      },
      {
        question: 'Can I still get security updates for SQL Server 2016?',
        answer:
          'Yes, through Extended Security Updates, which Microsoft sells in yearly blocks: Year 1 runs to 13 July 2027, Year 2 to 18 July 2028 and Year 3 to 17 July 2029. ESU covers updates rated Critical and Important only — no feature updates and no general technical support. It is free for SQL Server 2016 instances running on Azure Virtual Machines, Azure VMware Solution or Azure Stack.',
      },
      {
        question: 'Should we upgrade to SQL Server 2019 or 2022?',
        answer:
          'SQL Server 2022 for almost every estate. It is supported until 12 January 2033 and its mainstream support runs to 12 January 2028. SQL Server 2019 is supported until 9 January 2030, but its mainstream support already ended on 1 March 2025, so choosing it in 2026 means landing on a version that is already past half its life. The usual reason to pick 2019 anyway is a third-party application certified against it and not against 2022.',
      },
      {
        question: 'What actually breaks when you upgrade from SQL Server 2016?',
        answer:
          'Rarely the engine. The effort is usually in three places: deprecated features a 2016-era application still relies on, compatibility level changes that alter query optimiser behaviour and therefore execution plans, and third-party software whose vendor support matrix has not kept pace. A dry run against a copy of production finds all three before cutover night; skipping it finds them during.',
      },
      {
        question: 'Is running SQL Server 2016 a compliance problem in Australia?',
        answer:
          'It can be. An unsupported database engine holding personal information is hard to defend under the Privacy Act’s security requirements, and APRA-regulated entities are expected under CPS 234 to maintain information security capability commensurate with the threat. In practice the question usually arrives commercially first, in an insurer’s or enterprise customer’s due-diligence questionnaire.',
      },
      {
        question: 'What if we cannot migrate before the risk becomes unacceptable?',
        answer:
          'Buy time deliberately rather than by default. Extended Security Updates keep security patches flowing while a proper migration is planned, and for instances that genuinely do not warrant the spend, a written risk acceptance naming the compensating controls and a review date is a defensible position. An undocumented decision to do nothing is not.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 2. Cost article. Onsys already sits at #8 for this query; the page it needs
  //    is one that answers the question directly and shows the arithmetic.
  // -------------------------------------------------------------------------
  {
    slug: 'sql-server-dba-support-cost-australia',
    title: 'What Does SQL Server DBA Support Cost in Australia in 2026?',
    excerpt:
      'Published rates, what each model actually includes, and the per-instance arithmetic that decides whether a quote is good value — including why the cheaper headline number is often the more expensive one.',
    seoTitle: 'SQL Server DBA Support Cost in Australia (2026)',
    seoDescription:
      'SQL Server DBA support costs in Australia: plans from $1,500/month, on-call from $100 per instance, consultancy $150/hour — and how to compare quotes properly.',
    readMinutes: 7,
    category: 'database',
    bodyHtml: `
<p>Most providers will not give you a number without a discovery call. This article gives you ours, explains what sits behind each one, and shows the arithmetic that decides whether any quote — ours or anyone else's — is actually good value.</p>

<p>All figures are in Australian dollars and exclude GST.</p>

<h2>The short answer</h2>

<table>
  <thead>
    <tr><th>Model</th><th>Price</th><th>Suits</th></tr>
  </thead>
  <tbody>
    <tr><td>Monthly DBA plan</td><td>From <strong>$1,500/month</strong></td><td>Production estates with no in-house DBA</td></tr>
    <tr><td>On-call / standby</td><td><strong>$100</strong> per instance per month, plus $150/hour for calls</td><td>Teams who run it themselves and want a safety net</td></tr>
    <tr><td>Consultancy</td><td><strong>$150/hour</strong>, four-hour minimum</td><td>A specific problem with a defined end</td></tr>
    <tr><td>Fixed-price project</td><td>Quoted per project</td><td>Migrations, upgrades, HA builds</td></tr>
  </tbody>
</table>

<h2>Monthly plans, and the number that matters</h2>

<p>Our entry plan is <strong>$1,500 a month for up to 10 SQL Server instances</strong>. That is the headline figure. The number that actually matters is the one underneath it: <strong>$150 per instance per month</strong>.</p>

<p>This is where most comparisons go wrong. A competitor advertising $999 a month looks 33% cheaper until you read what it covers. If that plan covers three instances, it is $333 per instance — more than double. The bigger headline number is less than half the price per instance.</p>

<p>So the first thing to do with any quote is divide. Price, divided by instances covered. If a provider will not tell you the instance count the price assumes, that is itself the answer to a different question.</p>

<p>Our three plans:</p>

<ul>
  <li><strong>$1,500/month</strong> — up to 10 SQL Server instances, 5 TB, two-hour response SLA, 10 professional service hours a month, monthly health check.</li>
  <li><strong>$3,000/month</strong> — adds 4 MySQL or PostgreSQL instances and 20 TB, one-hour SLA, 20 service hours, automated alerting configured.</li>
  <li><strong>$7,500/month</strong> — 20 SQL Server, 4 MySQL/PostgreSQL and 6 Oracle instances, 50 TB, one-hour SLA, 50 service hours, daily health checks.</li>
</ul>

<p>Every plan includes 24/7/365 monitoring and remote support. Service hours beyond the monthly allocation are $140 an hour, agreed with you before the work starts rather than discovered on an invoice.</p>

<h2>What to check before comparing two numbers</h2>

<p>Three things separate quotes that look identical.</p>

<h3>What the response SLA measures</h3>

<p>A response SLA that starts when a human notices the alert is not a response SLA. Ours starts when the alert fires. The difference is invisible in a proposal and extremely visible at 3am. Ask any provider explicitly: what event starts the clock?</p>

<h3>Whether service hours are included</h3>

<p>A plan that covers monitoring but bills every remediation hour separately is a monitoring contract, not a support contract. Our plans include a block of professional service hours — 10, 20 or 50 a month depending on the plan — so routine work is covered rather than itemised.</p>

<h3>Who actually holds the credentials</h3>

<p>This is the one most buyers do not think to ask until procurement asks it for them. Database access at Onsys is held by our consultants in Australia, and only by them — <a href="/who-can-access-your-database">no offshore engineer holds credentials to a client database</a>, on every plan, by default, not as a paid upgrade. Some providers price an onshore-only guarantee as a premium tier. It is worth knowing which kind of quote you are holding.</p>

<h2>When an hourly engagement is cheaper</h2>

<p>A monthly plan is not automatically the right answer. Consultancy is <strong>$150 an hour with a four-hour minimum</strong>, billed in 30-minute increments, and it is the better model when the work has an end: a performance problem to diagnose, a migration to plan, a second opinion on someone else's design.</p>

<p>The rough crossover is around ten hours a month. Below that, hourly usually wins. Above it, you are paying plan money for hourly service and getting no SLA, no monitoring and no included hours for it.</p>

<p>On-call cover sits between the two: <strong>$100 per instance per month</strong> holds a two-hour response SLA around the clock, and calls are $150 an hour when you make them. A quiet month costs almost nothing. It suits a team that runs the databases day to day and wants someone to ring when something is genuinely wrong.</p>

<h2>What drives a project quote</h2>

<p>Projects — migrations, upgrades, high availability builds — are quoted as a single fixed price against written acceptance criteria, with milestone payments, so there is no cost-overrun risk. What moves the number is rarely the database work:</p>

<ul>
  <li><strong>Instance and database count.</strong> Linear, and the easiest thing to scope.</li>
  <li><strong>Application coupling.</strong> A database behind one application is a different project from one behind nine, with linked servers between them.</li>
  <li><strong>Downtime tolerance.</strong> A four-hour window is a different design from a four-minute one, and the difference is most of the cost.</li>
  <li><strong>Change control.</strong> An organisation with a weekly CAB and a formal test sign-off is not slower to work with, but it is more work to plan for.</li>
</ul>

<p>Where scope genuinely cannot be defined up front, we say so and work hourly rather than quoting a number we would have to revise later.</p>

<h2>What a fair quote looks like</h2>

<p>You should be able to read a quote and answer all of these without ringing anyone:</p>

<ol>
  <li>How many instances does this price cover, and what happens when we add one?</li>
  <li>What event starts the response SLA clock?</li>
  <li>How many hours are included, and what is the rate beyond them?</li>
  <li>Who holds credentials to our databases, and where are they?</li>
  <li>What is the term, and what happens if we leave?</li>
</ol>

<p>Ours run month to month with no lock-in. <a href="/pricing-and-plans">Full pricing is published</a> rather than quoted on request, and a <a href="/free-20-point-sql-server-health-check">free 20-point health check</a> will tell you what your estate actually needs before you commit to anything — including when the answer is that you do not need us yet.</p>
`,
    faqs: [
      {
        question: 'How much does SQL Server DBA support cost in Australia?',
        answer:
          'Onsys monthly plans start at $1,500 per month excluding GST for up to 10 SQL Server instances and 5 TB — $150 per instance per month. On-call standby cover is $100 per instance per month plus $150 per hour for calls actually made. Ad-hoc consultancy is $150 per hour with a four-hour minimum. Projects are quoted as a fixed price against written acceptance criteria.',
      },
      {
        question: 'Why is a cheaper monthly plan sometimes more expensive?',
        answer:
          'Because the headline price is not the unit price. A plan advertised at $999 a month covering three instances is $333 per instance; a plan at $1,500 covering ten is $150. Divide the price by the instances covered before comparing two quotes. If a provider will not state the instance count their price assumes, that is worth knowing on its own.',
      },
      {
        question: 'Is a monthly plan or hourly consultancy cheaper for us?',
        answer:
          'The rough crossover is ten hours a month. Below that, hourly consultancy at $150 an hour with a four-hour minimum usually costs less. Above it you are paying plan-level money for hourly service without the SLA, the monitoring or the included hours. On-call cover at $100 per instance per month sits between the two for teams who run the databases themselves.',
      },
      {
        question: 'What should I check before comparing two DBA support quotes?',
        answer:
          'Three things. What event starts the response SLA clock — a clock that starts when a person notices the alert is not a response SLA. Whether professional service hours are included or every remediation is billable. And who holds credentials to your databases, and in which country.',
      },
      {
        question: 'Are there lock-in contracts or setup fees?',
        answer:
          'No. Onsys monthly plans run month to month with no lock-in term, pricing is published rather than quoted on request, and work beyond a plan’s included hours is agreed with you before it starts at $140 per hour. All prices are GST exclusive.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 3. Project work. The audit asked for a *page* here; this is the article
  //    that answers the informational half of those queries and gives a future
  //    service page something to link from. See the note in the handover.
  // -------------------------------------------------------------------------
  {
    slug: 'sql-server-upgrade-migration-always-on-projects',
    title: 'SQL Server Upgrades, Always On and Azure SQL MI: How These Projects Actually Run',
    excerpt:
      'What a SQL Server upgrade, an Always On availability group build or an Azure SQL Managed Instance migration involves in practice — the sequence, the decisions that drive cost, and the failure modes worth planning around.',
    seoTitle: 'SQL Server Upgrade & Migration Projects in Australia',
    seoDescription:
      'How SQL Server upgrade, migration, Always On and Azure SQL MI projects actually run — the sequence, what drives the cost, and the failure modes to plan for.',
    readMinutes: 9,
    category: 'database',
    bodyHtml: `
<p>Four projects account for most of the SQL Server work Australian organisations commission: a version upgrade, a platform migration, an Always On availability group build, and a move to Azure SQL Managed Instance. They share a shape, and they share the ways they go wrong.</p>

<p>This is what each involves in practice, and what actually drives the cost.</p>

<h2>The sequence that does not change</h2>

<p>Whatever the project, the order is the same, and skipping a step does not save time — it moves the time to cutover night, where it costs more.</p>

<ol>
  <li><strong>Assess.</strong> Inventory, dependency analysis, and the compatibility questions that constrain everything downstream.</li>
  <li><strong>Design.</strong> Target architecture against your actual recovery point and recovery time objectives, not against a reference diagram.</li>
  <li><strong>Rehearse.</strong> A dry run against a copy of production. This is the step that gets cut, and it is the step that finds the problems.</li>
  <li><strong>Cut over.</strong> Inside an agreed window, against a rollback plan that has been executed in test.</li>
  <li><strong>Verify and hand over.</strong> Confirm against the acceptance criteria agreed before the work started, then a runbook the team can operate without the people who built it.</li>
</ol>

<h2>Version upgrades</h2>

<p>The engine upgrade is the easy part. The work is in what surrounds it.</p>

<p><strong>Compatibility level</strong> is the decision people underestimate. Upgrading the instance does not change a database's compatibility level, and raising it changes the query optimiser's behaviour — which changes execution plans, which changes performance, sometimes sharply and in both directions. The safe sequence is to upgrade the engine, leave compatibility level alone, confirm stability, then raise it deliberately with Query Store capturing plan regressions so you can force a previous plan if something degrades.</p>

<p><strong>Deprecated features</strong> are the second source of surprise. A 2016-era application may still use constructs that later versions removed. These are discoverable in advance, and they are only ever discovered late when nobody looked.</p>

<p><strong>Vendor certification</strong> constrains the answer more often than anything technical. If your ERP vendor certifies SQL Server 2019 and not 2022, that is the decision made, regardless of what the lifecycle dates argue for.</p>

<p>On targets: SQL Server 2022 is supported to 12 January 2033. SQL Server 2019 is supported to 9 January 2030, but its mainstream support ended on 1 March 2025, so it is already in extended support — security fixes only. If you are moving off <a href="/sql-server-2016-end-of-support">SQL Server 2016, whose support ended on 15 July 2026</a>, landing on a version already past half its life is worth doing on purpose rather than by habit.</p>

<h2>Always On availability groups</h2>

<p>The most commonly over-specified project we see, and the most commonly under-tested.</p>

<p><strong>Edition drives the cost, not the engineering.</strong> Standard Edition supports Basic Availability Groups: one database per group, one secondary, no readable secondary. Multiple databases that must fail over together, or a secondary you want to read from, means Enterprise Edition — and Enterprise licensing usually exceeds the entire cost of the project. That conversation belongs at the start, not after a design assumes a readable secondary.</p>

<p><strong>A quorum design that survives the failure you are planning for.</strong> Two nodes and a file share witness behave differently from three nodes, and multi-site configurations need node weights thought through rather than left at defaults. The question to hold the design against is not "does it fail over" but "which specific failure are we protecting against, and does this survive it".</p>

<p><strong>What availability groups do not replicate.</strong> Logins, SQL Agent jobs, linked servers, credentials and certificates live at instance level, not database level. An availability group that fails over perfectly to a secondary with none of the logins is a tested failover and a failed one. Contained availability groups in SQL Server 2022 address part of this; the rest is a checklist.</p>

<p>We fail a cluster over in front of the client before handover, twice. A failover nobody has performed is a hypothesis.</p>

<h2>Azure SQL Managed Instance</h2>

<p>The closest managed equivalent to a SQL Server instance, and the usual destination when an organisation decides it no longer wants to patch database servers.</p>

<p><strong>What comes across.</strong> SQL Agent, cross-database queries, linked servers, Service Broker, CLR — the instance-scoped surface that a lift-and-shift depends on and that Azure SQL Database does not offer. This is why Managed Instance is the realistic target for an existing estate and Azure SQL Database usually is not.</p>

<p><strong>What does not.</strong> No filestream or filetable. No cross-instance distributed transactions except through Managed Instance link. Backups are managed by the platform, so an existing backup strategy built on native backups to a share needs rethinking rather than porting.</p>

<p><strong>How the data moves.</strong> Azure Database Migration Service with log shipping under it gets most estates to a cutover measured in minutes rather than hours, because the bulk of the data moves while the source is still serving. Managed Instance link extends this further and is worth evaluating for anything where the window is genuinely tight.</p>

<p><strong>The cost conversation is the real one.</strong> Managed Instance moves spend from licences and capital to a monthly bill, and the sizing exercise — vCores, service tier, storage — decides whether the move saves money or quietly increases it. That modelling belongs before the decision, not after the migration.</p>

<h2>What actually drives the quote</h2>

<p>Rarely the database work. Four things move the number:</p>

<ul>
  <li><strong>Application coupling.</strong> One database behind one application is a small project. Nine databases with linked servers between them and two vendors who must both sign off is not.</li>
  <li><strong>Downtime tolerance.</strong> A four-hour window and a four-minute window are different architectures, and the difference is most of the cost.</li>
  <li><strong>Environment fidelity.</strong> A test environment that resembles production makes the rehearsal meaningful. One that does not means rehearsing on production, which is the thing we are trying to avoid.</li>
  <li><strong>Change control.</strong> A weekly CAB and formal test sign-off is not slower to work with, but it has to be planned for rather than discovered.</li>
</ul>

<h2>The failure modes worth planning around</h2>

<p>In order of how often we are called in after them:</p>

<ol>
  <li><strong>No rehearsal.</strong> The single strongest predictor of a bad cutover. A dry run against a copy of production is not optional rigour, it is the project.</li>
  <li><strong>A rollback plan that was written but never run.</strong> An untested rollback is a paragraph, not a plan. It fails at exactly the moment it is needed.</li>
  <li><strong>Instance-level objects forgotten.</strong> Logins, jobs and linked servers, on every migration and every availability group.</li>
  <li><strong>Compatibility level raised at cutover.</strong> It bundles an engine change and an optimiser change into one window, so when performance moves nobody knows which one did it.</li>
  <li><strong>No handover.</strong> A correct environment nobody internally can operate is a dependency, not a deliverable.</li>
</ol>

<h2>How we engage</h2>

<p>Where the scope can be defined, the project is quoted as a single fixed price against written acceptance criteria, with milestone payments. Where it genuinely cannot, we say so and work at $150 an hour rather than quoting a number we would have to revise.</p>

<p>Either way it is delivered by <a href="/who-can-access-your-database">Onsys consultants in Australia</a> — database work is Australian-only, on every engagement. Our <a href="/sql-server-migration-and-upgrade-services">SQL Server project services</a> page sets out what each engagement covers, or <a href="/contact">tell us what you are trying to move</a> and we will scope it on a free call — including when the work is smaller than you expected.</p>
`,
    faqs: [
      {
        question: 'How long does a SQL Server upgrade take?',
        answer:
          'The cutover is usually a matter of hours; the project is dominated by assessment and rehearsal. Expect the schedule to be driven by application testing and change approval rather than by database work. A dry run against a copy of production is what turns an unpredictable cutover into a predictable one, and it is the step most often cut.',
      },
      {
        question: 'Do we need Enterprise Edition for Always On availability groups?',
        answer:
          'Not always. Standard Edition supports Basic Availability Groups, which cover one database per group with a single non-readable secondary. You need Enterprise Edition if multiple databases must fail over together or you want to read from the secondary. Enterprise licensing frequently costs more than the entire project, so the edition question belongs at the start of the design rather than after it.',
      },
      {
        question: 'What does an availability group not replicate?',
        answer:
          'Anything stored at instance level rather than in the database: logins, SQL Agent jobs, linked servers, credentials and certificates. An availability group that fails over to a secondary with none of the logins present has been tested and has failed. Contained availability groups in SQL Server 2022 address part of this; the remainder is a checklist to work through before handover.',
      },
      {
        question: 'Should we move to Azure SQL Managed Instance or Azure SQL Database?',
        answer:
          'Managed Instance for an existing estate. It keeps SQL Agent, cross-database queries, linked servers and Service Broker, which is what a lift from an on-premises instance usually depends on. Azure SQL Database is a smaller unit and a larger application change — it suits a single application database and suits a consolidated estate poorly.',
      },
      {
        question: 'How much downtime does a migration to Azure SQL MI need?',
        answer:
          'Usually minutes rather than hours. Azure Database Migration Service with log shipping moves the bulk of the data while the source is still serving, so the cutover is the final catch-up and the switch. Managed Instance link narrows the window further and is worth evaluating where the tolerance is genuinely tight.',
      },
      {
        question: 'Why should we not raise compatibility level during the upgrade?',
        answer:
          'Because it bundles two changes into one window. Raising compatibility level changes query optimiser behaviour and therefore execution plans, so if performance moves after a cutover that did both, you cannot tell which change caused it. Upgrade the engine, confirm stability, then raise compatibility level deliberately with Query Store capturing regressions so a previous plan can be forced if needed.',
      },
    ],
  },
];
