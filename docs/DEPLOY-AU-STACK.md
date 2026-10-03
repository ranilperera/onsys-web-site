# Second stack on the same VM — `/opt/onsys-au`

Runs this branch as a **separate deployment** beside the live site: its own
checkout, its own database, its own images, its own port. The live stack at
`/opt/onsys` keeps serving onsys.com.au the whole time, and nothing in this
procedure writes to it. HAProxy is repointed at the end, as a deliberate
cutover with a one-line rollback.

```
                     ┌─ 127.0.0.1:3009 ─▶ /opt/onsys      (live)   project onsys
Internet ─▶ HAProxy ─┤                    data /opt/data           images :latest
                     └─ 127.0.0.1:3010 ─▶ /opt/onsys-au   (new)    project onsys-au
                                          data /opt/data-au        images :au
                                          postgres on 127.0.0.1:5434
```

## What keeps the two apart
Four values, all in `/opt/onsys-au/.env`. Each one is something that damages the
live site quietly rather than failing loudly, which is why there is a preflight
script that refuses to start without them.

| Value | If it collides |
|---|---|
| `COMPOSE_PROJECT_NAME=onsys-au` | Compose adopts the **live containers** and redeploys them |
| `IMAGE_TAG=au` | `build` overwrites `onsys-api:latest` / `onsys-web:latest` — the tags the live containers were created from, so the live app silently moves to this code on its next restart |
| `DATA_ROOT_AU=/opt/data-au` | Two Postgres clusters on one data directory. Not a conflict Postgres survives |
| `APP_PORT=3010` | The edge cannot bind, and the stack half-starts |

`COMPOSE_PROJECT_NAME` set in `.env` overrides the `name: onsys` inside
`docker-compose.prod.yml`, so there is no `-p` flag to remember. Verified, not
assumed — `docker compose config` resolves to `onsys-au`.

## 1. Clone the branch
```bash
sudo mkdir -p /opt/onsys-au /opt/data-au
sudo chown "$USER":"$USER" /opt/onsys-au /opt/data-au
git clone -b onsys-au https://github.com/ranilperera/onsys-web-site.git /opt/onsys-au
cd /opt/onsys-au
```

## 2. Build its `.env`
```bash
cp .env.au.example .env
```

Then, in `.env`:

1. Set a **fresh** `POSTGRES_PASSWORD`, and put the same value in `DATABASE_URL`.
2. Generate a **fresh** `REVALIDATE_SECRET` — `openssl rand -hex 32`. Sharing the
   live one means a cache purge on either stack purges the other.
3. Copy `ORG_*`, `GRAPH_*`, `TURNSTILE_*`, `STRIPE_*`, `LEAD_NOTIFY_TO` and
   `HEALTHCHECK_*` across from `/opt/onsys/.env` verbatim. Without them this is
   not the same application.
4. Leave `SITE_URL` / `NEXT_PUBLIC_SITE_URL` pointing at
   `https://www.onsys.com.au`. This stack serves the same hostname once HAProxy
   moves; changing them bakes the wrong canonical and the wrong API base into
   the client bundle.

A quick way to carry the shared half over without hand-copying — check the
result before using it:

```bash
grep -E '^(ORG_|GRAPH_|TURNSTILE_|STRIPE_|LEAD_NOTIFY_TO|HEALTHCHECK_)' /opt/onsys/.env >> .env
```

## 3. Preflight
```bash
./scripts/preflight-au-stack.sh
```

It refuses to continue on a shared project name, image tag, data directory,
port, secret or placeholder password, and it checks both ports are actually
free. Expected output ends `PREFLIGHT OK`.

## 4. Bring up the database only
The order matters. A full stack would start the API, which runs
`prisma migrate deploy` against an empty cluster and creates every table — and
the old database then has nowhere to be restored to. So Postgres first:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.au.yml up -d --build postgres
```

Confirm the two stacks are genuinely separate before going further:

```bash
docker compose -p onsys    ps --format '{{.Name}}	{{.Image}}'   # :latest, untouched
docker compose -p onsys-au ps --format '{{.Name}}	{{.Image}}'   # :au
docker image ls | grep -E 'onsys-(api|web)'                      # both tags present
```

## 5. Copy the live database across
**Not a fresh seed.** Most of this site does not exist in the seed files:

| Table | In the seed | Only in the database |
|---|---|---|
| `posts` | 3 | **52** — the WordPress archive, which is most of the site's traffic |
| `redirects` | — | **53** — built by the blog-redirect backfill |
| `content_chunks` | — | **139** — chatbot embeddings, rebuilt only by paying for them again |
| `users` | — | the admin account, its TOTP secret and its recovery codes |
| `leads`, `bookings`, `chat_sessions`, `health_check_tokens` | — | everything anyone has ever submitted |

Seeding a new cluster would produce a site with three blog posts. Dump and
restore instead:

```bash
# From the live stack. 12 MB or so; check you have room first.
df -h /opt
cd /opt/onsys
docker compose exec -T postgres pg_dump -U onsys -d onsys --no-owner --no-privileges   | gzip > /tmp/onsys-$(date +%F-%H%M).sql.gz
ls -lh /tmp/onsys-*.sql.gz
```

Note the time you took it — step 8 checks whether anything arrived afterwards.

```bash
# Into the new cluster, which is empty.
cd /opt/onsys-au
gunzip -c /tmp/onsys-<the file you just made>.sql.gz   | docker compose -f docker-compose.prod.yml -f docker-compose.au.yml       exec -T postgres psql -U onsys -d onsys -v ON_ERROR_STOP=1
```

`ON_ERROR_STOP=1` matters: without it psql reports errors and carries on, and a
half-restored database looks like a working one. The dump carries its own
`CREATE EXTENSION vector`, and both clusters run the same pgvector image, so the
embeddings restore as they are.

Check the counts match before going on:

```bash
for t in posts pages redirects content_chunks users leads bookings chat_sessions; do
  old=$(cd /opt/onsys && docker compose exec -T postgres psql -U onsys -d onsys -At -c "select count(*) from $t")
  new=$(cd /opt/onsys-au && docker compose -f docker-compose.prod.yml -f docker-compose.au.yml exec -T postgres psql -U onsys -d onsys -At -c "select count(*) from $t")
  printf '%-18s old=%-6s new=%-6s %s
' "$t" "$old" "$new" "$([ "$old" = "$new" ] && echo OK || echo MISMATCH)"
done
```

## 6. Start the rest, migrate, then seed
```bash
cd /opt/onsys-au
docker compose -f docker-compose.prod.yml -f docker-compose.au.yml up -d --build
docker compose -f docker-compose.prod.yml -f docker-compose.au.yml logs api | grep -i migrat
```

The API applies migrations on start, so it adds exactly the two this branch
introduces — `leads.country` and the `jobs` table — on top of the restored
history. Then apply this branch's content changes:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.au.yml exec api npm run seed -w @onsys/api
```

That is what rewrites the home page, retires the withdrawn claims, sets the
canonical on `/managed-database-services`, applies the 3-business-day turnaround
and holds the staff augmentation page as a draft. It rewrites seeded pages, so
any page edit made in `/admin` and not reflected in `seed-content.ts` is
replaced — the same as every deploy to the live stack today.

The nav seed is **not** run: the footer rows were restored from the live
database, including the Careers link, which is updated in place instead:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.au.yml exec -T postgres   psql -U onsys -d onsys -c "update nav_links set href='/careers', \"updatedAt\"=now() where label='Careers';"
```

No `create:admin`: the restored `users` row is the existing account, with its
password and MFA enrolment intact.

## 7. Verify on 3010, before HAProxy knows it exists
```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3010/                      # 200
curl -s http://127.0.0.1:3010/healthz                                                # ok
curl -s http://127.0.0.1:3010/sitemap.xml | grep -c '<loc>'                          # 90+
curl -s http://127.0.0.1:3010/ | grep -o '24/7 database support for teams[^<]*'      # new hero
curl -s http://127.0.0.1:3010/careers | grep -c 'No open roles'                      # 1
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3010/software-development-staff-augmentation  # 404
curl -s -I 'http://127.0.0.1:3010/?mailpoet_page=subscriptions' | head -1            # 301
curl -s http://127.0.0.1:3010/free-20-point-sql-server-health-check | grep -c '3 business days'  # >0
curl -s http://127.0.0.1:3010/ | grep -c plausible.io                                # 1
```

And confirm the live stack is still itself:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3009/     # 200
curl -s http://127.0.0.1:3009/ | grep -c 'Keep your critical systems running'   # 1 = old hero, untouched
```

Then log into `https://<vm>:3010`-equivalent via a tunnel, or check
`/admin/jobs` through HAProxy after the cutover, and post a job.

## Two things to know before the cutover

**HAProxy currently intercepts some paths itself.** `/remote-database-support-plan-a`,
`-plan-b` and `-plan-c` return 200 from HAProxy rather than following the
repository's 301 to `/managed-sql-server-support#plans`. Moving the backend does
not change that — whatever rule is doing it will still apply, to the new stack
as it did to the old. Worth finding while you are in the file:

```bash
sudo grep -nE 'plan-a|plan-b|plan-c|redirect|acl' /etc/haproxy/haproxy.cfg
```

**Anything submitted between the dump and the cutover exists only in the old
database.** While HAProxy still points at 3009, a lead, a booking or a
health-check claim lands in `/opt/data`, and the copy taken in step 5 already
happened. Keep the window short — ideally dump, restore, verify and cut over in
one sitting — and run the straggler check in step 9 before stopping the old
stack. It is a handful of rows at most, but `health_check_tokens` is the one
that matters: each row is a customer who has already had their free check.

## 8. Cut HAProxy over
The HAProxy config is **not in this repository**, so this is the one step that
cannot be scripted from here. On the VM, find the backend that currently sends
traffic to `127.0.0.1:3009` — typically `/etc/haproxy/haproxy.cfg`:

```bash
sudo grep -n '3009' /etc/haproxy/haproxy.cfg
sudo cp /etc/haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg.bak-$(date +%F)
```

Change the server line in that backend:

```
# before
    server onsys 127.0.0.1:3009 check

# after
    server onsys 127.0.0.1:3010 check
```

Then, in this order — `-c` validates the file and refuses to reload a broken one:

```bash
sudo haproxy -c -f /etc/haproxy/haproxy.cfg
sudo systemctl reload haproxy        # reload, not restart: no dropped connections
curl -s -o /dev/null -w '%{http_code}\n' https://www.onsys.com.au/
curl -s https://www.onsys.com.au/ | grep -o '24/7 database support for teams[^<]*'
```

### Rollback

One line back, and the live stack has been running untouched the whole time:

```bash
sudo cp /etc/haproxy/haproxy.cfg.bak-$(date +%F) /etc/haproxy/haproxy.cfg
sudo haproxy -c -f /etc/haproxy/haproxy.cfg && sudo systemctl reload haproxy
```

## 9. Stop the old stack
Only now, with the site verified through HAProxy on the new backend.

First check nothing arrived in the old database after the dump — leads, bookings
or a health-check claim submitted during the cutover window:

```bash
cd /opt/onsys
for t in leads bookings emergency_requests chat_sessions health_check_tokens; do
  printf '%-22s ' "$t"
  docker compose exec -T postgres psql -U onsys -d onsys -At     -c "select count(*) from $t where \"createdAt\" > '<the dump timestamp>'"
done
```

Anything non-zero is a row that exists only in the old database. Copy those few
across by hand before stopping it — `health_check_tokens` especially, because it
carries the one-free-check-per-customer rule, and losing a row lets a past
recipient claim a second free check.

Then stop it:

```bash
cd /opt/onsys
docker compose stop
docker compose ps        # all four Exited
docker ps                # kimai-prod and kimai-prod-lk still running, untouched
```

`stop`, not `down`: the containers stay, so rollback is `docker compose start`
and a one-line HAProxy change. Use `down` only once you are certain, and never
delete `/opt/data` — it is the only copy of everything the old stack collected.

Two containers on this VM belong to another application entirely —
`kimai-prod` on 8001 and `kimai-prod-lk` on 8002. Nothing in this procedure
touches them, and `docker compose stop` from `/opt/onsys` cannot reach them
because it is scoped to the `onsys` project. Do not use bare `docker stop $(docker ps -q)`.

## Decommissioning the old stack, later
Only once the new one has served real traffic for long enough to trust:

```bash
cd /opt/onsys
docker compose down                 # containers only; /opt/data is left alone
```

Keep `/opt/data` until you are certain. It is the only copy of everything the
old stack collected.
