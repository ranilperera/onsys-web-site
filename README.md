# Onsys Technologies — Website Platform

Production rebuild of onsys.com.au: **Next.js 15** frontend, **Express** API, **PostgreSQL + pgvector**, a hybrid **AI + Microsoft Teams** chatbot, and transactional email via the **Microsoft Graph API**.

Replaces the existing WordPress site, with a 301 redirect map so existing search rankings carry over.

---

## Contents

- [Architecture](#architecture)
- [Quick start](#quick-start)
- [Migrating content from WordPress](#migrating-content-from-wordpress)
- [Microsoft Graph — email setup](#microsoft-graph--email-setup)
- [Microsoft Teams — chat escalation setup](#microsoft-teams--chat-escalation-setup)
- [The chatbot](#the-chatbot)
- [SEO & AEO](#seo--aeo)
- [Deployment](#deployment)
- [Testing](#testing)
- [Project structure](#project-structure)

---

## Architecture

```
                    ┌──────────────────────────────┐
  Browser ────────► │  Nginx (TLS, rate limiting)  │
                    └───────────┬──────────────────┘
                       ┌────────┴────────┐
                       ▼                 ▼
              ┌─────────────────┐  ┌──────────────┐
              │ Next.js :3000   │  │ Express :4000│
              │ SSG/ISR pages   │  │ REST API     │
              │ SEO + JSON-LD   │  │ Auth, leads, │
              │ Chat widget     │  │ chat, admin  │
              └─────────────────┘  └──────┬───────┘
                                          │
                          ┌───────────────┼──────────────┐
                          ▼               ▼              ▼
                  ┌──────────────┐  ┌──────────┐  ┌────────────┐
                  │ PostgreSQL   │  │ MS Graph │  │  OpenAI    │
                  │ + pgvector   │  │ Mail +   │  │  chat +    │
                  │              │  │ Teams    │  │ embeddings │
                  └──────────────┘  └──────────┘  └────────────┘
```

**Why a split rather than Next.js route handlers:** the API carries workloads the web tier shouldn't — Teams polling, embedding generation, webhook receivers. Keeping it separate means chat traffic can't degrade page rendering, and either tier scales independently.

**Rendering:** every marketing page is statically generated at build time and revalidated every 5 minutes (ISR). A CMS edit goes live without a redeploy, and crawlers always get fully-rendered HTML — which matters for both SEO and AI assistants that don't execute JavaScript.

---

## Quick start

**Requirements:** Node 20+, Docker (or a local PostgreSQL 16 with the `vector` extension).

```bash
git clone <repo> onsys-platform && cd onsys-platform
npm install

cp .env.example .env
# At minimum set DATABASE_URL and SESSION_SECRET (openssl rand -hex 32).
# Graph / Teams / OpenAI are optional — the app degrades gracefully without them.

docker compose up -d postgres        # or point DATABASE_URL at your own instance

npm run db:generate                  # generate the Prisma client
npm run db:migrate                   # create the schema
npm run db:seed                      # load the approved pages + first article

npm run create:admin -- --email=you@onsys.com.au --name="Your Name"

npm run dev                          # web :3000, api :4000
```

> **Note on the first migration:** the `pgvector` extension must exist before the
> `content_chunks.embedding` column can be created. The Prisma schema declares
> it via `postgresqlExtensions`, so `prisma migrate dev` handles this — but the
> database user needs privileges to run `CREATE EXTENSION`. On managed Postgres
> (Azure Database for PostgreSQL), enable `vector` in the server parameters
> first.

### What works without optional credentials

| Missing credential | Behaviour |
|---|---|
| `GRAPH_*` | Leads still save to Postgres; notification emails are logged, not sent |
| `TEAMS_*` | Chat still works; escalation tells the visitor to phone instead |
| `OPENAI_API_KEY` | Chatbot escalates every question straight to a human |
| `TURNSTILE_SECRET` | Captcha check is skipped (honeypot + rate limiting still apply) |

This is deliberate: a missing integration degrades one feature rather than breaking the site.

---

## Migrating content from WordPress

The importer reads your live site — run it from a machine that can reach onsys.com.au.

```bash
# 1. Dry run first — see what would be imported, write nothing
npm run import:wp -- --source=https://www.onsys.com.au --dry-run

# 2. Import as drafts (default) so you can review before anything goes public
npm run import:wp -- --source=https://www.onsys.com.au

# 3. Review at http://localhost:3000/admin/posts, publish what looks right

# 4. Rebuild the chatbot's index so it can cite the new content
npm run embeddings:build
```

If the WordPress REST API is disabled, export instead (**wp-admin → Tools → Export → All content**) and run:

```bash
npm run import:wp -- --file=./onsys.WordPress.xml
```

**What the importer does:**

- Pulls posts *and* pages via `/wp-json/wp/v2/`, following pagination
- Strips Gutenberg block comments, `wp-*` classes and inline styles
- Sanitises all HTML (DOMPurify) before storage
- Carries across Yoast SEO titles, descriptions and OG images where present
- Maps categories, creating them as needed
- Estimates read time from word count
- **Creates a 301 redirect from every old URL to its new path** — this is what preserves your rankings
- Is idempotent: matches on `legacyUrl`, so re-running updates rather than duplicating

---

## Microsoft Graph — email setup

1. **Azure Portal → App registrations → New registration** (single tenant is fine)
2. **API permissions → Add → Microsoft Graph → Application permissions → `Mail.Send`**
3. **Grant admin consent** ← easy to miss; nothing works without it
4. **Certificates & secrets → New client secret** → copy the *Value*
5. Fill in `.env`:

```env
GRAPH_TENANT_ID=<Directory (tenant) ID>
GRAPH_CLIENT_ID=<Application (client) ID>
GRAPH_CLIENT_SECRET=<the secret Value>
GRAPH_SENDER_UPN=noreply@onsys.com.au   # must be a real licensed mailbox
LEAD_NOTIFY_TO=sales@onsys.com.au
```

**Strongly recommended.** `Mail.Send` as an application permission grants the ability to send as *any* mailbox in the tenant. Restrict it to one:

```powershell
New-ApplicationAccessPolicy -AppId <GRAPH_CLIENT_ID> `
  -PolicyScopeGroupId <mail-enabled-security-group> `
  -AccessRight RestrictAccess `
  -Description "Restrict website app to the noreply mailbox"
```

Verify with `Test-ApplicationAccessPolicy`.

**Emails sent:** internal enquiry notification (reply-to set to the enquirer), visitor auto-acknowledgement, and chat transcripts on request. All are branded HTML built from the site's colour tokens.

---

## Microsoft Teams — chat escalation setup

Two options; the code picks the richer one automatically when configured.

### Option A — Incoming Webhook (simplest, one-way)

1. In Teams, open the target channel → **⋯ → Connectors → Incoming Webhook**
2. Name it "Onsys Website", copy the URL
3. `TEAMS_WEBHOOK_URL=https://...`

Escalations post as an Adaptive Card with the transcript and a link into the admin console, where staff reply. Replies reach the visitor through the admin console, not Teams.

### Option B — Graph channel messages (two-way, recommended)

Staff reply **in the Teams thread** and it appears in the visitor's widget.

1. Add these **Application** permissions to the same app registration, with admin consent:
   - `ChannelMessage.Send`
   - `ChannelMessage.Read.All`
2. Get the IDs from the channel's **Get link to channel** URL:

```env
TEAMS_TEAM_ID=<groupId from the link>
TEAMS_CHANNEL_ID=<19:xxxx@thread.tacv2>
```

The API polls the thread for replies while a conversation is live.

**Lower-latency alternative:** rather than polling, have a Power Automate flow trigger on new channel replies and POST to:

```
POST /api/chat/teams-reply
Header: x-onsys-signature: <TEAMS_INBOUND_SECRET>
Body:   { "sessionId": "...", "message": "...", "authorName": "..." }
```

Generate the secret with `openssl rand -hex 32`. The endpoint compares it in constant time and rejects anything else.

---

## The chatbot

**Hybrid model:** the AI handles routine questions; anything it can't answer well goes to a human.

```
Visitor message
      │
      ▼
 wantsHuman()?  ──yes──► escalate to Teams
      │ no                 (outage/urgent/"talk to a human"/complaint)
      ▼
 Retrieve from pgvector
      │
      ├─ nothing above RAG_MIN_SCORE ──► escalate (never guesses)
      │
      ▼
 LLM answers, grounded in retrieved chunks + citations
      │
      └─ model sets needsHuman ──► escalate
```

**Why it refuses rather than guesses:** a confidently wrong answer about someone's SLA or pricing is worse than no answer. The system prompt forbids inventing services, prices, SLAs or client names, and retrieval below the similarity floor triggers a handoff instead of a fabricated response. Answers carry citations linking back to the source page.

**Keeping the index fresh** — re-run after any content change:

```bash
npm run embeddings:build          # incremental
npm run embeddings:build -- --all # full rebuild
```

Tune `RAG_MIN_SCORE` (default `0.28`) to trade coverage against caution: raise it to escalate sooner, lower it to let the bot attempt more.

---

## SEO & AEO

**SEO** gets pages ranked. **AEO** (answer engine optimisation) gets them *quoted* by AI assistants and featured snippets. Both are implemented site-wide.

| Feature | Where |
|---|---|
| Per-page title/description/canonical | `lib/seo.ts` → `buildMetadata()` |
| OG + Twitter cards | same |
| `Organization`, `ProfessionalService`, `WebSite` | emitted once in `layout.tsx` |
| `BreadcrumbList` | every inner page |
| `Service` | commercial pages |
| `TechArticle` | blog posts |
| **`FAQPage`** | any page/post with FAQs — the highest-leverage AEO markup |
| **`HowTo`** | auto-extracted from `Step N —` headings in articles |
| `sitemap.xml` | `app/sitemap.ts`, driven from the database |
| `robots.txt` | `app/robots.ts`, explicitly allows GPTBot/ClaudeBot/PerplexityBot |
| **`llms.txt`** | `app/llms.txt/route.ts` — curated plain-text site summary for AI crawlers |
| 301 redirect map | `middleware.ts` + database-driven redirects |

Two deliberate choices worth knowing about:

- **FAQ answers stay in the DOM** when the accordion is collapsed (hidden via `max-height`, not unmounted) so crawlers read every answer.
- **`llms.txt` includes guardrails** — it tells assistants to direct pricing questions to a consultation rather than quoting a figure, and notes that case studies are illustrative.

If Onsys would rather *not* be used as AI training data, remove the corresponding `userAgent` entries from `app/robots.ts`.

---

## Deployment

Target: Azure Linux VM (Ubuntu 22.04+), Docker Compose behind Nginx.

```bash
# On the VM
sudo mkdir -p /opt/onsys-platform && cd /opt/onsys-platform
git clone <repo> .
cp .env.example .env && nano .env      # fill in production values

docker compose build
docker compose up -d postgres
docker compose run --rm api npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
docker compose run --rm api node apps/api/dist/scripts/seed.js
docker compose up -d

# TLS + reverse proxy
sudo cp infra/nginx/onsys.conf /etc/nginx/sites-available/onsys
sudo ln -s /etc/nginx/sites-available/onsys /etc/nginx/sites-enabled/
sudo certbot --nginx -d onsys.com.au -d www.onsys.com.au
sudo nginx -t && sudo systemctl reload nginx
```

`.github/workflows/deploy.yml` automates redeploys on push to `main` (secrets: `AZURE_VM_HOST`, `AZURE_VM_USER`, `AZURE_VM_SSH_KEY`). It runs migrations, restarts, and fails loudly if `/health` doesn't come back.

### Security posture

- Postgres bound to `127.0.0.1` only — never exposed publicly
- Containers run as non-root users
- Helmet, HSTS, CSP, `X-Frame-Options: DENY`
- Rate limiting at both Nginx and application layers
- Argon2id password hashing; httpOnly session cookies
- Double-submit CSRF on all admin mutations
- Zod validation on every input; DOMPurify on all stored HTML
- Honeypot + optional Turnstile on the contact form
- Visitor IPs are HMAC-hashed, never stored raw
- Message bodies and secrets redacted from logs

### Cutover checklist

1. Import and publish WordPress content; confirm redirects resolve
2. Run `npm run embeddings:build`
3. Verify `/sitemap.xml`, `/robots.txt`, `/llms.txt`
4. Submit the sitemap in Google Search Console; use the URL Inspection tool on 3–4 key pages
5. Send a test enquiry — confirm both emails arrive and the Teams card posts
6. Open the chat widget, ask a question, then click "talk to a human" and confirm it reaches Teams
7. Keep the WordPress site running until redirects are confirmed in Search Console

---

## Testing

```bash
npm test           # unit (Vitest)
npm run test:e2e   # end-to-end (Playwright, desktop + mobile)
npm run typecheck
npm run lint
```

The E2E suite asserts things that are easy to regress: single `<h1>` per page, **zero horizontal overflow at mobile widths**, canonical/OG/JSON-LD presence, `sitemap`/`robots`/`llms.txt` serving, WordPress 301s resolving, skip-link focus, image `alt` coverage, keyboard-operable mobile nav, chat widget opening, and contact-form validation.

On a machine with a pre-installed Chromium (CI images, sandboxes):

```bash
CHROMIUM_PATH=/path/to/chrome npm run test:e2e
CHROMIUM_NO_SANDBOX=1 ...   # only if running as root in a container
```

---

## Project structure

```
apps/
  web/                     Next.js 15 (App Router)
    src/app/               routes, sitemap, robots, llms.txt, admin console
    src/components/        Header, Footer, ChatWidget, ContactForm, blocks/
    src/lib/               api client, SEO builders, site config
    src/middleware.ts      301 redirects + trailing-slash normalisation
  api/                     Express + Prisma
    prisma/schema.prisma   data model
    src/routes/            content, leads, chat, auth, admin
    src/services/          email (Graph), teams, rag
    src/scripts/           seed, import-wordpress, build-embeddings, create-admin
packages/
  shared/                  Zod schemas + block types shared by both apps
infra/                     Dockerfiles, Nginx config
tests/e2e/                 Playwright specs
```

### Content model

cd C:\DEV2026\onsys-platform\onsys-platform\apps\api
npx tsx src/scripts/create-admin.ts --email=ranil@onsys.com.au --name="Ranil Perera" --role=ADMIN




Pages are composed from **blocks** (`packages/shared/src/blocks.ts`) — `hero`, `cardGrid`, `pricing`, `faq`, `steps`, `platformChips`, `ctaBand`, and so on. Each block type maps to one renderer in `components/blocks/BlockRenderer.tsx`. Adding a section type means adding a Zod variant and a case in the renderer; editors can then reorder and reuse it without touching code.


npm run create:admin --% -- --email=ranil@onsys.com.au --name="Ranil Perera" --role=ADMIN



On Windows PowerShell npm eats the flags before the script sees them
("Unknown cli config"). Run the script directly instead:
  npx tsx src/scripts/create-admin.ts --email=... --name="..." --role=ADMIN


==============================


How it works
GET /api/bookings/availability → calendar/getSchedule on the target mailbox, intersected with slots already taken through the site. POST /api/bookings → POST /events with isOnlineMeeting: true, which makes Exchange mint the Teams link. Both are app-only; nobody signs in.

The privacy requirement drove a real design decision
The visitor is not added as a Graph attendee. Doing that would make Exchange send the invitation from the consultant's own mailbox — publishing exactly the address the site is meant to keep private. Instead:

The event lands on the consultant's calendar with the visitor's details in the body.
The visitor gets our own branded confirmation carrying the Teams link, plus an .ics attachment so it still reaches their calendar. Its ORGANIZER is CN=Onsys Consultant with the generic ORG_EMAIL.
BOOKING_CONSULTANT_NAME ("Onsys Consultant") is what appears in the UI, the email, and the calendar file. The mailbox address exists only in .env.
That meant adding attachment support to the email sender, which it didn't have.

Things worth knowing
Double-booking is prevented in the database, not just the app. Filtering taken slots out of the availability response and inserting the booking aren't atomic, so the migration adds a partial unique index on startsAt WHERE status IN ('PENDING','CONFIRMED'). A losing race gets a 409, and the widget reloads the grid while keeping the visitor's typed details. Cancelled/failed rows are excluded, so a released slot is immediately rebookable.

Times are DST-correct. No date library was installed, so timezone.ts does the Intl two-pass offset resolution. Tests cover both Melbourne offsets and assert that 01:30 → 03:30 on the spring-forward day is one UTC hour apart, not two. One of my own tests was wrong at first — it sliced the UTC date off the ISO string, but a 09:00 Melbourne slot falls on the previous UTC day.

The posted time is never trusted. The server regenerates the day's legitimate slots and rejects anything off-grid, plus re-checks live free/busy for that specific window.

If Graph fails after persistence, the row is marked FAILED rather than deleted — staff keep the request, and the slot frees up.

I verified the full UI (slot grid → details → confirmation, the 409 path, mobile) by stubbing the API through Playwright, since there's no tenant configured yet.

Two things you need to do
1. Restart the web dev server. NEXT_PUBLIC_ORG_BOOKING_URL is inlined at startup, so the topbar "Book a call" button still serves the old WordPress URL. The footer link and seeded page links already point to /book.

2. Grant the Graph permission. .env.example has the full block; the app registration needs Calendars.ReadWrite (Application) with admin consent. I'd strongly suggest scoping it to just that mailbox — otherwise the credential can read and write every calendar in the tenant:


New-ApplicationAccessPolicy -AppId <client-id> `
  -PolicyScopeGroupId <booking-mailbox-upn> `
  -AccessRight RestrictAccess -Description "Onsys web booking"




