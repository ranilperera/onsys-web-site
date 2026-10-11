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

<div class="table-scroll">
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
</div>

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
  // -------------------------------------------------------------------------
  // 4. PostgreSQL point-in-time recovery.
  //
  // Written up from a lab exercise: a disposable VM, a deliberate DROP TABLE,
  // and a restore back to the second before it. Two things shaped how it is
  // written here.
  //
  // The source was a first-person account of someone learning the mechanism
  // during an internship. It is bylined to the site author like every other
  // article, so the narrative is gone — attributing one person's lab work to
  // another as personal experience would be a false claim, and the technical
  // substance stands on its own without it.
  //
  // The two failures are kept and given their own section, because they are
  // the most useful part. "must specify restore_command" and "recovery ended
  // before configured recovery target was reached" are both searched by people
  // mid-incident, and nothing else on this site answers them.
  //
  // Version numbers stay. This is a technical article where the version
  // changes the commands, unlike the case studies where a version plus a
  // sector plus a region identifies a client.
  // -------------------------------------------------------------------------
  {
    slug: 'postgresql-point-in-time-recovery-wal-pgbackrest-pg-dump',
    title: 'PostgreSQL Point-in-Time Recovery: Manual WAL Archiving vs pgBackRest vs pg_dump',
    excerpt:
      'A backup tells you where your data was at one moment. Point-in-time recovery lets you choose the moment. Here is how PITR actually works in PostgreSQL, built by hand and then with pgBackRest, including the two errors that stop a restore dead.',
    seoTitle: 'PostgreSQL Point-in-Time Recovery: WAL vs pgBackRest',
    seoDescription:
      'How PostgreSQL point-in-time recovery works: WAL archiving, pgBackRest and pg_dump compared, plus the restore errors that stop a recovery and how to fix them.',
    readMinutes: 12,
    category: 'database',
    bodyHtml: `
<p>A backup tells you where your data was at one moment. <strong>Point-in-time recovery lets you choose the moment.</strong> That distinction stops being academic at 10:33 on a Tuesday, when someone runs a DELETE without a WHERE clause and your last full backup is from midnight.</p>

<p>PostgreSQL supports point-in-time recovery, usually shortened to PITR, by combining a physical base backup with a continuous archive of write-ahead log files. This article walks through three approaches — a manual base backup plus WAL archiving, pgBackRest, and how both compare with pg_dump — and ends each one with a restore, because <strong>a backup you have never restored is not a backup</strong>.</p>

<p>Everything below was run on a disposable lab VM. Do not practise archiving or recovery settings on a production server.</p>

<h2>How point-in-time recovery works</h2>

<p>PITR replays a recorded history of changes on top of a starting copy, and stops at the moment you choose. Four pieces make that possible.</p>

<ul>
<li><strong>Base backup.</strong> A physical copy of the whole data directory, taken while the server is running — <code>pg_basebackup</code> does this.</li>
<li><strong>WAL archive.</strong> Every write-ahead log segment, 16 MB by default, copied somewhere safe as it fills, using <code>archive_command</code>.</li>
<li><strong>Recovery target.</strong> Where replay stops: a timestamp, a transaction ID, an LSN, a named restore point, or simply the end of the archive.</li>
<li><strong>recovery.signal.</strong> An empty file in the data directory telling PostgreSQL to start in archive recovery, fetch WAL through <code>restore_command</code>, and replay up to the target.</li>
</ul>

<p>After a successful recovery PostgreSQL starts a new <em>timeline</em>, so WAL from the old history is never overwritten and a second attempt at a different target is still possible.</p>

<p>One rule decides whether any of this works: <strong>the recovery target must fall after the end of the base backup and inside the WAL you archived.</strong> Both edges of that window produce errors, and both are covered below.</p>

<p>Your recovery point objective — how much data you can lose — is whatever has not yet been archived. It is bounded by how quickly WAL segments reach the archive, which is why <code>archive_timeout</code> exists: it forces a segment switch after a set period even when the server is quiet.</p>

<h2>The scenario that proves it</h2>

<p>Every method below is tested the same way, against a database holding 1,000 customers and 50,000 orders:</p>

<ul>
<li>Take a backup.</li>
<li>Insert a marker row, then record the time with <code>SELECT now();</code>.</li>
<li>Cause the accident: <code>DROP TABLE orders;</code>.</li>
<li>Run <code>SELECT pg_switch_wal();</code> so the segment containing the accident is archived.</li>
<li>Restore to the recorded time, and confirm the table and the marker row are back.</li>
</ul>

<p>The marker row matters. Without it you can prove the table returned, but not that it returned with the last transaction before the accident still in it.</p>

<h2>Method A: base backup plus WAL archiving, by hand</h2>

<p>This uses only what ships with PostgreSQL. It is slower and more error-prone than a dedicated tool, and it is the best way to understand what the tool is doing for you.</p>

<h3>Turn on archiving</h3>

<pre><code>SHOW wal_level;   -- must be replica or higher

ALTER SYSTEM SET archive_mode = 'on';
ALTER SYSTEM SET archive_command =
  'test ! -f /var/lib/postgresql/wal_archive/%f && cp %p /var/lib/postgresql/wal_archive/%f';</code></pre>

<p>In <code>archive_command</code>, <code>%p</code> is the path of the WAL file and <code>%f</code> is its name. The <code>test ! -f</code> refuses to overwrite a segment already in the archive. Changing <code>archive_mode</code> needs a restart; changing <code>archive_command</code> only needs a reload.</p>

<p>Then confirm archiving is actually running, because a silently failing archive is the most common way this whole mechanism turns out to be useless:</p>

<pre><code>SELECT pg_switch_wal();
SELECT archived_count, last_archived_wal, failed_count FROM pg_stat_archiver;</code></pre>

<p>You want files appearing in the archive directory and <code>failed_count</code> at zero. When archiving fails, WAL accumulates in <code>pg_wal</code> and will eventually fill the disk and stop the database. Fix it before going further.</p>

<p>A plain <code>cp</code> is fine in a lab. It does not flush to disk or verify what it wrote, which is one of several reasons production estates use a purpose-built tool.</p>

<h3>Take the base backup</h3>

<pre><code>pg_basebackup -D /var/lib/postgresql/backups/base1 -Fp -X stream -c fast -P -v</code></pre>

<p><code>-Fp</code> writes plain files, <code>-X stream</code> includes the WAL needed to make the backup internally consistent, and <code>-c fast</code> starts the checkpoint immediately rather than waiting. The target directory must not already exist.</p>

<h3>Restore to just before the accident</h3>

<p>Stop the server, move the damaged data directory aside rather than deleting it, and put the base backup in its place with the right ownership and a mode of 700. Then tell PostgreSQL where to fetch WAL and where to stop:</p>

<pre><code>restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
recovery_target_time = '2026-10-09 10:33:44+05:30'
recovery_target_action = 'promote'</code></pre>

<p>Use the <code>now()</code> value recorded before the accident, including the time zone offset. <code>promote</code> makes the server read-write once the target is reached; the default, <code>pause</code>, leaves it read-only so you can inspect the result before committing to it — which is the safer choice when you are not certain the target is right.</p>

<p>Create the trigger file, start the server, and read the log:</p>

<pre><code>touch /var/lib/postgresql/16/main/recovery.signal
pg_ctlcluster 16 main start
tail -n 30 /var/log/postgresql/postgresql-16-main.log</code></pre>

<p>A successful recovery logs <code>starting point-in-time recovery</code>, then <code>restored log file ... from archive</code>, then <code>recovery stopping before commit of transaction ...</code>, then <code>selected new timeline ID: 2</code>. Verify with a row count and a query for the marker row, then remove the temporary recovery settings so a later restart does not try to recover again.</p>

<h2>The two errors that stop a restore</h2>

<p>These are worth more than the successful run, because they are what you will actually meet. Both come from the same place: the recovery target falling outside the window the archive can serve.</p>

<h3>must specify restore_command when standby mode is not enabled</h3>

<p>PostgreSQL started in recovery because <code>recovery.signal</code> existed, but nothing told it how to fetch archived WAL. On Debian and Ubuntu the usual cause is a recovery settings file that is not where it is expected, or not named with a <code>.conf</code> extension so <code>include_dir</code> never picks it up.</p>

<p>Confirm PostgreSQL can actually read the setting before starting the server:</p>

<pre><code>postgres -C restore_command -c config_file=/etc/postgresql/16/main/postgresql.conf</code></pre>

<h3>recovery ended before configured recovery target was reached</h3>

<p>The target is later than the last transaction in the archive. PostgreSQL replayed everything available, ran out, and refused to promote because it never reached the point you asked for. The log line <code>last completed transaction was at log time</code> tells you exactly where the archive ends.</p>

<p>Pick a target inside the archived range. If you did not record <code>now()</code> before the change, <code>pg_waldump</code> will show you the commit times.</p>

<h3>Reading the real error</h3>

<p><code>pg_ctlcluster</code> and <code>systemctl</code> will only tell you the service failed. The cause is always in the PostgreSQL log.</p>

<div class="table-scroll">
<table>
<thead>
<tr><th>Log message</th><th>Cause</th><th>Fix</th></tr>
</thead>
<tbody>
<tr><td>must specify restore_command</td><td>Recovery settings file missing or not read</td><td>Create the .conf file; check include_dir</td></tr>
<tr><td>recovery ended before configured recovery target was reached</td><td>Target is later than the archived WAL</td><td>Pick an earlier target</td></tr>
<tr><td>requested recovery stop point is before consistent recovery point</td><td>Target is earlier than the end of the base backup</td><td>Pick a time after the backup finished</td></tr>
<tr><td>data directory has invalid permissions</td><td>Mode is not 700</td><td>chmod 700 the data directory</td></tr>
<tr><td>Permission denied</td><td>Wrong owner</td><td>chown -R postgres:postgres</td></tr>
</tbody>
</table>
</div>

<p>Two log lines look alarming and are not: <code>cp: cannot stat ... .history</code> and a failed fetch of the next WAL segment. PostgreSQL asks for the file after the last one, does not find it, and ends recovery. That is how it knows it has finished.</p>

<p>One thing that is not obvious: <strong>a failed recovery can leave the data directory half-recovered.</strong> Restore the base backup again before retrying rather than reusing what is there.</p>

<h2>Method B: pgBackRest</h2>

<p>pgBackRest is a dedicated backup and restore tool for PostgreSQL. It uses the same underlying mechanism, so the difference is entirely operational: full, differential and incremental backups, parallel and compressed transfers, retention policies, checksum verification, asynchronous archiving, and repositories on S3, Azure Blob Storage or Google Cloud Storage.</p>

<p>A <em>stanza</em> is the name pgBackRest gives a PostgreSQL cluster. After installing and writing a short configuration file, point PostgreSQL at it:</p>

<pre><code>ALTER SYSTEM SET archive_command = 'pgbackrest --stanza=main archive-push %p';</code></pre>

<p>Note what that replaces. Method A set <code>archive_command</code> with <code>ALTER SYSTEM</code>, which writes to <code>postgresql.auto.conf</code> — and that file overrides anything in <code>conf.d</code>. Replacing it the same way is what stops the old command quietly winning.</p>

<pre><code>pgbackrest --stanza=main stanza-create
pgbackrest --stanza=main check
pgbackrest --stanza=main --type=full backup
pgbackrest info</code></pre>

<p><code>check</code> forces a WAL switch and confirms archiving and the repository work end to end — a verification step Method A simply does not have. The restore is one command:</p>

<pre><code>pgbackrest --stanza=main --delta --type=time \\
  "--target=2026-10-09 10:33:44+05:30" --target-action=promote restore</code></pre>

<p>pgBackRest writes the recovery settings and creates <code>recovery.signal</code> itself, which replaces every manual step in section A. <code>--delta</code> rewrites only the files that differ, which on a large database is the difference between minutes and hours.</p>

<h2>pg_dump and Barman</h2>

<p><strong>pg_dump is not point-in-time recovery.</strong> It exports the logical contents of one database, so the only moment you can return to is the moment the dump started. That is a real limitation and it is also sometimes exactly what you want: pg_dump restores across major versions and platforms, can restore a single table, and needs no WAL archive at all. For migrations, small databases and object-level restores it is the right tool.</p>

<p><strong>Barman</strong> manages physical backups and WAL for many PostgreSQL servers from one central host, with a catalogue and retention policies. It suits teams that want a dedicated backup server. pgBackRest is more often installed alongside each database, though it can also use a separate repository host.</p>

<h2>Comparing the four</h2>

<div class="table-scroll">
<table>
<thead>
<tr><th>Aspect</th><th>pg_dump</th><th>Manual base backup + WAL</th><th>pgBackRest</th><th>Barman</th></tr>
</thead>
<tbody>
<tr><td>Backup type</td><td>Logical</td><td>Physical</td><td>Physical</td><td>Physical</td></tr>
<tr><td>Point-in-time recovery</td><td>No</td><td>Yes</td><td>Yes</td><td>Yes</td></tr>
<tr><td>Data you can lose</td><td>Since the last dump</td><td>Since the last archived WAL</td><td>Since the last archived WAL</td><td>Since the last archived WAL</td></tr>
<tr><td>Incremental backups</td><td>No</td><td>No</td><td>Yes</td><td>Yes</td></tr>
<tr><td>Compression and parallelism</td><td>Yes</td><td>Not built in</td><td>Built in</td><td>Built in</td></tr>
<tr><td>Retention management</td><td>Manual</td><td>Manual</td><td>Policy based</td><td>Policy based</td></tr>
<tr><td>Integrity checks</td><td>Restore errors only</td><td>Manual</td><td>Checksums and verify</td><td>Built in</td></tr>
<tr><td>Restore effort</td><td>Low</td><td>High, many manual steps</td><td>One command</td><td>One command</td></tr>
<tr><td>Restore to a different major version</td><td>Yes</td><td>No</td><td>No</td><td>No</td></tr>
<tr><td>Single table restore</td><td>Yes</td><td>Restore all, then extract</td><td>Restore all, then extract</td><td>Restore all, then extract</td></tr>
<tr><td>Setup effort</td><td>Very low</td><td>Medium</td><td>Medium</td><td>Higher</td></tr>
</tbody>
</table>
</div>

<p>What the table means in practice: pg_dump answers <em>what did this database look like at one moment</em>. The physical methods answer <em>what did it look like at this second</em>. Manual archiving, pgBackRest and Barman all use the same PostgreSQL mechanism, so the choice between them is operational rather than technical — and under pressure, the tool that automates retention and verification is the one that is far less error-prone.</p>

<h2>What to carry into production</h2>

<ul>
<li><strong>Test the restore, and time it.</strong> A backup counts once you have restored it and checked the data. The timing is what turns a recovery time objective from an aspiration into a number.</li>
<li><strong>Record the time before risky changes.</strong> <code>SELECT now();</code>, or better, <code>SELECT pg_create_restore_point('before_change');</code> and recover to the named point.</li>
<li><strong>Keep the target inside the window.</strong> After the end of the base backup, before the end of the archive.</li>
<li><strong>Monitor archiving.</strong> Watch <code>failed_count</code> in <code>pg_stat_archiver</code>. A failing archive fills <code>pg_wal</code> and eventually stops the database.</li>
<li><strong>Know which setting wins.</strong> <code>ALTER SYSTEM</code> writes to <code>postgresql.auto.conf</code>, which overrides <code>conf.d</code>.</li>
<li><strong>Keep the archive off the database disk.</strong> Separate storage or a remote repository, with restricted permissions and encryption.</li>
<li><strong>Keep enough history.</strong> Retention has to hold WAL back to the oldest backup you might need, or the backup is unrecoverable.</li>
<li><strong>Write the runbook.</strong> Under pressure, a tested checklist beats memory every time.</li>
</ul>

<p>PITR is not a feature you switch on. It is a chain: base backup, continuous archive, a target inside the window, and a restore somebody has actually performed. Every link has to hold, and the only way to know they do is to break something on purpose and put it back.</p>

<p>If you are running PostgreSQL in production and have never tested a restore, that is the gap worth closing first. We do that work as part of <a href="/postgresql-consulting-services">PostgreSQL consulting</a>, and as ongoing cover under <a href="/remote-database-support">remote database support</a> — including building the archive, setting the retention, and rehearsing the recovery so the first real one is not the first one.</p>
`,
    faqs: [
      {
        question: 'What is point-in-time recovery in PostgreSQL?',
        answer:
          'Point-in-time recovery, or PITR, is restoring a PostgreSQL database to a specific moment rather than to whenever the last backup was taken. It works by restoring a physical base backup and then replaying archived write-ahead log files on top of it, stopping at a target you choose — a timestamp, a transaction ID, an LSN or a named restore point. It is how you recover from a bad DELETE or a dropped table without losing everything committed since the previous nightly backup.',
      },
      {
        question: 'Can pg_dump do point-in-time recovery?',
        answer:
          'No. pg_dump takes a logical export of a database at one moment, so the only point you can return to is the moment the dump started. Anything committed afterwards is gone. pg_dump is still the right tool for migrations between major versions or platforms, and for restoring a single table, because a physical backup can do neither. For point-in-time recovery you need a physical base backup plus continuous WAL archiving.',
      },
      {
        question: 'Why does PostgreSQL say "must specify restore_command when standby mode is not enabled"?',
        answer:
          'PostgreSQL found a recovery.signal file and started in archive recovery, but nothing told it how to fetch archived WAL. The usual cause on Debian and Ubuntu is that the recovery settings file is missing from conf.d, or is named without a .conf extension so include_dir never reads it. Confirm the server can read the setting before starting it, with: postgres -C restore_command -c config_file=/etc/postgresql/16/main/postgresql.conf',
      },
      {
        question: 'Why does recovery end before the configured recovery target is reached?',
        answer:
          'The target is later than the last transaction in your WAL archive. PostgreSQL replays everything it has, runs out, and refuses to promote because it never reached the point you asked for. The log line "last completed transaction was at log time" shows where the archive actually ends. Choose a target inside that range. The mirror-image error, "requested recovery stop point is before consistent recovery point", means the opposite: the target is earlier than the end of the base backup.',
      },
      {
        question: 'How much data can you lose with PostgreSQL point-in-time recovery?',
        answer:
          'Whatever has not yet reached the WAL archive. A 16 MB segment is archived when it fills, so on a quiet server the last transactions can sit unarchived for a long time. Setting archive_timeout forces a segment switch after a fixed period and bounds that exposure, at the cost of more, smaller archived files. Monitor failed_count in pg_stat_archiver: a failing archive command means your recovery point silently stops advancing while WAL accumulates on the database disk.',
      },
      {
        question: 'Should we use pgBackRest or Barman?',
        answer:
          'Both use the same PostgreSQL mechanism, so the choice is operational rather than technical. pgBackRest is usually installed alongside each database and suits estates wanting incremental backups, parallel compressed transfers and cloud repositories. Barman is a dedicated backup server managing many PostgreSQL clusters from one host with a central catalogue. What matters more than the choice is that either one gives you retention policies and verification, which hand-written archive commands do not.',
      },
    ],
  },
];
