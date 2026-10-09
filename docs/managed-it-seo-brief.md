# Managed IT SEO/AEO — implementation brief for Claude in VS Code

**Repo:** `C:\DEV2026\onsys-platform\onsys-platform`
**Target page:** `https://www.onsys.com.au/managed-it-services`
**Revised:** 11 September 2026, **after reading the repository**
**Source:** Report VIII — 30 AU managed IT queries measured, Onsys present on zero; 8 AU MSPs profiled.

> **This file replaces an earlier version written before the code was read.**
> Four of its seven tasks were already done. They have been removed rather than
> left in as busywork, and what replaced them is in *Verified state* below.

---

## How to use this

Paste the **Kickoff prompt** into Claude in VS Code with this file in the workspace. Work the tasks in order. Task 1 is a diagnosis, not a change.

### Kickoff prompt

```
Read onsys-managed-it-seo-brief.md in the repo root. It is an implementation
brief from an SEO/AEO audit of /managed-it-services, revised after reading
this repository on 11 Sep 2026.

Before changing anything, confirm the "Verified state" section still matches
the code. Several earlier audits of this site asserted things that turned out
to be already fixed, and one asserted a P0 that was simply wrong. If anything
in that section is out of date, tell me before proceeding.

Read these first:
  apps/web/src/middleware.ts
  apps/web/src/app/sitemap.ts
  apps/web/src/lib/seo.ts            (buildMetadata)
  apps/api/src/scripts/seed-content.ts  (the `managed-it-services` entry
                                         ~line 5357, `managedItBlocks` ~line 2540)

Then work Task 1 only — it is a diagnosis and produces a finding, not a commit.
Stop and report before touching Task 2.

Rules for the whole brief:
- Page content lives in seed-content.ts, not in JSX.
- Keep the existing comment style: comments explain WHY, and cite the specific
  incident that motivated the rule. That convention is already strong in this
  repo — match it.
- Every new page needs seoTitle, seoDescription, faqs and blocks.
- seoTitle must NOT end in " | Onsys". The root layout appends it.
- Do not invent client names, testimonials, logos or metrics. Leave a marked
  TODO for Ranil.
- Do not change prices. Where a price decision is needed, ask.
- Run `npm run test` in apps/api after touching content or seeding logic.
```

---

## Verified state, 11 September 2026

### Already done — do not redo

Read directly from the code. All of this shipped after Report VII.

| Item | Where | Evidence |
|---|---|---|
| **`contentUpdatedAt` wired end-to-end** | migration `20260911090000`, `apps/api/src/lib/content-changed.ts`, `content.routes.ts` `select`, `apps/web/src/lib/api.ts` type, `sitemap.ts` `freshness()` | The fingerprint approach is right — whitespace-collapsed, key-order-stable, and it excludes presentation-only fields. Falls back to `updatedAt` for pre-migration rows. |
| **Title-suffix guard** | `seo.ts` → `TITLE_SUFFIX` + `title: … ? { absolute } : …` | Comment cites the exact incident. **Verified live:** `/on-call-dba-services` now renders `Standby SQL Server DBA Cover \| $100 Per Instance \| Onsys` — one suffix. |
| **`on-call-dba-services` seoTitle cleaned** | `seed-content.ts` ~line 5092 | Now `'Standby SQL Server DBA Cover \| $100 Per Instance'`. **No seoTitle in the file ends in `\| Onsys` any more** — checked all 38. |
| **Author routes in the sitemap** | `sitemap.ts` `authorEntries`, `content.routes.ts` author query | And the API only returns authors with a published post, so a thin profile is never offered. Better than what was asked for. |
| **`/offshore-software-development` → `/custom-software-development`** | `middleware.ts` | The Report VII trust contradiction. Closed. |
| **`/remote-database-support-plan-a\|b\|c` → `/managed-sql-server-support#plans`** | `middleware.ts` | Better target than the one Report VII suggested — a page whose title and H1 both say SQL Server, which is what they ranked for. |
| **Trailing-slash 308 normalisation** | `middleware.ts`, first branch | Code is correct. |
| **Blog redirect tooling** | `apps/api/src/scripts/backfill-blog-redirects.ts` | Idempotent, with loop and collision guards, writing to the `Redirect` table so `/admin` can correct them without a deploy. |
| **`/sql-server-migration-and-upgrade-services`** | `seed-content.ts`, 38 pages now | The "project work" page Report VII recommended. Exists. |

**Middleware is running in production.** Confirmed live: `/oncall` resolves to the on-call DBA page and `/about-us` resolves to the About page — neither has a page of its own, so only the redirect map can be producing that.

### Still open — verified by reading

| # | Item | Detail |
|---|---|---|
| 1 | One redirect not taking effect | See Task 1 |
| 2 | Sitemap priority list uses a slug that does not exist | `sitemap.ts`: `['managed-database-services', 'pricing', 'contact', 'expertise']`. The slug is **`pricing-and-plans`**, so the pricing page has never received the 0.9 priority. The SQL Server silo and `managed-it-services` are not in the list either. |
| 3 | Sitemap cache still 1 hour | `getSitemapData` uses `revalidate: 3600`. This is the cache that produced two rounds of false audit findings. 300s would make post-deploy verification honest. |
| 4 | Paginated archives unredirected | `/category/database` → `/blog` exists, but the lookup is an exact key match, so `/category/database/page/3\|4\|5` fall through. All three are indexed. |
| 5 | `/blog?page=1…5` indexed | Query strings never reach the redirect map. Needs handling at the route, not in middleware. |
| 6 | `POA` on two of three tiers | Unchanged. See Task 2 — it is a policy decision, not a bug. |
| 7 | Managed IT page content | Unchanged. Title, heading, lede, blocks and 8 FAQs are exactly as audited. |
| 8 | Missing pages | No managed IT pricing page; no city page except `sql-server-dba-melbourne`; no Essential Eight page. |
| 9 | Zero social proof | No named client, logo, testimonial or case study anywhere on the site. |

---

## The finding, in one paragraph

Onsys appears on **none of 30** Australian managed IT queries. The page is not weak — 2,100 words, 8 FAQs, real vendor names. Three things are wrong. **(1)** Google's indexed copy is `/managed-it-services/` *with a trailing slash*, last crawled **23 July**, still serving the WordPress title, while the clean URL was last crawled 31 August. **(2)** The page targets national terms that are 75–86% directory-held (Clutch, DesignRush, Cloudtango) while ignoring city and pricing terms that are 0–17% directory-held. **(3)** The one differentiator nobody else has — published pricing — shows "POA" on two of three tiers. Separately: **none of the eight profiled MSPs employs an in-house database team**, and that differentiator is currently FAQ #8.

---

## Task 1 — Diagnose one redirect that is not firing

**This is a diagnosis. Produce a finding, not a commit.** Stop for review.

`/how-to-save-with-onsys-remote-database-services` is in `STATIC_REDIRECTS` pointing at `/pricing-and-plans`. Fetched live on 11 September, it still serves the **blog article**, H1 *"With Onsys Remote Database Services you can save up to 50% of DBA cost"*. Meanwhile `/oncall` and `/about-us` redirect correctly from the same map.

That combination is the interesting part: the map works, and this entry does not.

```
Work out why. Candidate explanations, in the order I would test them:

1. The deployed build predates this entry. Check when the entry was added
   (git log -S on the string in middleware.ts) against the last deploy.
   This is the most likely answer and the cheapest to confirm.

2. HAProxy holds a cached 200 for this path. This site's caching layer has
   produced false readings in two previous audits, so it is a live suspect.
   Test by requesting with a cache-busting query string AND a
   Cache-Control: no-cache header, and compare.

3. Something serves the path before middleware. Check whether a Page or Post
   row exists with this exact slug, and whether apps/web/src/app/[slug]/page.tsx
   could resolve it.

Report which one it is. Do NOT patch around it — if the redirect map is
correct (it is) then adding a second mechanism hides the real fault and the
same fault is probably suppressing other redirects too.
```

**Why this matters beyond one URL.** Google currently holds 93 "Not found (404)" and eleven trailing-slash duplicate pairs including `/managed-it-services/`. If the cause here is deployment lag or a cache layer, the same cause is holding those open — and no content work on the managed IT page reaches the index until it is resolved.

### 1b. Two small sitemap fixes, once Task 1 is understood

```
In apps/web/src/app/sitemap.ts:

- The money-page priority list names 'pricing', but the slug is
  'pricing-and-plans', so that page has never received 0.9. Fix the slug and
  add the pages that now matter:
    'pricing-and-plans', 'sql-server-dba-services', 'managed-sql-server-support',
    'managed-it-services', 'free-20-point-sql-server-health-check'
  Leave a comment saying the old entry silently matched nothing — that is
  exactly the kind of bug this repo's comment style is good at preventing.

In apps/web/src/lib/api.ts:

- getSitemapData uses revalidate: 3600. Drop to 300. An hour-long cache on the
  one artefact used to verify a deploy has already produced two rounds of false
  audit findings.
```

---

## Task 2 — The POA decision (needs Ranil, not code)

**Not a bug.** In `seed-content.ts` the Advanced and Premium plans carry `price: 'POA'` with `unit: 'per month · up to 100 users'`, so the card renders **"POA per month"**. A deliberate choice, rendering awkwardly.

It matters more than it looks. Of the eight leading AU MSPs profiled, **zero publish their own rates** — five show nothing, two (KMTech, Intellect IT) rank for pricing keywords with *market range* guides that never disclose their own rates, and one (Truis) links a "pricing table" containing no figures. Published pricing is the single differentiator nobody is contesting. "POA" appears at exactly the moment a reader tests whether the claim is real.

Three options, preferred first:

1. **Publish real numbers.** Strongest; the only one that fully lands the differentiator.
2. **Publish a "from" figure** — `price: 'From $9,000'`, `unit: 'per month · up to 100 users'`. Keeps negotiating room, keeps the claim honest.
3. **Fix the string only** — `price: 'Scoped'`, `unit: 'to your headcount · up to 100 users'`. Removes the awkward rendering without changing policy. Weakest, still better than today.

```
Ask Ranil. Do not pick one.

If he chooses 1 or 2, update BOTH places — they are separate data and will drift:
  - the pricing-page `plans` array (~lines 893 and 914)
  - the managed IT page cardGrid `tag` fields (~lines 2647 and 2653)
Consider whether the managed IT cards should read from the pricing data instead
of repeating it. The file's own comment above managedItBlocks already argues for
exactly that: "the inclusions have one source of truth and cannot drift apart."
```

---

## Task 3 — Rewrite the managed IT page

All in `seed-content.ts`, in the `managed-it-services` entry (~line 5357) and `managedItBlocks` (~line 2540).

### 3a. Title, description, heading, lede

```
  seoTitle: 'Managed IT Support Melbourne | Priced Openly'
  // Three deliberate changes, each measured in the September audit:
  // "Support" not "Services" — the more-used head noun in AU search, and what
  //   the broadest-ranking competitor (Otto IT, 9 of 30 queries) leads with.
  // "Melbourne" not "Australia" — the national SERP is 75-86% directories
  //   (Clutch, DesignRush, Cloudtango); the city SERP is ~0% and returns MSP
  //   sites almost exclusively.
  // "Priced Openly" not the figure — the number is in the description and on
  //   the page; the claim is what no competitor can make, and leading with
  //   $4,500 anchors a twelve-person prospect before they see the scope.
  // No "| Onsys" — the root layout template appends it, and buildMetadata now
  //   strips a hand-typed duplicate rather than rendering two.

  seoDescription:
    'Melbourne managed IT from $4,500/month ex-GST, all three tiers priced on the page. 24/7 service desk, Essential Eight aligned, senior DBAs on the same team.'

  heading: 'Managed IT support in Melbourne'

  lede:
    'Managed IT support is the outsourcing of your entire IT function — service desk, network, servers, endpoints, backup and Microsoft 365 — to an external team for a fixed monthly fee. Onsys runs it for Melbourne businesses from $4,500 a month, with every tier priced on this page, and senior SQL Server DBAs on the same team rather than a subcontractor.'
```

The lede is an answer-first definition in the same pattern as `/sql-server-dba-services` and `/remote-database-support`: define the category, then place Onsys inside it with specifics. 58 words — inside the 40–60 window for featured snippets and AI extraction.

> **If Task 2 lands on option 3,** "all three tiers priced on the page" becomes false. Change it to "pricing published, not gated" and say you did.

### 3b. Replace the "Why businesses hand us their IT" cardGrid

Currently four cards — Experience / Customised solutions / Reliability / Scalability. Every competitor makes all four claims and none substantiates them. Replace with four only Onsys can make:

```
Card 1 — "Your DBA is not a subcontractor"
  When the database is the problem, most MSPs raise a ticket with someone else.
  Onsys runs 24/7 SQL Server cover as its own business line. Same team, same
  SLA, no handoff.
  Link: /managed-sql-server-support — deliberately, because that page is still
  unindexed and needs the internal link more than this page does.

Card 2 — "Essential Eight, not just 'security'"
  Name the ACSC maturity level delivered and what is included at each tier.
  Link: /grc-and-compliance — already indexed (crawled 5 Sep), already maps
  ACSC, ISO 27001, CPS 234 and SOC 2, and is currently connected to the managed
  IT offer only through the nav.
  TODO for Ranil: which maturity level Onsys actually delivers. Do not guess.

Card 3 — "All three prices, on the page"
  Not one of the eight leading Australian MSPs publishes its own rates. Say so
  explicitly — the claim is stronger when the reader knows it is rare.
  Link: /pricing-and-plans#managed-it-plans

Card 4 — "What switching actually looks like"
  The first thirty days, what is needed from the incumbent, what happens if it
  goes badly. Onboarding is the main objection to changing MSP and no
  competitor page answers it.
  TODO for Ranil: the real transition process. Do not invent one.
```

### 3c. FAQ: 8 → 14

Keep the existing eight. **Move *"Can managed IT be combined with database support?"* from last to first** — it is the most differentiated sentence on the page, sitting where nobody reads it.

Add six, phrased as the measured queries are phrased:

```
1. "How much does managed IT support cost in Australia?"
   Give the market band AND the Onsys number: $120-$280 per user per month is
   the published Australian range; Onsys is $4,500/month for up to 30 users,
   which is $150 per user at full capacity. Giving both is precisely what
   KMTech and Intellect IT avoid doing.

2. "Is managed IT cheaper than hiring an internal IT person?"
   A measured query currently held by US content.
   TODO for Ranil: the loaded AU salary figure to compare against.

3. "Do you support Essential Eight compliance?"   (TODO: see card 2)

4. "What happens if we already have an internal IT person?"
   The co-managed entry point. "co-managed it services australia" is a measured
   query nobody strong owns.

5. "How does switching from our current IT provider work?"   (TODO: see card 4)

6. "What happens when the problem is the database?"
   The differentiator asked directly — the answer an AI assistant should be
   able to quote verbatim.
```

### 3d. Smaller fixes, same page

```
- Add a numeric SLA per tier. The DBA pages commit to one hour; this page says
  "priority response". TODO for Ranil: the actual per-tier response targets.
- Surface the ticket-cap reasoning. The existing FAQ answer frames it well
  ("capping tickets is what makes the monthly fee predictable for both sides")
  — put that in the pricing block body, not only in the FAQ, because "25 per
  month" at $4,500 reads as a limit on first contact.
- Put "IT support" in at least two H2/H3 headings. The page currently uses
  "helpdesk" once and "support" in no heading at all.
```

---

## Task 4 — New page: `/managed-it-services-pricing`

The highest-yield new page available. The cost cluster is **0% directory-held**, entirely MSP-owned, and every incumbent ranking there publishes market ranges rather than rates. Onsys has rates.

```
New entry in seed-content.ts:
  slug: 'managed-it-services-pricing'
  seoTitle: 'Managed IT Pricing Melbourne | Published Rates'
  heading: 'Managed IT support pricing in Melbourne'

Structure:
  1. Answer-first lede: what managed IT costs in Australia generally
     ($120-$280 per user per month), then the Onsys tiers inside that range.
     Being the page that answers the question fully is what wins this cluster.
  2. A `pricing` block reusing the same plan data as /pricing-and-plans.
     Import it; do not copy it.
  3. A section answering the floor objection (below).
  4. FAQs targeting: "managed it services cost australia", "how much does
     managed it support cost australia", "managed it services pricing per user
     australia", "it support cost per user australia".

Also add the slug to the sitemap money-page priority list from Task 1b.

The competitor to beat is Tech Seek — title tag "Managed IT Services Pricing
Melbourne | Real Prices, Published" — not Brennan or Interactive.
```

**The floor objection this page must answer.** $4,500 for 30 users is $150/user — mid-market and defensible. At *twelve* users it is **$375/user**, above the top of every published Australian band. Tech Seek publishes **$955/month for up to 25 staff**. Any prospect who compares will find this.

```
TODO for Ranil — business decision, not code:
  (a) add an entry tier below 30 seats, or
  (b) state explicitly what $4,500 buys that $955 does not — the 24/7 desk,
      the SummitAI ITSM platform, the in-house DBA team.
Option (b) needs no pricing change and is defensible. Ask before writing either.
```

Schema comes free: `offerCatalogSchema` in `seo.ts` already emits `Offer` with `priceSpecification` from CMS pricing blocks, and `[slug]/page.tsx` prefers it over plain `Service` when a page publishes prices.

---

## Task 5 — New page: `/managed-it-support-melbourne`

**Gated.** Do not start until Task 1's finding is resolved and Task 3 has shipped and been recrawled.

Report VII established that this index is already rejecting near-duplicate service pages — three SQL Server pages remain unindexed for exactly that reason, and Google holds eleven overlapping remote-DBA service pages across two URL schemes. Adding city pages before the duplicates consolidate repeats the mistake.

```
When it is time:
  slug: 'managed-it-support-melbourne'
  seoTitle: 'IT Support Melbourne | Managed IT From $4,500/mo'

Not a template. Specific to Melbourne, following /sql-server-dba-melbourne:
  - Level 1, 530 Little Collins Street, Melbourne VIC 3000
  - What on-site attendance actually means and when it happens
  - Melbourne-relevant compliance drivers
  - Reciprocal links with /managed-it-services

Sydney and Brisbane follow ONLY once Melbourne has indexed and shows movement.
One at a time.
```

The pattern is proven here: `/sql-server-dba-melbourne` ranks #7. Competitors run 4–8 city pages each (KMTech 4, Otto 5, Virtual IT Group 8); Onsys runs one, on the database side.

---

## Task 6 — Internal links

Under the duplication diagnosis from Report VII, internal links are not housekeeping — they are the mechanism by which you tell Google which of several similar pages you prefer.

```
Contextual body links, in seed-content.ts block copy — not nav, not footer:

  /managed-it-services       → /managed-sql-server-support   (still unindexed)
  /managed-it-services       → /grc-and-compliance
  /managed-it-services       → /managed-it-services-pricing  (after Task 4)
  /pricing-and-plans         → /managed-it-services
  /managed-database-services → /managed-sql-server-support
       — the indexed incumbent pointing at its intended successor. The single
         strongest signal available that the new page is the one you want.
  /remote-database-support   → /sql-server-dba-services
```

---

## Task 7 — Verify

```
After Tasks 1-3:
  1. npm run test in apps/api — content-changed tests must pass
  2. npm run build in apps/web
  3. Re-seed locally and diff the sitemap output. Confirm:
     - lastmod values are SPREAD, not all identical
     - /about/ranil-perera is present
     - /managed-it-services appears once, without a trailing slash
     - /pricing-and-plans now carries priority 0.9
  4. Fetch the built page and confirm the title is exactly:
       "Managed IT Support Melbourne | Priced Openly | Onsys"
     — one brand suffix, not two
  5. Confirm the FAQPage JSON-LD carries 14 entries
  6. Re-request the Task 1 URL and confirm it now redirects
```

---

## What to measure, and when

| When | Metric | Why |
|---|---|---|
| Week 2 | Has `/managed-it-services` been recrawled? Has the slash duplicate left the index? | The only meaningful signal until it happens |
| Week 4 | **Impressions** in Search Console for any query containing "managed IT" or "IT support" | Impressions move before positions; at zero of thirty, the first win is appearing at all |
| Week 8 | Positions on Melbourne-qualified and pricing-qualified terms **only** | Do not track national head terms — 75–86% directories, not the target |

Total indexed site-wide should **fall** from 169 toward ~100 as consolidation lands. A dropping number is success.

---

## What this brief deliberately does not do

- **No invented proof.** Every social-proof item is a TODO. Brennan shows 30+ client logos, Otto 9 named testimonials, KMTech 318 Google reviews at 4.9. Onsys has none, and fabricating any would be worse than having none.
- **No price changes.** Task 2 and the Task 4 floor objection both need a business decision.
- **No national head-term targeting.** "managed service provider australia" returns six directories out of seven. Getting listed on Clutch, Cloudtango, DesignRush and manageditproviders.com.au is the route there — a listings exercise outside this repo.
- **No vertical pages yet.** Accounting and healthcare are real clusters, but pick from the actual client base rather than search volume.

## One judgement flagged as a judgement

Leading with the database differentiator rests on a verified observation — none of the eight profiled MSPs advertises an in-house DBA team, checked on their own pages. What that does **not** establish is whether Melbourne SMB buyers weight it when choosing an MSP. A thirty-person accounting firm may not run SQL Server at all. The differentiator is real; its market size is untested. It belongs on the page because it costs nothing and nobody can copy it — but the segment question is one sales conversations answer better than search data does.

## A note on this repo

The comment style here is unusually good — comments explain why a decision was made and cite the incident that motivated it, which is why re-reading the code caught four completed tasks that an assumption-based brief would have had Claude redo. Two of the fixes are also better than what was originally recommended: the plan-page redirects point at `/managed-sql-server-support#plans` rather than the generic pricing table, and the author sitemap query excludes profiles with no published posts. Worth keeping that convention on everything added from this brief.
