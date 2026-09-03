# Onsys Platform — SEO / AEO Implementation Brief (Phase 1: Code)

**Repo:** `C:\DEV2026\onsys-platform\onsys-platform`
**Stack:** npm workspaces monorepo · `apps/web` (Next.js 15.1.3, App Router, React 19, TS) · `apps/api` (Express + Prisma + PostgreSQL) · `packages/shared` · Docker
**Site:** https://www.onsys.com.au
**Goal:** Make onsys.com.au the definitive Australian source for **SQL Server DBA services**, with New Zealand and the Pacific Islands secondary.
**Prepared:** 3 September 2026 · **Revised after reading the codebase**

> **How to use this file.** Save as `docs/seo-implementation-brief.md`, commit it, then in VS Code tell Claude:
> *"Read `docs/seo-implementation-brief.md` and do Work Package 1. Show me the diff for each item before applying."*
> One package per session. Do not attempt all of them at once.

---

## What I found when I read the codebase — read this first

This is a mature, well-built platform. Several recommendations from my earlier audits were written without seeing the code and were **wrong**. Corrected here:

| Earlier recommendation | Reality | Status |
|---|---|---|
| "Add Organization/LocalBusiness/FAQPage/Service/Article/Breadcrumb schema" | `apps/web/src/lib/seo.ts` already implements **all of it**, plus `WebSite`, `WebPage` with `speakable`, `OfferCatalog` built from CMS pricing blocks, `ItemList`/`SoftwareApplication`, `HowTo` with automatic step extraction, and a connected `@id` entity graph. It is better than most agency work. | ✅ **Already done** |
| "Add compression at HAProxy" | `next.config.mjs` sets `compress: true`. | ✅ **Already done** |
| "Add security headers at HAProxy" | `next.config.mjs` already sets CSP, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` and HSTS. **Adding them at HAProxy would duplicate or conflict.** | ❌ **Do not do** |
| "Sitemap `lastmod` is a build timestamp" | `app/sitemap.ts` correctly uses `new Date(p.updatedAt)` from the database. The identical timestamps on the live site are a **data** problem — the WordPress import stamped every row at once. | ⚠️ **Data fix, not code** |
| "Add the ~49 blog redirects to the HAProxy map" | There is a `Redirect` Prisma model and a DB-backed redirect system in `middleware.ts`, editable through `/admin` without a deploy. **That is the right place.** | ⚠️ **Right fix, wrong layer** |

### Two architectural conflicts that need a decision

**1. Redirects are implemented twice.** `apps/web/src/middleware.ts` holds a ~60-entry `STATIC_REDIRECTS` map *and* a cached DB-backed lookup. HAProxy holds a separate `onsys-legacy-urls.map`. Both are live. Two sources of truth for the same behaviour is how a URL ends up redirecting somewhere nobody intended.

**2. Trailing-slash normalisation happens twice** — `middleware.ts` returns **308**, HAProxy returns **301**. Same direction so no loop, but different status codes and a longer chain than necessary.

**Recommendation:** make the **application** the single source of truth for path redirects, and reduce HAProxy to host and scheme canonicalisation only (`onsys.com.au` → `www.onsys.com.au`, `http` → `https`). Reasons: the DB-backed table is editable in `/admin` without a deploy or a proxy reload; it already holds most of the map; it keeps redirect logic beside the routes it serves; and it survives a proxy rebuild. Phase 2 covers the HAProxy side.

If you prefer the opposite — HAProxy owns everything — that is defensible too, but then the middleware redirect logic should be deleted rather than left as a second implementation.

### Hard guardrails

1. **`trailingSlash` is currently unset (defaults to `false`). Leave it that way.** Both HAProxy and the middleware strip trailing slashes. Setting it `true` creates an infinite redirect loop and takes the site down.
2. **Do not change the slug of any published Page or Post** without adding a `Redirect` row for the old slug.
3. **Do not add host-based or scheme-based redirects in app code** — HAProxy owns that.
4. **Do not mass-delete or mass-noindex blog posts.** The content is genuine practitioner work.

---

## Work Package 1 — Sitemap, redirects and content data

### 1.1 Remove `?category=` URLs from the sitemap
`apps/web/src/app/sitemap.ts` emits `categoryEntries` as `${siteConfig.url}/blog?category=${c.slug}`. These are faceted duplicates that canonicalise to `/blog`, they carry no `lastModified`, and three of the seven categories are empty. Listing them contradicts the canonical.

**Delete the `categoryEntries` block and its spread in the return.**

### 1.2 Fix the wrong slug in `STATIC_REDIRECTS`
In `middleware.ts`:
```ts
'/how-to-save-with-onsys-managed-database-services': '/pricing-and-plans',
```
The URL that is actually indexed and was ranking is `/how-to-save-with-onsys-**remote**-database-services`. As written this entry matches nothing. Fix the key, and keep the old one as a harmless alias.

### 1.3 Add the missing blog redirects — as data, not code
Roughly 49 legacy blog URLs still 404. The old site served posts at the root (`/slug`); the new one serves them at `/blog/slug`. Neither `STATIC_REDIRECTS` nor the DB table covers them.

**Preferred: a one-off script** that reads every published Post and upserts a `Redirect` row `/{slug}` → `/blog/{slug}`, skipping any that already exists and any where a Page already owns that path. Model it on the existing `apps/api/src/scripts/` files and add it to the root `package.json` scripts.

Then **cross-check against Search Console** (*Indexing → Pages → Not found*) — some WordPress slugs drifted during import, and at least one has a typo (`/downoad-and-install-intellij-idea-community-edition`). Add those manually in `/admin`.

**Guard against loops:** refuse to write a row where `fromPath === toPath`, where `toPath` ends in `/`, or where `toPath` is itself an existing `fromPath`.

### 1.4 Fix the sitemap `lastmod` data
The code is correct; the data is not. Every Post and Page has effectively the same `updatedAt` because the WordPress import wrote them in one transaction. Backfill `updatedAt` from the original WordPress modified date where available (`import-wordpress.ts` may still have it), otherwise from `publishedAt`. Do **not** touch `updatedAt` on rows that have been genuinely edited since.

### 1.5 Homepage metadata
The homepage is the only key page with no meta description. Add via the CMS `seoDescription` field on the `home` Page record:
```
Australian SQL Server DBA and database support from $1,500/month ex-GST.
24/7 cover, response from one hour, Melbourne-based. Free 20-point SQL
Server health check.
```
Confirm `buildMetadata` is emitting `alternates.canonical` for the home route — every other page gets it from `lib/seo.ts`.

### 1.6 Blog title suffix
Indexed blog titles render as `"… - Onsys Technologies | Onsys"`. The legacy WordPress suffix is inside the imported `title` or `seoTitle` field. Strip `- Onsys Technologies` (and variants) from Post titles in the database — a data fix, and it frees ~22 characters per title.

### 1.7 Three live content defects
- `/blog/understanding-sql-server-log-flush-wait-time-detection-and-solutions` opens with CMS placeholder text: *"Supported by a robust sales force and tight cost controls, Pharm Ltd. …"*. Rewrite or unpublish.
- `/blog/building-an-azure-sql-managed-instance-link-…` repeats its own title three times in the first 40 words.
- `/blog/how-to-save-with-onsys-remote-database-services` has *"Remote **Remote** Database Support"* in a live H2.

Then grep the `Post` table for `Pharm Ltd`, `Lorem`, `placeholder`, `sample text`.

### 1.8 `/api/health` for the proxy
HAProxy's health check currently GETs `/` with the bare hostname and demands exactly `200` — fragile, and with a single backend server it can take the whole site down. Add a route handler at `apps/web/src/app/api/health/route.ts` returning `{"status":"ok"}` with `Cache-Control: no-store`, `export const dynamic = 'force-dynamic'`, and no DB call. Note `middleware.ts`'s matcher already excludes `/api`.

### 1.9 Empty blog categories
`cyber-security`, `infrastructure-and-cloud` and `business-plans` contain zero posts and render "No posts published yet". Hide zero-count categories from the filter UI, and re-tag posts so `database` stops containing WordPress and Git tutorials.

**Acceptance:** `/api/health` returns 200 · no `?category=` in the sitemap · legacy blog URLs 301 to `/blog/…` · no Post title contains `Onsys Technologies |` · no placeholder text in any published post.

---

## Work Package 2 — Schema refinements (small — most of it is already right)

`lib/seo.ts` is comprehensive. Three narrow changes:

### 2.1 Article author must be a `Person`, not the Organization
```ts
// apps/web/src/lib/seo.ts — articleSchema()
author: { '@type': 'Organization', name: post.authorName, url: siteConfig.url },
```
Named humans with a consistent cross-platform footprint get resolved as entities; a company name does not. Change to `Person` with a `url` pointing at the author page from WP3, and add `sameAs` for their LinkedIn. This needs an `authorSlug` (or an `Author` relation) on the `Post` model — see WP3.

### 2.2 `areaServed` should include New Zealand
`organizationSchema()` and `serviceSchema()` both hardcode `{ '@type': 'Country', name: 'Australia' }`. `llms.txt` already claims New Zealand coverage. Make it an array of Australia and New Zealand so the claim is consistent everywhere.

### 2.3 Add `knowsAbout` entries that match the target queries
The list is good. Add the terms buyers actually search: `SQL Server Always On Availability Groups`, `SQL Server performance tuning`, `SQL Server licensing`, `Transparent Data Encryption`, `database disaster recovery`, `APRA CPS 234`, `ACSC Essential Eight`.

**Do not add** `Review` or `AggregateRating` — self-marked review data is unreliable and risks a manual action.

---

## Work Package 3 — Author identity

No individual is named anywhere on the site. Posts carry three inconsistent corporate bylines. Competitors byline real people with job titles.

1. **Decide which senior DBA is the named author.** Business decision — ask, don't pick.
2. Add an `Author` model (or `authorSlug` + an authors table) to `apps/api/prisma/schema.prisma`, related to `Post`. Fields: name, slug, role, bio, photo, credentials, linkedIn.
3. Build `/about/[author]` — either a code route or a CMS Page, whichever fits better.
4. Emit `Person` schema with `sameAs` → LinkedIn, and wire it into `articleSchema` (WP2.1).
5. Backfill `authorName` on existing posts to one consistent name string.
6. Add an author bio box to the post template.

---

## Work Package 4 — `llms.txt`

`apps/web/src/app/llms.txt/route.ts` already serves a good file. Two changes:

### 4.1 Lead with specialisation and state the negative
The site has 21 service pages spanning database, cloud, security, software development and AI. Without an explicit exclusion a model may classify Onsys as a generalist MSP. Add:

```
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
```

### 4.2 Also serve it at `/.well-known/llms.txt`
Add a second route handler, or a rewrite. Keep the pricing, SLAs and the offshore disclosure exactly as they are — that section is the best in the market and should not be softened.

---

## Work Package 5 — Blog conversion plumbing

Genuine practitioner content that converts nothing, because nothing links out of it.

### 5.1 In-body contextual service links
Service links appear **only in the global footer**. Every SQL Server post should link to at least one money page from within the body, with a descriptive anchor — *"our remote SQL Server DBA support"*, never "click here". Either add them to the post HTML, or build a small `RelatedService` block editors can drop in.

### 5.2 Repoint the end-of-post CTA
It currently sends readers to `/contact`. Change it to `/free-20-point-sql-server-health-check` — a specific, free, scoped offer converts far better, and that page currently receives **no internal links from any post**.

### 5.3 Replace "related posts" with real topical clustering
It is a recency widget: the same three newest posts appear on every article, so the TDE-on-Always-On post recommends an Oracle RMAN guide. Use category and tag overlap, with recency only as a tiebreak.

### 5.4 Exploit the `HowTo` schema you already have
`extractSteps()` only fires on H2s matching `/^step\s*\d/i`. Most step-by-step posts don't use that heading format, so the markup never emits. Either relax the matcher or add explicit step headings to the top ten tutorial posts — this is free rich-result eligibility that is currently switched off.

### 5.5 Add the missing T-SQL to the TDE post
`/blog/how-to-enable-tde-on-sql-server-2019-standard-with-always-on-availability-groups-for-selected-databases` is the highest-commercial-intent post on the blog and has **zero code blocks**. It needs `CREATE MASTER KEY`, `BACKUP CERTIFICATE … WITH PRIVATE KEY`, `ALTER DATABASE … SET ENCRYPTION ON` and a `sys.dm_database_encryption_keys` progress query. **This is a DBA task — leave a TODO, do not invent T-SQL.**

---

## Work Package 6 — The SQL Server silo

**This is mostly content work, not code.** Pages are database-driven through `app/[slug]/page.tsx` and authored in `/admin` from 15 block types: `hero`, `richText`, `cardGrid`, `checkList`, `steps`, `stats`, `pricing`, `faq`, `ctaBand`, `platformChips`, `logoGrid`, `quicklinks`, `productGrid`, `contactForm`, `emergencyCheckout`.

That is a good block set for this job. `faq` drives `FAQPage` schema, `pricing` drives the `OfferCatalog`, `steps` maps to the "how we work with you" pattern, `stats` carries proof points.

**Code change needed first:** add a **"SQL Server"** dropdown to `Header.tsx`. Without it these pages are orphans with no internal links.

### Page template — apply to all six
1. `seoTitle` under 60 chars, keyword first, brand last
2. `seoDescription` 150–158 chars, leading with a number
3. `hero` block — H1 is the plain keyword
4. `richText` opening = **40–60 word direct answer**: `[keyword] is/are [definition] … Onsys [differentiator with a number]`. No "In today's data-driven world"
5. H2s phrased as the buyer's literal question
6. `steps` block — 4–6 steps, one sentence each
7. `platformChips` — SQL Server 2012–2025, Always On, Azure SQL MI
8. `faq` block — heading `Frequently asked questions about [exact keyword]`
9. `ctaBand` — *Speak with a senior SQL Server DBA* / *Book your free 20-point health check*. Never "Learn more"
10. Published and last-reviewed dates (the `PageDates` component already exists)

### Build order
| Slug | Why this one |
|---|---|
| `sql-server-dba-services` | The hub. Nothing can rank until a page exists whose H1, title, slug and opening sentence all say it. Link it from the header, the homepage hero and every database page. |
| `sql-server-2016-end-of-support` | Support ended 14 July 2026; no Australian firm has claimed it. Frame it with Essential Eight and Privacy Act obligations — that's what no competitor has. Verify ESU facts against Microsoft's lifecycle pages before publishing. |
| `managed-sql-server-support` | **Must show the per-instance maths.** A competitor advertises "$999/month" for 3 instances ($333 each); Plan A is $1,500 for 10 ($150 each). Use a `pricing` block so the `OfferCatalog` schema picks it up automatically. |
| `sql-server-dba-melbourne` | Melbourne firm, Melbourne CBD address, absent from its own city's query while a US firm ranks. Needs genuinely local content, not a template with the city swapped. |
| `sql-server-support-plans` | Rebuilds the SQL-Server-specific commercial page the migration folded away. Then repoint the `/remote-database-support-plan-a` redirect here instead of `/pricing-and-plans#database-plans`. |
| `how-we-govern-offshore-dba-access` | **Commercially the most valuable page in this plan.** No vendor of any nationality ranks for *"is it safe to give an external company access to our production SQL Server"*. The substance is already written in `llms.txt`. |

**On the offshore page specifically:** every factual claim — named accounts, just-in-time elevation, session recording, Australian-resident-only access, the APP 8 / CPS 230 / NZ IPP 12 mapping — **must be confirmed with the business before publishing.** A plausible-sounding invented control is a legal exposure, not a copy error.

### Later
`sql-server-licensing-australia` + an interactive AUD licensing calculator (the link magnet — build it as a code route, not a CMS page) · `apra-cps-234-sql-server-compliance` · `essential-eight-sql-server-hardening` · `sql-server-performance-tuning` · `outsourced-sql-server-dba-australia` · `24-7-sql-server-support-australia` · `sql-server-dba-new-zealand` · `sql-server-dba-pacific-islands`

---

## Work Package 7 — Existing page content

Mostly CMS edits, no code.

### 7.1 Raise SQL Server density
Across the eight database pages, generic "database" outnumbers "SQL Server" roughly 2:1 — 5.5:1 on `/database-consultancy`. Add SQL-Server-specific sections, examples and FAQ entries without breaking the multi-platform message. Aim for parity.

### 7.2 `/emergency-database-support` — retarget
"emergency database support australia" returns **civil emergency management** content — NEMA, Wikipedia. The page cannot rank for it.
```
seoTitle: SQL Server Down? 24/7 Emergency DBA Australia | Onsys
H1:       SQL Server down? Emergency DBA support, 24/7
Target:   sql server down · database outage help · urgent dba support australia
```
Add a P1/P2/P3 severity table (a `cardGrid` or `checkList` block) with response and resolution targets — that format is reproduced verbatim in AI answers more than any other.

### 7.3 `/on-call-dba-services` — reframe
There is a real Australian company called **OnCall DBA Pty Ltd** whose LinkedIn, ZoomInfo and TheOrg profiles hold the top three results. You cannot beat a firm that owns the phrase as a trading name.
```
seoTitle: Standby SQL Server DBA Cover | $100 Per Instance | Onsys
Target:   standby dba cover · after-hours dba support australia
```
This is the site's strongest SQL Server page by term density and it opens on SQL Server — but the rebuild **removed "SQL Server" from its title tag**. Put it back.

### 7.4 Homepage
H1 is *"Keep your critical systems running. 24/7."* — a slogan with no keyword. Add a keyword-bearing H2 beneath it and link the SQL Server hub from the hero.

---

## Work Package 8 — Verification before every merge

```bash
npm run build          # workspace build: shared -> api -> web
npm run typecheck
npm run lint
npm run test
npm run test:e2e       # Playwright is already configured
```

Then against a preview:
- New/changed pages: `seoTitle` under 60 chars and unique · `seoDescription` 150–158 · one H1 · self-referencing canonical · **no trailing slash**
- `/sitemap.xml` includes new slugs, excludes `?category=`, has varied `lastmod`
- JSON-LD validates in Google's Rich Results Test with zero errors
- `/api/health` returns 200
- Crawl the preview with **Screaming Frog** (already installed on this machine) for broken links, duplicate titles and missing canonicals
- **Confirm `trailingSlash` is still unset**

Add a Playwright test asserting that every URL in `sitemap.xml` returns 200 — that single test would have caught the 49 missing blog redirects on the day of the migration.

One work package per pull request.
