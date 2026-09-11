import type { MetadataRoute } from 'next';
import { getSitemapData } from '@/lib/api';
import { siteConfig } from '@/lib/config';

// Content for this route lives in the database, which does not exist during
// `next build` — the Docker image is built before any database is running. Left
// as a default ISR route, Next bakes the empty (or 404) render into the image
// and serves it until the revalidate window expires, which reintroduces the
// problem on every rebuild. Rendering on request keeps it correct from the
// first hit; the underlying API fetch still carries its own revalidate, so the
// database is not queried per request.
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { pages, posts, authors } = await getSitemapData();

  /**
   * lastmod should say when the content changed, not when a row was written.
   *
   * `updatedAt` moves on every write and the content seed rewrites every row
   * on every deploy, so this used to publish thirty-seven pages all claiming
   * to change at the same instant. A crawler cannot tell which of several
   * similar pages is current from that, which is exactly the signal this site
   * most needs to send. `contentUpdatedAt` only moves when the content really
   * differs; it falls back to `updatedAt` for any row written before the
   * column existed.
   */
  const freshness = (row: { updatedAt: string; contentUpdatedAt?: string | null }): Date =>
    new Date(row.contentUpdatedAt ?? row.updatedAt);

  // Only listed once the portal is live. Advertising a sign-in page for a
  // service that is not running yet is a broken promise to a crawler.
  const portalEntry: MetadataRoute.Sitemap = siteConfig.portalEnabled
    ? [
        {
          url: `${siteConfig.url}/client-portal`,
          lastModified: new Date(),
          changeFrequency: 'monthly' as const,
          priority: 0.5,
        },
      ]
    : [];

  const staticEntries: MetadataRoute.Sitemap = [
    { url: siteConfig.url, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${siteConfig.url}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    // A code route rather than a CMS page, so it is not covered by the DB list
    // below and has to be named explicitly.
    { url: `${siteConfig.url}/book`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
  ];

  /**
   * Author profiles. Also a code route, and already indexed — listing it makes
   * that deliberate rather than accidental. The API returns only authors with
   * a published article, so a profile with nothing behind it is not offered.
   */
  const authorEntries: MetadataRoute.Sitemap = authors.map((a) => ({
    url: `${siteConfig.url}/about/${a.slug}`,
    lastModified: new Date(a.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  const pageEntries: MetadataRoute.Sitemap = pages
    .filter((p) => p.slug !== 'home')
    .map((p) => ({
      url: `${siteConfig.url}/${p.slug}`,
      lastModified: freshness(p),
      changeFrequency: 'monthly' as const,
      // Money pages outrank the rest.
      priority: ['managed-database-services', 'pricing', 'contact', 'expertise'].includes(p.slug) ? 0.9 : 0.7,
    }));

  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${siteConfig.url}/blog/${p.slug}`,
    lastModified: freshness(p),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // Category filters are deliberately absent. `/blog?category=x` is a faceted
  // view of /blog that canonicalises back to it, so listing one asks a crawler
  // to index a URL we have simultaneously told it not to. Several categories
  // are empty as well, which would put "no posts published yet" in the index.
  return [...staticEntries, ...portalEntry, ...pageEntries, ...postEntries, ...authorEntries];
}
