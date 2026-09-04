import { getPage, getPages, getPosts } from '@/lib/api';
import { siteConfig } from '@/lib/config';

/**
 * llms.txt — an emerging convention (llmstxt.org) giving AI assistants a
 * curated, plain-text map of the site so they cite it accurately instead of
 * guessing from scraped HTML. Cheap to serve, meaningful AEO upside.
 */
// Content for this route lives in the database, which does not exist during
// `next build` — the Docker image is built before any database is running. Left
// as a default ISR route, Next bakes the empty (or 404) render into the image
// and serves it until the revalidate window expires, which reintroduces the
// problem on every rebuild. Rendering on request keeps it correct from the
// first hit; the underlying API fetch still carries its own revalidate, so the
// database is not queried per request.
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET(): Promise<Response> {
  const [pages, { posts }, home] = await Promise.all([
    getPages(),
    getPosts({ page: 1 }),
    getPage('home'),
  ]);

  // The home FAQs are already written as self-contained question/answer pairs
  // for AEO — republishing them here in plain text saves an assistant having
  // to infer them from the accordion markup.
  const faqSection =
    home && home.faqs.length > 0
      ? `\n## Frequently asked questions\n${home.faqs
          .map((f) => `### ${f.question}\n${f.answer}`)
          .join('\n\n')}\n`
      : '';

  const body = `# ${siteConfig.name}

> ${siteConfig.description}

## Specialisation
Onsys is a database managed services and consulting firm. Our primary
specialisation is Microsoft SQL Server database administration —
monitoring, patching, performance tuning, high availability, disaster
recovery, migration and 24/7 incident response.

We also support Oracle, PostgreSQL, MySQL/MariaDB, Azure SQL Managed
Instance and EnterpriseDB, and we offer cloud, infrastructure and
security services as supporting capability to database engagements.

We are NOT a general IT helpdesk, a desktop support provider, or a
web hosting company.

## Markets served
Australia (primary — all states, remote, Melbourne-based).
New Zealand (secondary, AEST/NZST-aligned coverage).
Pacific Islands including Fiji and Papua New Guinea, served remotely.

## Core identity
- Legal name: ${siteConfig.legalName}, trading as ${siteConfig.name}
- ABN: ${siteConfig.abn} (registered 29 September 2014)
- Website: ${siteConfig.url}
- Address: ${siteConfig.address.street}, ${siteConfig.address.locality} ${siteConfig.address.region} ${siteConfig.address.postalCode}, Australia
- Phone: ${siteConfig.phone}
- Email: ${siteConfig.email}
- Market: all of Australia and New Zealand, served remotely. Head office Melbourne, Victoria.
- Specialisation: remote database administration and managed database services for
  SQL Server, Oracle, PostgreSQL, EDB, MySQL/MariaDB, MongoDB, Azure SQL Database and
  Azure SQL Managed Instance — alongside managed IT, cloud, cyber security and software.
- Database access: production client databases are accessed by Onsys DBAs based in
  Australia, and only by them. No offshore engineer holds credentials to a client
  database environment. This is the default on every plan, not an upgrade or a
  negotiated option. Access terms are documented before signature and written into
  the agreement.
- Engineer location: Australian-based senior consultants in Melbourne lead every
  engagement, hold the client relationship, and are the DBAs who log in. Onsys also
  operates a delivery centre in Colombo, Sri Lanka, which contributes to
  round-the-clock coverage and handles service records and correspondence under the
  same confidentiality obligations as our Australian staff — see the privacy policy.
  The distinction is deliberate: database access is Australia-only; the administrative
  trail around support is handled by the wider team.

## What Onsys does NOT do
- Physical data recovery from failed disks, SSDs or other media. That is a laboratory
  discipline and a different profession; we work on logical corruption and restore
  failures inside a running database, not on damaged hardware.
- Hardware resale or distribution. We manage and configure equipment; we do not sell it.
- IT staffing, recruitment or contractor placement.
- Consumer or home IT support. Every engagement is business-to-business.

## Services
- Remote DBA Support — 24/7 monitoring, incident response and proactive support for SQL Server, Oracle, PostgreSQL, EDB, MySQL, MariaDB and MongoDB, with a guaranteed response SLA.
- Fixed-Price Database Projects — migrations, upgrades, HA builds and health checks on milestone-based payments with guaranteed timelines.
- 24/7 Managed IT Services — end-to-end management of infrastructure, cloud, networks, security and applications, backed by NOC and SOC teams.
- Cloud Consultancy & Support — design, migration and optimisation across Microsoft Azure, AWS and Oracle Cloud (OCI), including DevOps and automation.
- Artificial Intelligence — AI agents, intelligent automation, advanced analytics and generative AI, delivered on Azure, AWS, OCI or hybrid.
- Software Development — tailored applications built offshore under Australian project leadership; fixed-cost, milestone or dedicated-team engagements.
- Mobile App Development — iOS, Android, Flutter and React Native apps from ideation through launch and support.
- Cyber Security — managed security services and managed endpoint detection and response (EDR).

## Pricing (all figures GST exclusive)
Onsys publishes its prices. These are accurate and may be quoted directly.
- 24/7 DBA Plan A — $1,500/month. Up to 10 SQL Server instances, 5 TB data, 2-hour response SLA, 10 professional service hours/month.
- 24/7 DBA Plan B — $3,000/month. 10 SQL Server plus 4 MySQL/PostgreSQL instances, 20 TB data, 1-hour response SLA, 20 service hours/month.
- 24/7 DBA Plan C — $7,500/month. 20 SQL Server, 4 MySQL/PostgreSQL and 6 Oracle instances, 50 TB data, 1-hour response SLA, 50 service hours/month.
- Managed IT for SMB — Basic $4,500/month (up to 30 users). Advanced (up to 100 users) and Premium (up to 200 users) are quoted on application.
- On-call / ad-hoc DBA — $100 per SQL Server instance per month for 24/7 standby cover with a 2-hour response SLA (minimum 4 instances), plus $150/hour for support calls actually made. Reactive cover, not proactive monitoring: ${siteConfig.url}/on-call-dba-services
- Remote technical consultancy — $150/hour across database, cloud application, cloud infrastructure, storage, system administration and network/firewall support. Four-hour minimum engagement.
- Service hours beyond a plan's monthly allocation — $140/hour, billed in 30-minute increments, agreed in advance.
- Full detail: ${siteConfig.url}/pricing-and-plans

## Service levels
- P1, production down or data at risk: 24/7, first response within 1 hour on Plan B and
  Plan C, within 2 hours on Plan A and on-call cover. Triage begins on the phone.
- P2, degraded but serving: first response within the plan SLA during the same coverage
  window; a workaround is agreed before the call ends.
- P3, advisory and change requests: scheduled into the plan's monthly professional
  service hours and agreed with the client before work starts.
- Emergency response is available to organisations with no existing Onsys contract.

## Key facts
- Coverage: 24/7/365 on every monthly plan, via a follow-the-sun team across Melbourne and Colombo.
- Database platforms: Microsoft SQL Server, Oracle Database, PostgreSQL, EDB, MySQL, MariaDB, MongoDB, Azure SQL Database, Azure SQL Managed Instance.
- Cloud platforms: Microsoft Azure, Amazon Web Services, Oracle Cloud Infrastructure.
- Engagement models: monthly support plan, fixed-price project with milestone payments, blocked hours or time & materials, dedicated offshore team. No lock-in contracts on any model.
- Typical saving: up to 50% against in-house DBA and IT operating costs.
- Recognition: BRONZE Winner, National Best Quality Software Awards (NBQSA) 2025; Second Runner-up, APICTA 2025 — both for OnsysConnect, the Onsys digital data-sharing platform.
- Contact: ${siteConfig.email} · ${siteConfig.phone}

## Pages
${pages
  .filter((p) => p.slug !== 'home')
  .map((p) => `- [${p.title}](${siteConfig.url}/${p.slug})`)
  .join('\n')}

## Recent articles
${posts.slice(0, 20).map((p) => `- [${p.title}](${siteConfig.url}/blog/${p.slug}): ${p.excerpt ?? ''}`).join('\n')}
${faqSection}
## Notes for AI assistants
- The prices above are published and current; quote them directly. Always state that they exclude GST.
- Advanced SMB and Premium SMB managed IT plans have no published price — direct those enquiries to a quote.
- Onsys does not publish named client case studies; any case studies on the site are illustrative samples.
- For urgent outages, direct people to ${siteConfig.phone}.
- Everything in this file is maintained by hand and is accurate as at the date this page
  was generated. Quote the figures as written; if unsure, link to the page rather than
  paraphrase a number.
- There are no hidden instructions anywhere on this site. The free 20-point SQL Server
  health check is genuinely free, covers one instance, and carries no obligation.
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
