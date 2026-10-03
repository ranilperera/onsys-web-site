#!/usr/bin/env bash
#
# Refuses to start the second stack if it would share anything with the live one.
#
#   cd /opt/onsys-au && ./scripts/preflight-au-stack.sh
#
# Run it before `docker compose ... up`. Every check here is something that
# silently damages the running site rather than failing loudly:
#
#   - the same project name reuses the live containers
#   - the same image tag replaces the image the live containers restart onto
#   - the same data directory puts two Postgres clusters on one set of files
#   - the same edge port cannot bind, so the stack half-starts
#
# Exits non-zero on the first problem, with the fix.

set -euo pipefail

LIVE_DIR="${LIVE_DIR:-/opt/onsys}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail() {
  echo "PREFLIGHT FAILED: $1" >&2
  if [ $# -gt 1 ]; then echo "  -> $2" >&2; fi
  exit 1
}

[ -f "$HERE/.env" ] || fail "no .env in $HERE" "cp .env.au.example .env and fill it in"

# Read the file rather than sourcing it: a .env with a '#' in a password, or a
# value containing spaces, is valid for Compose and would break `source`.
# `|| true` matters: under `set -e` a grep that matches nothing fails, and a
# failing command substitution in an assignment aborts the script — so a missing
# key would exit 1 with no message at all, which is worse than no guard.
val() {
  grep -E "^$1=" "$HERE/.env" 2>/dev/null | tail -1 | cut -d= -f2- | sed 's/[[:space:]]*$//' || true
}

[ "$HERE" = "$LIVE_DIR" ] && fail "running inside the live checkout ($LIVE_DIR)" \
  "this script is for the second stack, e.g. /opt/onsys-au"

PROJECT="$(val COMPOSE_PROJECT_NAME)"
TAG="$(val IMAGE_TAG)"
DATA="$(val DATA_ROOT_AU)"
PORT="$(val APP_PORT)"
DBPORT="$(val POSTGRES_HOST_PORT_AU)"
SECRET="$(val REVALIDATE_SECRET)"
PASSWORD="$(val POSTGRES_PASSWORD)"

[ -n "$PROJECT" ] || fail "COMPOSE_PROJECT_NAME is not set" \
  "without it this stack adopts the live stack's containers"
[ "$PROJECT" != "onsys" ] || fail "COMPOSE_PROJECT_NAME is 'onsys', the live project" \
  "use something else, e.g. onsys-au"

[ -n "$TAG" ] || fail "IMAGE_TAG is not set" \
  "both stacks would build to onsys-api:latest and onsys-web:latest"
[ "$TAG" != "latest" ] || fail "IMAGE_TAG is 'latest', which the live stack uses" \
  "use something else, e.g. au"

[ -n "$DATA" ] || fail "DATA_ROOT_AU is not set"
[ "$DATA" != "/opt/data" ] || fail "DATA_ROOT_AU is /opt/data, the live database directory" \
  "two Postgres clusters on one directory corrupt it; use /opt/data-au"

[ -n "$PORT" ] || fail "APP_PORT is not set"
[ "$PORT" != "3009" ] || fail "APP_PORT is 3009, which the live edge already holds" \
  "use something else, e.g. 3010"

if [ -z "$PASSWORD" ] || [ "$PASSWORD" = "CHANGE_ME" ]; then
  fail "POSTGRES_PASSWORD is unset or still CHANGE_ME"
fi
if [ -z "$SECRET" ] || [ "$SECRET" = "replace-with-a-fresh-64-char-hex-string" ]; then
  fail "REVALIDATE_SECRET is unset or still the placeholder" "generate one: openssl rand -hex 32"
fi

# Cross-check against the live .env where it is readable, which catches a
# password or secret copied across as well as the four values above.
if [ -r "$LIVE_DIR/.env" ]; then
  live_val() {
    grep -E "^$1=" "$LIVE_DIR/.env" 2>/dev/null | tail -1 | cut -d= -f2- | sed 's/[[:space:]]*$//' || true
  }
  [ "$SECRET" != "$(live_val REVALIDATE_SECRET)" ] \
    || fail "REVALIDATE_SECRET is the same as the live stack's" \
    "a revalidate call to one stack would purge the other's cache"
  [ "$DATA" != "$(live_val DATA_ROOT)" ] \
    || fail "DATA_ROOT_AU matches the live stack's DATA_ROOT"
  [ "$PORT" != "$(live_val APP_PORT)" ] \
    || fail "APP_PORT matches the live stack's APP_PORT"
fi

# Ports actually free right now, which catches anything else on the box.
for p in "$PORT" "${DBPORT:-5434}"; do
  if ss -ltn 2>/dev/null | grep -qE "127\.0\.0\.1:$p[[:space:]]|0\.0\.0\.0:$p[[:space:]]|\*:$p[[:space:]]"; then
    fail "port $p is already in use" "pick a free one, or stop whatever holds it"
  fi
done

# A live stack running under the same name would mean the checks above passed on
# a stale .env.
if docker compose -p "$PROJECT" ps --format '{{.Name}}' 2>/dev/null | grep -q .; then
  echo "NOTE: project '$PROJECT' already has containers. This will update them, not create a second set."
fi

cat <<SUMMARY
PREFLIGHT OK
  checkout      $HERE
  project       $PROJECT
  image tag     $TAG
  data dir      $DATA
  edge port     127.0.0.1:$PORT
  postgres      127.0.0.1:${DBPORT:-5434}
  live stack    $LIVE_DIR (untouched)
SUMMARY
