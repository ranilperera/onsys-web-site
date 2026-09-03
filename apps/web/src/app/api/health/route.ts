import { NextResponse } from 'next/server';

/**
 * Liveness probe for the proxy.
 *
 * Deliberately answers from this process alone — no database, no API call, no
 * content fetch. A health check that depends on the database conflates "the web
 * tier is up" with "everything downstream is up", so a slow query takes the
 * whole site out of the load balancer while it is still perfectly capable of
 * serving cached pages.
 *
 * HAProxy currently checks `/`, which renders the homepage and needs the API.
 * Point it here instead:
 *
 *   option httpchk GET /api/health
 *   http-check expect status 200
 *
 * middleware.ts already excludes /api from its matcher, so no redirect logic
 * runs ahead of this.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export function GET() {
  return NextResponse.json(
    { status: 'ok', uptime: Math.round(process.uptime()) },
    {
      status: 200,
      headers: {
        // A cached health check reports the state of whichever process
        // answered first, which is worse than no health check at all.
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  );
}

/** HAProxy's `option httpchk` can be configured to use HEAD. */
export function HEAD() {
  return new Response(null, {
    status: 200,
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  });
}
