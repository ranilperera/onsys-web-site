#!/bin/sh
# API container entrypoint.
#
# Waits for Postgres, then applies any pending migrations before starting the
# server. Compose already gates startup on the database healthcheck, but a
# healthy Postgres and a Postgres ready to accept this user's connections are
# not quite the same instant, and a restart loop here is a worse failure mode
# than a short wait.
set -eu

: "${DATABASE_URL:?DATABASE_URL is not set}"
SCHEMA=apps/api/prisma/schema.prisma

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] waiting for the database..."
  i=0
  until node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.\$queryRaw\`SELECT 1\`.then(() => p.\$disconnect()).then(
      () => process.exit(0),
      () => process.exit(1),
    );
  " 2>/dev/null; do
    i=$((i + 1))
    if [ "$i" -ge 30 ]; then
      echo "[entrypoint] database still unreachable after 60s — giving up" >&2
      exit 1
    fi
    sleep 2
  done

  echo "[entrypoint] applying migrations"
  # `migrate deploy` only ever applies committed migrations. It never generates
  # one and never resets, so it is safe to run on every container start.
  npx --no-install prisma migrate deploy --schema "$SCHEMA"
fi

echo "[entrypoint] starting: $*"
exec "$@"
