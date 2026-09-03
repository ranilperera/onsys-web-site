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
  // --- URLs confirmed indexed by the August 2026 SEO audit ---------------
  // These were live on WordPress and hold real ranking equity, so every one
  // must resolve rather than 404. Two of them are rebuilt as real pages
  // (/free-20-point-sql-server-health-check and /remote-database-support) and
  // are therefore deliberately absent from this map.
  //
  // /oncall cannibalised /on-call-dba-services, which ranks #4 for the
  // after-hours emergency query. The audit says keep the ranking one.
  '/oncall': '/on-call-dba-services',
  '/on-call': '/on-call-dba-services',
  // Duplicate of /managed-it-services carrying an identical title tag.
  '/managed-it-services-tailored-solutions-for-seamless-operations': '/managed-it-services',
  // WooCommerce products, including the literal "-copy" duplication suffix
  // that got indexed. All four sold consultancy hours, which is now pricing.
  '/product/sql-server-consultancy-services-4hrs': '/pricing-and-plans#consultancy-rates',
  '/product/sql-server-consultancy-services-4hrs-copy': '/pricing-and-plans#consultancy-rates',
  '/product/sql-server-consultancy-services-40hrs': '/pricing-and-plans#consultancy-rates',
  '/product/sql-server-consultancy-services-40hrs-copy': '/pricing-and-plans#consultancy-rates',
  '/shop': '/pricing-and-plans',
  '/cart': '/pricing-and-plans',
  '/checkout': '/pricing-and-plans',
  // The three plan pages now land on the SQL Server plan page rather than the
  // general pricing table — same three plans, but a page whose title, H1 and
  // opening sentence all say SQL Server, which is what they were ranking for.
  '/remote-database-support-plan-a': '/managed-sql-server-support#plans',
  '/remote-database-support-plan-b': '/managed-sql-server-support#plans',
  '/remote-database-support-plan-c': '/managed-sql-server-support#plans',
  // sql-server-support-plans was merged into managed-sql-server-support: two
  // pages selling the same three plans to the same buyer would compete in the
  // index and split whatever ranking either earned.
  '/sql-server-support-plans': '/managed-sql-server-support',
  '/sql-server-dba': '/sql-server-dba-services',
  '/sql-server-support': '/managed-sql-server-support',
  '/how-we-govern-offshore-dba-access': '/who-can-access-your-database',
  '/custom-support-plan': '/pricing-and-plans#engagement-options',
  // Cost-saving article that ranked #7 for the AU pricing query.
  // The indexed URL is "remote", not "managed" — as originally written this
  // entry matched nothing and the ranking page kept 404ing. The misspelling is
  // kept as an alias: it costs one map entry and covers any link built from
  // the same mistake.
  '/how-to-save-with-onsys-remote-database-services': '/pricing-and-plans',
  '/how-to-save-with-onsys-managed-database-services': '/pricing-and-plans',
  // WordPress taxonomy archives.
  '/category/database': '/blog',
  '/category/software-development': '/blog',
  '/category/uncategorized': '/blog',
  '/tag/sql-server': '/blog',
  '/author/admin': '/about',
  // Yoast served the sitemap at these paths and they may still be submitted in
  // Search Console; Next serves a single /sitemap.xml.
  '/sitemap_index.xml': '/sitemap.xml',
  '/page-sitemap.xml': '/sitemap.xml',
  '/post-sitemap.xml': '/sitemap.xml',
  '/wp-sitemap.xml': '/sitemap.xml',
  // The old booking widget, now a first-party flow.
  '/appointment': '/book',
  '/book-a-call': '/book',
  '/request-a-callback': '/contact',

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
    // Server-side, so it must not loop back out through the public hostname —
    // an Azure VM generally cannot reach its own public IP. Same reasoning as
    // serverApiBase in lib/api.ts.
    const base = process.env.INTERNAL_API_URL || siteConfig.apiUrl;
    const res = await fetch(`${base}/api/content/redirects`, {
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
  // .well-known is excluded alongside llms.txt: the rewrite that serves it
  // must not be preceded by redirect or trailing-slash logic.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.png|sitemap.xml|robots.txt|llms.txt|\.well-known).*)'],
};
