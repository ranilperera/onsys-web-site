# Deploying Onsys Platform to an Azure VM

End-to-end guide for running this monorepo on a single Ubuntu VM behind Nginx,
with Postgres, PM2 and a Let's Encrypt certificate.

**Architecture on one VM**

```
Internet ──▶ Nginx (443, TLS) ──┬──▶ localhost:3000   Next.js  (apps/web)
                                └──▶ localhost:4000   Express  (apps/api)
                                         │
                                         ├──▶ Postgres 16 + pgvector (localhost:5432)
                                         └──▶ Microsoft Graph (calendar, mail, Teams)
```

Only Nginx is exposed. Node and Postgres stay bound to loopback.

---

## 1. Provision the VM

| Setting | Recommended |
|---|---|
| Image | Ubuntu Server 22.04 LTS |
| Size | `Standard_B2s` (2 vCPU / 4 GB) minimum — `B2ms` if you run embeddings |
| Disk | 64 GB Premium SSD |
| Ports | 22, 80, 443 only |

```bash
az group create --name onsys-prod --location australiasoutheast

az vm create \
  --resource-group onsys-prod \
  --name onsys-web \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard

az vm open-port --resource-group onsys-prod --name onsys-web --port 80  --priority 1001
az vm open-port --resource-group onsys-prod --name onsys-web --port 443 --priority 1002
```

Lock SSH to your own address rather than leaving it open to the internet:

```bash
az network nsg rule update --resource-group onsys-prod \
  --nsg-name onsys-webNSG --name default-allow-ssh \
  --source-address-prefixes "<your.public.ip>/32"
```

Point an A record for `www.onsys.com.au` at the VM's public IP **before** requesting
a certificate — Let's Encrypt validates over HTTP and will fail otherwise.

---

## 2. Base software

```bash
ssh azureuser@<vm-ip>

sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx ufw

# Node 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v      # expect v22.x

sudo npm install -g pm2
```

Firewall — Nginx only:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

---

## 3. Postgres with pgvector

The chat/RAG feature stores embeddings in a `vector` column, so the extension is
required even if you are not using the chatbot yet.

```bash
sudo apt install -y postgresql-16 postgresql-16-pgvector

sudo -u postgres psql <<'SQL'
CREATE USER onsys WITH PASSWORD 'CHANGE_ME_STRONG';
CREATE DATABASE onsys OWNER onsys;
\c onsys
CREATE EXTENSION IF NOT EXISTS vector;
SQL
```

Confirm it registered:

```bash
sudo -u postgres psql -d onsys -c "SELECT extversion FROM pg_extension WHERE extname='vector';"
```

Keep Postgres on loopback (the default). Verify:

```bash
sudo grep -E "^#?listen_addresses" /etc/postgresql/16/main/postgresql.conf
# listen_addresses = 'localhost'
```

> **Note on the local dev setup.** Development runs Postgres in Docker on port
> **5433**, because 5432 was already taken. On the VM there is no such clash, so
> `DATABASE_URL` below uses **5432**. Do not copy the dev port across.

---

## 4. Get the code

```bash
sudo mkdir -p /var/www && sudo chown azureuser:azureuser /var/www
cd /var/www
git clone https://github.com/ranilperera/onsys-web-site.git onsys
cd onsys
npm install
```

---

## 5. Configure `.env`

`.env` is deliberately **not** in the repository. Create it on the VM from the
template and fill in real values:

```bash
cp .env.example .env
chmod 600 .env          # readable only by the deploy user
nano .env
```

Values that must change from the template:

```ini
NODE_ENV=production
DATABASE_URL=postgresql://onsys:CHANGE_ME_STRONG@localhost:5432/onsys?schema=public

SITE_URL=https://www.onsys.com.au
API_URL=https://www.onsys.com.au/api
NEXT_PUBLIC_SITE_URL=https://www.onsys.com.au
NEXT_PUBLIC_API_URL=https://www.onsys.com.au/api

SESSION_SECRET=<openssl rand -base64 32>

# Microsoft Graph — same app registration as development
GRAPH_TENANT_ID=<tenant guid>
GRAPH_CLIENT_ID=<client guid>
GRAPH_CLIENT_SECRET=<client secret>
GRAPH_SENDER_UPN=<sending mailbox>

# Booking — the mailbox whose calendar is read and written
BOOKING_CALENDAR_UPN=consultant@yourdomain.com.au
BOOKING_CONSULTANT_NAME=Onsys Consultant
BOOKING_TIMEZONE=Australia/Melbourne

TURNSTILE_SECRET=<cloudflare turnstile secret>
OPENAI_API_KEY=<optional, chatbot only>
```

> **`NEXT_PUBLIC_*` values are baked in at build time.** They are substituted
> into the client bundle by `next build`, so changing one later means rebuilding
> and restarting — a PM2 restart alone will not pick it up.

> **`.env` is read once at process start.** Any change to it needs
> `pm2 restart onsys-api`, not just a reload.

---

## 6. Database schema and content

```bash
npm run db:generate
npm run db:deploy              # applies migrations without prompting
npm run db:seed                # idempotent — safe to re-run
npm run create:admin -- --email=you@onsys.com.au --name="Your Name" --role=ADMIN
```

Optional, only if the chatbot is enabled (needs `OPENAI_API_KEY`):

```bash
npm run embeddings:build
```

---

## 7. Build and start

```bash
npm run build       # builds packages/shared, then apps/api and apps/web
```

Create `ecosystem.config.cjs` in the repo root:

```js
module.exports = {
  apps: [
    {
      name: 'onsys-api',
      cwd: '/var/www/onsys/apps/api',
      script: 'dist/server.js',
      env: { NODE_ENV: 'production', PORT: 4000 },
      max_memory_restart: '512M',
      error_file: '/var/log/onsys/api-error.log',
      out_file: '/var/log/onsys/api-out.log',
    },
    {
      name: 'onsys-web',
      cwd: '/var/www/onsys/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env: { NODE_ENV: 'production', PORT: 3000 },
      max_memory_restart: '768M',
      error_file: '/var/log/onsys/web-error.log',
      out_file: '/var/log/onsys/web-out.log',
    },
  ],
};
```

```bash
sudo mkdir -p /var/log/onsys && sudo chown azureuser:azureuser /var/log/onsys

pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u azureuser --hp /home/azureuser   # run the line it prints
```

Check both are up:

```bash
pm2 status
curl -s localhost:4000/health
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000
```

---

## 8. Nginx

`/etc/nginx/sites-available/onsys`:

```nginx
server {
    listen 80;
    server_name www.onsys.com.au onsys.com.au;
    return 301 https://www.onsys.com.au$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.onsys.com.au;

    # certbot fills these in
    ssl_certificate     /etc/letsencrypt/live/www.onsys.com.au/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.onsys.com.au/privkey.pem;

    client_max_body_size 12M;

    # The API is proxied under the same origin, which is why NEXT_PUBLIC_API_URL
    # ends in /api. Keeping it same-origin avoids CORS entirely in production.
    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Immutable build output — safe to cache hard.
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        'upgrade';
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/onsys /etc/nginx/sites-enabled/onsys
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Express sits behind a proxy, so it must trust the forwarded headers — otherwise
rate limiting sees every request as coming from Nginx and throttles all visitors
together. This is already set (`app.set('trust proxy', 1)` in
`apps/api/src/server.ts:23`); no change needed.

---

## 9. TLS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d www.onsys.com.au -d onsys.com.au
sudo systemctl status certbot.timer      # auto-renewal
```

Verify the full chain is served — a missing intermediate breaks Node clients even
when browsers appear fine:

```bash
openssl s_client -connect www.onsys.com.au:443 -servername www.onsys.com.au </dev/null 2>/dev/null | grep -E "^ *[0-9] s:|Verify return code"
```

> The current production site at onsys.com.au has exactly this fault — it serves
> an *AlphaSSL CA 2023* intermediate for a leaf issued by *AlphaSSL CA 2025*, so
> Node fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Worth confirming the new
> deployment does not repeat it.

---

## 10. Microsoft Graph

The booking, email and Teams features share one app registration with these
**application** permissions, admin-consented:

| Permission | Used by |
|---|---|
| `Calendars.ReadWrite` | booking — free/busy and event creation |
| `Mail.Send` | lead notifications, booking confirmations |
| `ChannelMessage.Read.All` | chat escalation (optional) |

Restrict the credential to only the mailboxes it needs — by default
`Calendars.ReadWrite.All` reaches **every mailbox in the tenant**:

```powershell
Connect-ExchangeOnline
New-ApplicationAccessPolicy -AppId <client-id> `
  -PolicyScopeGroupId <mail-enabled-security-group> `
  -AccessRight RestrictAccess -Description "Onsys web app"

Test-ApplicationAccessPolicy -Identity consultant@yourdomain.com.au -AppId <client-id>
```

Put both the booking mailbox and the sending mailbox in that group.

Verify from the VM after deploying:

```bash
curl -s "https://www.onsys.com.au/api/bookings/availability?days=14" | head -c 300
# expect "enabled":true and a populated days array
```

If it returns `"enabled":false`, `BOOKING_CALENDAR_UPN` or one of the `GRAPH_*`
values is missing from `.env`, or the API was not restarted after editing it.

---

## 11. Deploying an update

```bash
cd /var/www/onsys
git pull
npm install                    # only if dependencies changed
npm run build
npm run db:deploy
npm run db:seed                # only if page content changed
pm2 reload ecosystem.config.cjs --update-env
```

`pm2 reload` restarts workers one at a time, so there is no dropped request.

**Content changes take up to 5 minutes to appear.** Pages are cached with ISR
(`revalidate = 300`). To publish immediately, `pm2 restart onsys-web`.

---

## 12. Backups

```bash
sudo mkdir -p /var/backups/onsys && sudo chown azureuser:azureuser /var/backups/onsys

cat > /home/azureuser/backup-db.sh <<'SH'
#!/usr/bin/env bash
set -euo pipefail
STAMP=$(date +%F-%H%M)
pg_dump "postgresql://onsys:CHANGE_ME_STRONG@localhost:5432/onsys" \
  | gzip > "/var/backups/onsys/onsys-$STAMP.sql.gz"
find /var/backups/onsys -name '*.sql.gz' -mtime +14 -delete
SH
chmod 700 /home/azureuser/backup-db.sh

# 02:00 daily
(crontab -l 2>/dev/null; echo "0 2 * * * /home/azureuser/backup-db.sh") | crontab -
```

Also back up `.env` — it is not in git, so a lost VM means lost configuration.
Store it in Azure Key Vault or an encrypted blob container, never in the repo.

Consider Azure Backup on the VM itself for a full restore path.

---

## 13. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Booking shows "offline right now" | `BOOKING_CALENDAR_UPN` or a `GRAPH_*` value missing | Add to `.env`, then `pm2 restart onsys-api` |
| `"enabled":false` from the API | Same as above — the code short-circuits before calling Graph | As above |
| Phone/ABN wrong in header or footer | `NEXT_PUBLIC_*` is baked in at build | `npm run build && pm2 restart onsys-web` |
| Content edits not showing | ISR 5-minute cache | Wait, or `pm2 restart onsys-web` |
| `P1000` auth failed | `DATABASE_URL` password wrong | `ALTER USER onsys WITH PASSWORD '…';` and sync `.env` |
| `no installation script for 0.8.0` | pgvector version mismatch | `sudo apt install postgresql-16-pgvector`, then `CREATE EXTENSION vector;` |
| Rate limiting blocks everyone | `trust proxy` lost, all traffic looks like one IP | Confirm `app.set('trust proxy', 1)` in `server.ts` |
| 502 from Nginx | Node process down | `pm2 status`, `pm2 logs onsys-api --lines 100` |
| Graph `401` on Teams post | App-only channel posts are blocked by Microsoft | Expected; use the incoming-webhook transport |

Useful commands:

```bash
pm2 logs onsys-api --lines 100
pm2 logs onsys-web --lines 100
sudo tail -f /var/log/nginx/error.log
sudo journalctl -u postgresql -n 50
```

---

## 14. Security checklist

- [ ] `.env` is `chmod 600` and owned by the deploy user
- [ ] SSH restricted to known source addresses; password auth disabled
- [ ] Postgres bound to `localhost` only
- [ ] `SESSION_SECRET` changed from the template default
- [ ] `TURNSTILE_SECRET` set — without it captcha silently passes every submission
- [ ] Graph credential scoped with an Application Access Policy
- [ ] Graph client secret has a calendar reminder before its expiry
- [ ] `sudo unattended-upgrades` enabled for security patches
- [ ] Database backups verified by doing a test restore, not just by existing

---

## Appendix — asset originals

The unprocessed hero photography (`apps/web/public/images/heroN.jpg`, ~157 MB)
is **not** in the repository. Every page references a derived `hero-*.jpg`,
which is committed. Keep the masters in blob storage or OneDrive; they are only
needed to re-crop a hero. See the trailing rules in `.gitignore`.
