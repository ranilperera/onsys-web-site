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

## 4. Bring it up

Both files, every time — the second adds the overlay that pins the data
directory and publishes Postgres on loopback:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.au.yml up -d --build
```

Confirm the two stacks are genuinely separate before going further:

```bash
docker compose -p onsys    ps --format '{{.Name}}\t{{.Image}}'   # :latest, untouched
docker compose -p onsys-au ps --format '{{.Name}}\t{{.Image}}'   # :au
docker image ls | grep -E 'onsys-(api|web)'                      # both tags present
```

## 5. Migrate and seed the new database

It is an empty cluster. The API container applies migrations on start
(`docker-entrypoint-api.sh`), so this is the content and the first admin user:

```bash
cd /opt/onsys-au
docker compose -f docker-compose.prod.yml -f docker-compose.au.yml exec api npm run seed -w @onsys/api
docker compose -f docker-compose.prod.yml -f docker-compose.au.yml exec api npm run seed:nav -w @onsys/api
docker compose -f docker-compose.prod.yml -f docker-compose.au.yml exec api npm run create:admin -w @onsys/api
```

`seed` is required, not optional: it is what applies the held-as-draft status to
the staff augmentation page and loads every page this branch changed.

## 6. Verify on 3010, before HAProxy knows it exists

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

## 7. Cut HAProxy over

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

## Two things to know before the cutover

**HAProxy currently intercepts some paths itself.** `/remote-database-support-plan-a`,
`-plan-b` and `-plan-c` return 200 from HAProxy rather than following the
repository's 301 to `/managed-sql-server-support#plans`. Moving the backend does
not change that — whatever rule is doing it will still apply. Worth finding
while you are in the file:

```bash
sudo grep -nE 'plan-a|plan-b|plan-c|redirect|acl' /etc/haproxy/haproxy.cfg
```

**The two databases diverge from the moment both are up.** Leads, bookings,
chat sessions and health-check requests that arrive while HAProxy still points
at 3009 land in `/opt/data`, and anything after the cutover lands in
`/opt/data-au`. Content is reproducible from the seed; **submissions are not**.
If the cutover is more than a few minutes after step 5, dump and restore the
operational tables, or do the cutover immediately after seeding:

```bash
cd /opt/onsys
docker compose exec -T postgres pg_dump -U onsys -d onsys \
  -t leads -t bookings -t emergency_requests -t chat_sessions -t chat_messages \
  -t health_check_tokens --data-only > /tmp/ops.sql
cd /opt/onsys-au
docker compose -f docker-compose.prod.yml -f docker-compose.au.yml \
  exec -T postgres psql -U onsys -d onsys < /tmp/ops.sql
```

Check the row counts match before and after, and remember `health_check_tokens`
carries the one-free-check-per-customer rule — losing it lets a previous
recipient claim a second free check.

## Decommissioning the old stack, later

Only once the new one has served real traffic for long enough to trust:

```bash
cd /opt/onsys
docker compose down                 # containers only; /opt/data is left alone
```

Keep `/opt/data` until you are certain. It is the only copy of everything the
old stack collected.
