import type { MetadataRoute } from 'next';
import { getSitemapData } from '@/lib/api';
import { siteConfig } from '@/lib/config';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { pages, posts, categories } = await getSitemapData();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: siteConfig.url, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${siteConfig.url}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    // A code route rather than a CMS page, so it is not covered by the DB list
    // below and has to be named explicitly.
    { url: `${siteConfig.url}/book`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
  ];

  const pageEntries: MetadataRoute.Sitemap = pages
    .filter((p) => p.slug !== 'home')
    .map((p) => ({
      url: `${siteConfig.url}/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: 'monthly' as const,
      // Money pages outrank the rest.
      priority: ['managed-database-services', 'pricing', 'contact', 'expertise'].includes(p.slug) ? 0.9 : 0.7,
    }));

  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${siteConfig.url}/blog/${p.slug}`,
    lastModified: new Date(p.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${siteConfig.url}/blog?category=${c.slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));

  return [...staticEntries, ...pageEntries, ...postEntries, ...categoryEntries];
}
