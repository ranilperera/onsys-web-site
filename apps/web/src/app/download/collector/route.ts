import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { siteConfig } from '@/lib/config';
import { serverApiBase } from '@/lib/api';

/**
 * Token-gated download for the health check collector.
 *
 * The free check is a lead-generation offer: the script is what the contact
 * details are exchanged for. While it lived in `public/` that exchange was
 * optional — anyone who knew or guessed the filename could take it without
 * ever seeing the form. The file now lives outside the served folder and only
 * arrives through here, with a token minted by the request form.
 *
 * The API owns the decision. This route does not read the database or hold any
 * secret of its own; it asks, and serves the bytes only on a yes.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Read once per process, not per request.
 *
 * `outputFileTracingIncludes` in next.config.mjs is what puts this file into
 * the standalone build; without that entry the path resolves in development
 * and is missing in Docker.
 */
let cachedScript: string | null = null;

function collectorScript(): string {
  if (cachedScript === null) {
    cachedScript = readFileSync(
      join(process.cwd(), 'content', 'Invoke-OnsysHealthCheck.ps1'),
      'utf8',
    );
  }
  return cachedScript;
}

/** Plain-text refusal that tells someone what to do instead. */
function refuse(message: string, status: number): Response {
  return new Response(
    `${message}\n\nRequest the free health check at ` +
      `${siteConfig.url}/free-20-point-sql-server-health-check\n` +
      `and the download link is emailed to you straight away.\n`,
    {
      status,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        // Never let a refusal — or a grant — be cached by anything in front.
        'Cache-Control': 'no-store',
      },
    },
  );
}

export async function GET(request: Request): Promise<Response> {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  if (!token) {
    return refuse('This download needs the link from your health check request.', 403);
  }

  let verdict: { ok?: boolean; error?: string };
  try {
    const res = await fetch(
      `${serverApiBase}/api/health-check/collector/verify?token=${encodeURIComponent(token)}`,
      { cache: 'no-store', headers: { Accept: 'application/json' } },
    );
    verdict = (await res.json()) as typeof verdict;
    if (!res.ok || !verdict.ok) {
      return refuse(verdict.error ?? 'This download link is not valid.', 403);
    }
  } catch {
    // The file exists and the person may well be entitled to it, but we cannot
    // tell right now. 503 says "try again", which is the truth.
    return refuse(
      'We could not check your download link just now. Please try again in a moment, or call ' +
        `${siteConfig.phone}.`,
      503,
    );
  }

  return new Response(collectorScript(), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="Invoke-OnsysHealthCheck.ps1"',
      // A tokenised URL must not be stored by a proxy and replayed.
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
