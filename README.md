# Onsys Technologies — Website Platform

Production rebuild of onsys.com.au: **Next.js 15** frontend, **Express** API, **PostgreSQL + pgvector**, a hybrid **AI + Microsoft Teams** chatbot, and transactional email via the **Microsoft Graph API**.

Replaces the existing WordPress site, with a 301 redirect map so existing search rankings carry over.

---

## Contents

- [Architecture](#architecture)
- [Quick start](#quick-start)
- [Creating an admin user](#creating-an-admin-user)
- [Signing in — two-factor authentication](#signing-in--two-factor-authentication)
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
                                     # see "Creating an admin user" for the
                                     # Docker and PowerShell forms

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
| `GRAPH_*` | Leads still save to Postgres; notification emails are logged, not sent. **Outside production, chat and admin sign-in codes are written to the log so local development is not locked out — never in production, where a delivery failure must not put a live code in a log file** |
| `TEAMS_*` | Chat still works; escalation tells the visitor to phone instead |
| `OPENAI_API_KEY` | Chatbot escalates every question straight to a human |
| `TURNSTILE_SECRET` | Captcha check is skipped (honeypot + rate limiting still apply) |
| `ORG_PORTAL_ENABLED` | Defaults to `false`; incident replies give the phone number without the client-portal link |

This is deliberate: a missing integration degrades one feature rather than breaking the site.

---

## Creating an admin user

Admin accounts sign in at `/admin/login` and are the only way to reach the
content console, the leads list and the live chat console.

Pick the section for where you are running it — the command is different on the
VM, and the wrong one fails with `tsx: not found`.

### On the Azure VM (Docker)

Run it **inside the API container**, not on the host:

```bash
cd /opt/onsys
docker compose -f docker-compose.prod.yml exec api \
  npm run create:admin -w @onsys/api -- \
  --email=you@onsys.com.au --name="Your Name" --role=ADMIN
```

It then prompts for the password.

> **Why not on the host?** `/opt/onsys` is only the git checkout — `npm install`
> never runs there, so there is no `node_modules` and no `tsx`. Running
> `npm run create:admin` from the host fails with `sh: 1: tsx: not found`. The
> API image keeps its devDependencies precisely so this script, `seed` and
> `embeddings:build` can run inside the container.

Note `--%` is a **PowerShell** token. On the VM's shell it does nothing, so
leave it out.

### Locally

```bash
npm run create:admin -- --email=you@onsys.com.au --name="Your Name" --role=ADMIN
```

On **Windows PowerShell**, npm swallows the flags before the script sees them
("Unknown cli config"). Either insert `--%` to stop PowerShell parsing:

```powershell
npm run create:admin --% -- --email=you@onsys.com.au --name="Your Name" --role=ADMIN
```

or skip npm and call the script directly:

```powershell
cd apps/api
npx tsx src/scripts/create-admin.ts --email=you@onsys.com.au --name="Your Name" --role=ADMIN
```

### Options

| Flag | Required | Notes |
|---|---|---|
| `--email` | yes | Also the sign-in name. Lower-cased before storage. |
| `--name` | no | Defaults to `Administrator`. |
| `--role` | no | `ADMIN` or `EDITOR`. Defaults to `ADMIN`. |
| `--password` | no | Prompted for when omitted — **prefer that**, it keeps the password out of your shell history and out of the container's process list. |

Minimum 12 characters, hashed with Argon2id.

**Re-running with an existing email resets that account's password**, name and
role rather than failing. That is the supported way to recover a locked-out
admin — there is no self-service password reset.

---

## Signing in — two-factor authentication

Every admin sign-in needs a second factor. A correct password produces a
*challenge*, never a session, so a stolen password on its own opens nothing.

The second screen accepts any of three things in one field:

| Factor | When it applies |
|---|---|
| **Authenticator app** (TOTP) | Once enrolled — the primary factor |
| **Emailed code** | Admins not yet enrolled, or who click "email me a code instead" |
| **Recovery code** | A lost phone. Ten are issued at enrolment; each works once |

A challenge lasts 5 minutes and allows 5 attempts. Running out burns the
*challenge*, not the account — otherwise anyone holding a leaked password could
lock a real admin out at will by guessing.

### Enrolling an authenticator app

Sign in, go to **My account**, and choose **Set up authenticator app**. Scan the
QR with Microsoft Authenticator, Google Authenticator or 1Password, enter the
code it shows, then save the ten recovery codes. They are stored hashed, so
**that screen is the only time they are readable** — losing them means
re-enrolling, not recovering.

### Break-glass: enrolling from the VM

> **Do this for at least one admin immediately after deploying MFA.**

Until someone has an authenticator, *every* sign-in depends on the emailed code
— so a Microsoft Graph outage locks the whole team out of the console with no
way back in. `create:admin` does not help: it resets passwords, not the second
factor.

```bash
docker compose -f docker-compose.prod.yml exec api \
  npm run setup:mfa -w @onsys/api -- --email=you@onsys.com.au
```

It draws the QR code in the terminal, confirms a live code before switching
anything on, and prints the recovery codes. Anyone who can run it already has a
shell on the VM and the database credentials, so it grants no access they did
not already have.

For an admin who has lost their phone *and* used up their recovery codes:

```bash
docker compose -f docker-compose.prod.yml exec api \
  npm run setup:mfa -w @onsys/api -- --email=them@onsys.com.au --reset
```

That clears their authenticator; their next sign-in falls back to an emailed
code, and they can enrol again from **My account**.

### Verifying it before you rely on it

MFA depends on email for anyone not yet enrolled, so confirm delivery works
*before* signing out:

```bash
docker compose -f docker-compose.prod.yml logs api | grep -i "admin sign-in\|second factor"
```

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

Escalations go to a Teams channel through a Power Automate flow. Two `.env`
values, and one flow with a branch in it.

> **Do not set `TEAMS_TEAM_ID` / `TEAMS_CHANNEL_ID`.** Microsoft permits
> application-only posts to a Teams channel *only* for the migration/import
> API — a normal app-only post is refused with 401 no matter which permissions
> are granted or how thoroughly an admin consents. `ChannelMessage.Send` will
> not fix it. The code detects the refusal, logs it once and falls back to the
> webhook. These variables exist for a path Microsoft closed.
>
> **Private channels do not work either** — neither webhooks nor the Power
> Automate Teams connector will post to one. Use a standard channel.

### 1. Create the webhook

In Teams: hover the target channel → **⋯ → Workflows** → template
**"Post to a channel when a webhook request is received"** → confirm the team
and channel → copy the URL.

(Office 365 *Connectors* are retired; **Workflows** is the replacement.)

```env
TEAMS_WEBHOOK_URL=https://prod-xx.westus.logic.azure.com/workflows/...
TEAMS_INBOUND_SECRET=<openssl rand -hex 32>   # only for the two-way flow below
```

### 2. Branch the flow on `kind`

Every payload carries a top-level `kind`, and only one of them expects an
answer. Without a **Condition** on `triggerBody()?['kind']`, a flow built around
"post a card and wait for a response" parks on cards nobody is meant to answer.

| `kind` | What it is | Needs a reply box? |
|---|---|---|
| `chat-escalation` | Visitor asked for a human | **Yes** |
| `incident` | Possible P1 — visitor was sent to the phone | No |
| `lead` | Contact form submission | No |

Payloads also carry `sessionId`, `visitorName`, `visitorEmail`, `entryUrl`,
`reason` and `transcriptText` as flat top-level fields, so a flow reads
`triggerBody()?['sessionId']` rather than indexing into the card body — which
silently starts pointing at the wrong visitor the first time anyone reorders the
card. Values are escaped for direct substitution into Adaptive Card JSON.

### 3. Replying to the visitor

**From the admin console** (no licence needed). Every card carries a
**Continue in console** button linking to `/admin/chat?session=<id>`, which
survives the sign-in redirect and opens that conversation. Both sides poll every
few seconds.

**From inside Teams** (needs Power Automate **Premium** — the HTTP action is a
premium connector, and there is no free substitute). In the
`chat-escalation` branch use *Post adaptive card and wait for a response* with
an `Input.Text` (id `reply`), then an **HTTP** action:

```
POST https://www.onsys.com.au/api/chat/teams-reply
Header:       x-onsys-signature: <TEAMS_INBOUND_SECRET>
Content-Type: application/x-www-form-urlencoded
Body:         sessionId=@{encodeUriComponent(triggerBody()?['sessionId'])}
              &message=@{encodeUriComponent(body('PostCard')?['data']?['reply'])}
```

Form-encoded rather than JSON on purpose: `encodeUriComponent()` is one function
that handles quotes, newlines and ampersands in the agent's reply. The JSON
equivalent needs nested `replace()` calls that are easy to get subtly wrong. The
API accepts both.

The endpoint compares the signature in constant time. Note *wait for a response*
completes on the first submit — one reply per card; the conversation continues in
the console.

---

## The chatbot

**Hybrid model:** the AI handles routine questions; anything it can't answer well goes to a human.

```
Visitor opens the widget
      │
      ▼
 Name + email ──► 6-digit code emailed ──► verified?
      │ no                                    │ yes
      └─► chat stays locked                   ▼
                                       Visitor message
                                              │
                                              ▼
                              reportsIncident()? ──yes──► phone number
                                              │            + heads-up card
                                              │ no           (never queued)
                                              ▼
                              wantsHuman()? ──yes──► escalate to Teams
                                              │        ("talk to a human",
                                              │         complaint)
                                              ▼
                                    Retrieve from pgvector
                                              │
                                              ├─ nothing above RAG_MIN_SCORE
                                              │     └──► escalate (never guesses)
                                              ▼
                              LLM answers, grounded + citations
                                              │
                                              └─ model sets needsHuman ──► escalate
```

**The email gate.** The widget asks for a name and address and emails a
six-digit code; nothing can be sent until it comes back. Enforced server-side on
`/message` and `/escalate`, not only in the widget — the widget is the one part
an abuser can rewrite. It makes a captured address worth treating as a lead, and
prices out casual abuse: every conversation now costs a working inbox. Codes are
hashed (salted with the session id), last 10 minutes, allow 5 attempts, and can
be resent once a minute.

**Live incidents leave the chat.** Chat carries no reference number and starts
no SLA clock, so it is the wrong place to raise a P1. `reportsIncident()`
answers with the 24/7 number instead and sends the team a heads-up card with no
reply box, once per conversation. "down" only counts beside something that can
be down — "are your prices coming down?" is not an outage. Set
`ORG_PORTAL_ENABLED=true` to add the client-portal link once DBPulse is live;
until then the reply is phone-only, because pointing someone mid-outage at a
portal that is still hidden is worse than not mentioning it.

**Ending a chat.** The visitor can end the conversation and the transcript is
emailed to the address they verified. Closing never fails on the email — someone
clicking "end chat" wants it closed.

**Retention.** Transcripts hold names, addresses, IPs and whatever a visitor
typed, so they are a liability once stale. **Admin → Chat → Delete old
sessions** removes closed conversations past a chosen age; the confirmation says
how many first, and anything still awaiting a reply is excluded regardless of
age.

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

Pages are composed from **blocks** (`packages/shared/src/blocks.ts`) — `hero`, `cardGrid`, `pricing`, `faq`, `steps`, `platformChips`, `ctaBand`, and so on. Each block type maps to one renderer in `components/blocks/BlockRenderer.tsx`. Adding a section type means adding a Zod variant and a case in the renderer; editors can then reorder and reuse it without touching code.




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




