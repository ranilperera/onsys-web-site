# Docker deployment — Azure VM behind HAProxy

Runs the whole platform as containers on one Ubuntu VM. HAProxy already on the
VM terminates TLS and forwards plain HTTP to **127.0.0.1:3009**, which is the
only port this stack opens.

Every command and every value below was verified by building the images and
running the full stack end to end, not written from the template.

```
Internet ──▶ HAProxy  (TLS, on the VM host)
                │  plain HTTP
                ▼
        127.0.0.1:3009
                │
          ┌─────┴──────┐
          │ edge nginx │  routes /api → api, everything else → web
          └─────┬──────┘
       ┌────────┴────────┐
       ▼                 ▼
  web :3000         api :4000
  Next.js            Express
                         │
                         ▼
                  postgres :5432
          data in /opt/data/postgres on the host
```

Nothing but the edge publishes a port, and it binds **loopback only** — HAProxy
is on the same host, so nothing here should be reachable from off the VM.

---

## 1. Prepare the VM

```bash
sudo apt update && sudo apt upgrade -y

# Docker Engine + compose plugin from Docker's own repository. The Ubuntu
# "docker.io" package is usually several versions behind and ships no compose.
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
newgrp docker            # or log out and back in

docker --version && docker compose version
```

Create the data directory. Postgres runs as uid 999 inside the container and
writes straight to this path on the host:

```bash
sudo mkdir -p /opt/data/postgres /opt/data/backups
sudo chown -R 999:999 /opt/data/postgres
sudo chmod 700 /opt/data/postgres
```

> **Why `/opt/data/postgres` rather than `/opt/data` itself.** The compose file
> also sets `PGDATA` to a `pgdata` subdirectory inside it. If the mount point is
> ever a separate Azure data disk, `initdb` refuses to run in a directory
> containing `lost+found`, and the subdirectory sidesteps that entirely.

Firewall — HAProxy is the only thing that faces the internet:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable     # 3009 is NOT opened; it is loopback-only
```

---

## 2. Get the code

```bash
sudo mkdir -p /opt/onsys && sudo chown "$USER":"$USER" /opt/onsys
git clone https://github.com/ranilperera/onsys-web-site.git /opt/onsys
cd /opt/onsys
```

---

## 3. Configure `.env`

`.env` is not in the repository. Create it beside the compose file — Docker
Compose reads it automatically for both variable substitution and `env_file`.

```bash
cp .env.example .env
chmod 600 .env
nano .env
```

Values that must be set or changed:

```ini
NODE_ENV=production

# --- Deployment shape ---
APP_PORT=3009
DATA_ROOT=/opt/data
# HAProxy -> edge nginx -> api. See the warning below before changing this.
TRUST_PROXY_HOPS=2

# --- Postgres (the compose file builds DATABASE_URL from these) ---
POSTGRES_USER=onsys
POSTGRES_PASSWORD=<openssl rand -base64 24>
POSTGRES_DB=onsys

# --- Public URLs. Baked into the browser bundle at build time. ---
SITE_URL=https://www.onsys.com.au
API_URL=https://www.onsys.com.au
NEXT_PUBLIC_SITE_URL=https://www.onsys.com.au
NEXT_PUBLIC_API_URL=https://www.onsys.com.au

SESSION_SECRET=<openssl rand -base64 32>

# --- Microsoft Graph: email, Teams and calendar booking ---
GRAPH_TENANT_ID=<tenant guid>
GRAPH_CLIENT_ID=<client guid>
GRAPH_CLIENT_SECRET=<client secret>
GRAPH_SENDER_UPN=<sending mailbox>
BOOKING_CALENDAR_UPN=<booking mailbox>

TURNSTILE_SECRET=          # leave empty — see the warning below
OPENAI_API_KEY=<optional, chatbot only>
```

> **`NEXT_PUBLIC_API_URL` is the origin only — do not append `/api`.** Every
> browser call adds its own `/api/...` path, so `https://www.onsys.com.au/api`
> produces `/api/api/leads` and a silent 404. Server-rendered pages keep working
> because they use `INTERNAL_API_URL`, so the site looks healthy while the
> contact form, booking and chat all fail. The app now strips a trailing `/api`
> defensively, but set it correctly anyway.


> **Leave `TURNSTILE_SECRET` empty unless the Turnstile widget is actually
> wired into the forms.** There is no widget in the web app today, so no form
> sends a token. Setting the secret alone makes the API reject every contact
> form and booking submission with a 400 before the handler runs — and because
> outbound mail is fire-and-forget, nothing appears in the log except the 400.
> The API now refuses to enforce a captcha unless `TURNSTILE_SITE_KEY` is set
> too, so a half-configured deployment degrades to "no captcha" rather than
> "no submissions".

`DATABASE_URL` in `.env` is ignored: the compose file overrides it, because
inside the container network the database is `postgres:5432`, never `localhost`.

> **`TRUST_PROXY_HOPS` is a security setting, not a tuning knob.** Express walks
> back this many entries in `X-Forwarded-For` to find the real client IP. With
> HAProxy in front of the edge nginx there are **two** hops. Set it to `1` and
> every visitor appears to be HAProxy, so one person's traffic rate-limits the
> whole site. Set it too high and a client can spoof its own address by sending
> its own `X-Forwarded-For`. If you ever remove the edge container or put the
> app straight behind HAProxy, change this to `1`.

> **`NEXT_PUBLIC_*` and `ORG_*` are build-time.** Next substitutes them into the
> client bundle during the image build. Changing one needs
> `docker compose -f docker-compose.prod.yml up -d --build web` — a restart will
> not pick it up.

---

## 4. Build and start

```bash
cd /opt/onsys
docker compose -f docker-compose.prod.yml up -d --build
```

First build takes roughly 5–10 minutes on a B2s. Watch it come up:

```bash
docker compose -f docker-compose.prod.yml ps
```

All four services should reach `healthy`:

```
NAME                 SERVICE    STATUS
onsys-api-1          api        Up (healthy)
onsys-edge-1         edge       Up (healthy)
onsys-postgres-1     postgres   Up (healthy)
onsys-web-1          web        Up (healthy)
```

**Migrations run automatically.** The API entrypoint waits for Postgres and then
applies `prisma migrate deploy` before starting the server, so a fresh database
is schema-ready without a manual step. Confirm:

```bash
docker compose -f docker-compose.prod.yml logs api | grep -A6 entrypoint
```

---

## 5. Seed content and create an admin

The database is empty until you seed it. All of these run inside the API
container, which carries the toolchain for exactly this reason:

```bash
cd /opt/onsys
C="docker compose -f docker-compose.prod.yml"

# Pages, blocks, redirects and the starter posts. Idempotent — safe to re-run.
$C exec api npm run seed -w @onsys/api

# Admin login for /admin.
$C exec api npm run create:admin -w @onsys/api -- \
    --email=you@onsys.com.au --name="Your Name" --role=ADMIN

# Optional, only with OPENAI_API_KEY set — builds the chatbot's embeddings.
$C exec api npm run embeddings:build -w @onsys/api
```

To bring across the WordPress blog archive as well:

```bash
$C exec api npm run import:wp -w @onsys/api -- --posts-only
```

---

## 6. Verify before pointing HAProxy at it

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3009/            # 200
curl -s http://127.0.0.1:3009/healthz                                      # {"status":"ok",...}
curl -s http://127.0.0.1:3009/api/content/pages | head -c 120              # JSON
curl -s http://127.0.0.1:3009/sitemap.xml | grep -c '<loc>'                # 30+
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3009/oncall      # 301
```

If `/` returns 200 and the sitemap has more than a handful of URLs, the whole
chain — edge, web, api, database — is working.

---

## 7. HAProxy

Add to `/etc/haproxy/haproxy.cfg`:

```haproxy
frontend https_in
    bind :80
    bind :443 ssl crt /etc/haproxy/certs/onsys.com.au.pem alpn h2,http/1.1

    http-request redirect scheme https unless { ssl_fc }

    # The app needs to know the original scheme and client address. Without
    # these two headers the site builds http:// links behind an https:// site,
    # and every visitor shares one rate-limit bucket.
    http-request set-header X-Forwarded-Proto https if { ssl_fc }
    http-request set-header X-Forwarded-For %[src]

    # Apex to www, so search engines see a single origin.
    http-request redirect prefix https://www.onsys.com.au code 301 \
        if { hdr(host) -i onsys.com.au }

    default_backend onsys_app

backend onsys_app
    option forwardfor
    # Checks the full chain through to the API, not just that the port is open.
    option httpchk GET /healthz
    http-check expect status 200
    server onsys 127.0.0.1:3009 check inter 10s fall 3 rise 2
```

```bash
sudo haproxy -c -f /etc/haproxy/haproxy.cfg    # validate first
sudo systemctl reload haproxy
```

The certificate file HAProxy wants is the private key and the **full chain**
concatenated into one PEM:

```bash
sudo cat /etc/letsencrypt/live/www.onsys.com.au/fullchain.pem \
         /etc/letsencrypt/live/www.onsys.com.au/privkey.pem \
    | sudo tee /etc/haproxy/certs/onsys.com.au.pem > /dev/null
sudo chmod 600 /etc/haproxy/certs/onsys.com.au.pem
```

> **Serve the full chain, not just the leaf.** The August 2026 SEO audit found
> the current production site sends an incomplete chain: browsers paper over it
> by fetching the missing intermediate, but non-browser clients — which is every
> search and AI crawler — fail with `unable to get local issuer certificate`.
> The audit measured roughly a 20% fetch success rate as a result. Verify with a
> non-browser client, never by loading the site:
>
> ```bash
> openssl s_client -connect www.onsys.com.au:443 \
>   -servername www.onsys.com.au </dev/null 2>/dev/null \
>   | grep -E '^ *[0-9] s:|Verify return code'
> ```

---

## 8. Deploying an update

```bash
cd /opt/onsys
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Migrations apply on API start. Re-seed only when page content changed:

```bash
docker compose -f docker-compose.prod.yml exec api npm run seed -w @onsys/api
```

`up -d --build` recreates containers one service at a time, and HAProxy's health
check pulls the backend out while the edge is briefly down. For a genuinely
seamless deploy, build first and swap after:

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d --no-deps web api
```

**Content edits take up to 5 minutes to appear** — service pages are cached with
ISR (`revalidate = 300`). To publish immediately:

```bash
docker compose -f docker-compose.prod.yml restart web
```

---

## 9. Backups

Postgres data lives at `/opt/data/postgres`, but **do not back that directory up
by copying it while the container runs** — a file-level copy of a live cluster
is not a consistent backup. Use `pg_dump`:

```bash
sudo tee /usr/local/bin/onsys-backup.sh > /dev/null <<'SH'
#!/usr/bin/env bash
set -euo pipefail
cd /opt/onsys
STAMP=$(date +%F-%H%M)
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U onsys -d onsys --clean --if-exists \
  | gzip > "/opt/data/backups/onsys-$STAMP.sql.gz"
find /opt/data/backups -name '*.sql.gz' -mtime +14 -delete
SH
sudo chmod +x /usr/local/bin/onsys-backup.sh

# 02:00 daily
( sudo crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/onsys-backup.sh" ) | sudo crontab -
```

Restore:

```bash
gunzip -c /opt/data/backups/onsys-2026-08-26-0200.sql.gz \
  | docker compose -f docker-compose.prod.yml exec -T postgres psql -U onsys -d onsys
```

Back up `.env` separately — it is not in git, and losing it means reconstructing
every Graph credential by hand. Azure Key Vault or an encrypted blob, never the
repository.

---

## 10. Operations

```bash
cd /opt/onsys
C="docker compose -f docker-compose.prod.yml"

$C ps                          # health of all four services
$C logs -f api                 # follow API logs
$C logs --tail=100 web
$C restart web                 # also clears the ISR cache
$C exec postgres psql -U onsys -d onsys      # database shell
$C exec api sh                 # shell in the API container
$C down                        # stop everything (data survives in /opt/data)
docker system prune -af        # reclaim disk from old images
```

Disk fills up faster than you expect on a 64 GB VM — each rebuild leaves the
previous image behind. Prune monthly.

---

## 11. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `/` returns 404, other pages work | Database empty, or content not seeded | `$C exec api npm run seed -w @onsys/api`, then `$C restart web` |
| Sitemap has only 3 URLs | Web container started before the database was seeded | `$C restart web` |
| Every visitor shares one rate limit | `TRUST_PROXY_HOPS` too low | Set to `2` in `.env`, `$C up -d api` |
| Site builds `http://` links | HAProxy not sending `X-Forwarded-Proto` | Add the `http-request set-header` line in §7 |
| Phone/ABN wrong in header or footer | `ORG_*` values are build-time | `$C up -d --build web` |
| Booking page says "offline right now" | `BOOKING_CALENDAR_UPN` or a `GRAPH_*` value missing | Add to `.env`, `$C up -d api` |
| `initdb: directory not empty` | `/opt/data/postgres` has `lost+found` | The compose `PGDATA` subdirectory handles this; check ownership is `999:999` |
| API restart loop | Cannot reach Postgres | `$C logs api`, then `$C logs postgres` |
| 503 from HAProxy | Edge container down | `$C ps`, `$C logs edge` |
| 502 from nginx after a deploy | Edge holding a stale upstream IP (fixed — pull and rebuild) | `$C restart edge` |
| Content pages 404 while `/` and `/blog` work | ISR cached a `notFound()` from a moment the API was down (fixed — pull and rebuild) | `$C restart web` |
| Port 3009 already in use | Another stack bound it | `sudo ss -lntp | grep 3009` |

---

## 12. Security checklist

- [ ] `.env` is `chmod 600` and owned by the deploy user
- [ ] `POSTGRES_PASSWORD` and `SESSION_SECRET` generated with `openssl rand`, not typed
- [ ] Only 22, 80 and 443 open in the Azure NSG; SSH restricted to known addresses
- [ ] Port 3009 is bound to `127.0.0.1` — confirm with `sudo ss -lntp | grep 3009`
- [ ] Postgres publishes no port at all (`$C ps` shows no host mapping)
- [ ] `TRUST_PROXY_HOPS` matches the real number of proxies
- [ ] HAProxy serves the full certificate chain — verified with `openssl s_client`
- [ ] `TURNSTILE_SECRET` left EMPTY until the Turnstile widget is built — setting it alone rejects every form submission
- [ ] Graph credential scoped with an Application Access Policy (see `DEPLOYMENT.md` §10)
- [ ] Calendar reminder set before the Graph client secret expires
- [ ] A backup has actually been restored once, not just created

---

## Appendix — why the stack is shaped this way

**Why an nginx container when HAProxy is already there.** The platform is two
services that must share one origin: the browser calls `/api/...` on the public
hostname, so no request is ever cross-origin and CORS never enters the picture.
HAProxy could route both, but that would put application routing rules in the
VM's shared config; keeping them in `infra/nginx/edge.conf` means the app owns
its own routing and HAProxy only has to know about one port.

**Why the API image keeps devDependencies.** Migrations, seeding and
`create:admin` all run inside that container, and each needs a tool that is a
devDependency — `prisma` and `tsx`. Stripping them would save a few hundred
megabytes and take every operational command with it.

**Why the web image uses Next's standalone output.** Copying the hoisted
workspace `node_modules` produced a 1.39 GB image; tracing only what the server
actually needs produces **353 MB**, with `sharp` still included so `next/image`
keeps emitting AVIF.

**Why four routes are `force-dynamic`.** The homepage, blog index, `sitemap.xml`
and `llms.txt` all read from the database, which does not exist during
`next build`. Left as default ISR routes, Next baked the empty render into the
image — the homepage shipped as a **404** and the sitemap as **3 URLs** — and
served it until the revalidate window expired, on every single rebuild.
Rendering them on request makes them correct from the first hit; the underlying
API fetches still carry their own revalidate, so the database is not queried per
request.

**Why `INTERNAL_API_URL` exists.** Server-side rendering must not fetch through
the public hostname. An Azure VM generally cannot reach its own public IP,
because the load balancer does not hairpin — so an SSR fetch to
`https://www.onsys.com.au/api` would hang and every page would fall back to its
empty state. Server code uses `http://api:4000` over the container network; the
browser keeps using the public origin.
