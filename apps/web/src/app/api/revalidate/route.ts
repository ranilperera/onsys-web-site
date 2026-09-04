import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { timingSafeEqual } from 'node:crypto';

/**
 * Purge cached content on demand, called by the API after a CMS write.
 *
 * Without this, a page edit is invisible until the 300-second revalidate timer
 * expires — and because the first request after expiry is served stale while
 * the new copy is built in the background, "five minutes" is really "five
 * minutes and then one more page view". That is the behaviour an editor reads
 * as the save not having worked.
 *
 * This route is the reason the timer can stay long: it is the fast path, and
 * the timer is the backstop for when this call cannot be delivered.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Constant-time comparison so the shared secret cannot be recovered by timing
 * repeated requests. Lengths are compared first because timingSafeEqual throws
 * on a length mismatch — that check is not itself secret, since an attacker
 * already controls the length they sent.
 */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const expected = process.env.REVALIDATE_SECRET;

  // Refuse rather than run unauthenticated. An open purge endpoint lets anyone
  // evict the cache repeatedly and turn every request into an origin fetch.
  if (!expected) {
    return NextResponse.json(
      { error: 'REVALIDATE_SECRET is not configured' },
      { status: 503 },
    );
  }

  const provided =
    request.headers.get('x-revalidate-secret') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    '';

  if (!secretMatches(provided, expected)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  let body: { tags?: unknown; paths?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 });
  }

  const isStringArray = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every((x) => typeof x === 'string');

  const tags = isStringArray(body.tags) ? body.tags.slice(0, 50) : [];
  // Only site-relative paths: revalidatePath takes a route, and anything else
  // is a caller mistake worth rejecting loudly.
  const paths = isStringArray(body.paths)
    ? body.paths.filter((p) => p.startsWith('/')).slice(0, 50)
    : [];

  if (tags.length === 0 && paths.length === 0) {
    return NextResponse.json({ error: 'Nothing to revalidate' }, { status: 400 });
  }

  for (const tag of tags) revalidateTag(tag);
  for (const path of paths) revalidatePath(path);

  return NextResponse.json({ revalidated: { tags, paths }, at: Date.now() });
}
