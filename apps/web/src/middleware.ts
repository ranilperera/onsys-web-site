import { NextResponse, type NextRequest } from 'next/server';
import { siteConfig } from '@/lib/config';

/**
 * 301 redirects from the old WordPress URL structure.
 *
 * Static map covers the known page moves and runs with zero latency. Anything
 * else falls through to a cached lookup against the API, so redirects added in
 * the admin console take effect without a redeploy.
 */

const STATIC_REDIRECTS: Record<string, string> = {
  '/our-expertise': '/expertise',
  '/about-us': '/about',
  '/contact-us': '/contact',
  // The pricing page keeps its WordPress URL, so /pricing-and-plans is served
  // directly and the shorter /pricing is the alias that redirects into it.
  '/pricing': '/pricing-and-plans',
  // /database-consultancy keeps its WordPress URL and is served directly now,
  // so it must NOT redirect. These four legacy service URLs are all consultancy
  // capabilities, so they land there rather than on the generic expertise page.
  '/database-performance-tuning': '/database-consultancy',
  '/database-health-check': '/database-consultancy',
  // Two thin WordPress pages selling one capability — consolidated onto a
  // single URL so the equity and the ranking signals do not stay split.
  '/database-patching-and-upgrade': '/database-upgrades-migrations-dr',
  '/high-availability-solutions': '/database-upgrades-migrations-dr',
  '/upgrades-and-migrations': '/database-upgrades-migrations-dr',
  '/disaster-recovery': '/database-upgrades-migrations-dr',
  '/fixed-price-database-projects': '/pricing-and-plans',
  // /on-call-dba-services keeps its WordPress URL and is served directly now,
  // so it must NOT redirect. /on-call-dba-support is the alias people guess.
  '/on-call-dba-support': '/on-call-dba-services',
  '/remote-on-call-dba': '/on-call-dba-services',
  '/emergency-dba-support': '/emergency-database-support',
  '/emergency-support': '/emergency-database-support',
  // The two security pages are served directly; these are the shorter
  // paths people guess, plus the old brand-prefixed WordPress URL.
  '/onsys-managed-security-services': '/managed-security-services',
  '/managed-edr': '/managed-endpoint-detection-and-response',
  '/cyber-security': '/managed-security-services',
  '/data-security': '/data-and-application-security',
  '/application-security': '/data-and-application-security',
  '/grc': '/grc-and-compliance',
  '/compliance': '/grc-and-compliance',
  '/privacy-policy': '/privacy',
  '/terms-of-use': '/terms',
  '/terms-and-conditions': '/terms',
  '/cookies': '/privacy',
  // Three near-identical vendor pages on the old site; consolidated into two
  // pages organised by intent rather than by cloud provider.
  '/aws-migration-and-consultancy': '/cloud-migrations',
  '/cloud-migration': '/cloud-migrations',
  '/azure-solutions': '/cloud-consultancy',
  '/oracle-cloud-consultancy': '/cloud-consultancy',
  '/cloud-consultancy-and-support': '/cloud-consultancy',
  '/offshore-software-development': '/custom-software-development',
  '/software-development': '/custom-software-development',
  '/etl-and-integration': '/integration-services',
  '/ai-solutions': '/artificial-intelligence-solutions',
};

/**
 * Dynamic redirects are fetched once and cached in module scope for the
 * lifetime of the edge worker instance.
 */
let cache: { map: Map<string, { to: string; code: number }>; expires: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getDynamicRedirects(): Promise<Map<string, { to: string; code: number }>> {
  if (cache && cache.expires > Date.now()) return cache.map;

  try {
    const res = await fetch(`${siteConfig.apiUrl}/api/content/redirects`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error('redirect fetch failed');

    const data = (await res.json()) as {
      redirects: Array<{ fromPath: string; toPath: string; statusCode: number }>;
    };

    const map = new Map(
      data.redirects.map((r) => [r.fromPath.replace(/\/$/, ''), { to: r.toPath, code: r.statusCode }]),
    );
    cache = { map, expires: Date.now() + CACHE_TTL_MS };
    return map;
  } catch {
    // Serve stale rather than 500 the request.
    return cache?.map ?? new Map();
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Normalise trailing slashes so /about/ and /about are one URL to Google.
  if (pathname.length > 1 && pathname.endsWith('/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(0, -1);
    return NextResponse.redirect(url, 308);
  }

  const staticTarget = STATIC_REDIRECTS[pathname];
  if (staticTarget) {
    const url = request.nextUrl.clone();
    url.pathname = staticTarget;
    return NextResponse.redirect(url, 301);
  }

  const dynamic = await getDynamicRedirects();
  const match = dynamic.get(pathname);
  if (match) {
    // Absolute targets (e.g. moved off-site) are redirected verbatim.
    if (match.to.startsWith('http')) {
      return NextResponse.redirect(match.to, match.code);
    }
    const url = request.nextUrl.clone();
    url.pathname = match.to;
    url.search = search;
    return NextResponse.redirect(url, match.code);
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next internals and static assets — they never need a redirect check.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.png|sitemap.xml|robots.txt|llms.txt).*)'],
};
