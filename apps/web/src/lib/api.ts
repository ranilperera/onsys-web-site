import { siteConfig } from './config';
import type { Block } from '@onsys/shared';

/**
 * Server-side data access. Pages are statically rendered and revalidated on a
 * timer (ISR), so a CMS edit goes live within the window without a rebuild.
 */

const REVALIDATE_SECONDS = 300;

export interface Faq {
  id: string;
  question: string;
  answer: string;
  order: number;
}

export interface PageRecord {
  id: string;
  slug: string;
  title: string;
  heading: string;
  eyebrow: string | null;
  lede: string | null;
  blocks: Block[];
  /** Full-bleed header photo; switches the page header to its dark treatment. */
  heroImage: string | null;
  heroCtas: Array<{ label: string; href: string }> | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
  noindex: boolean;
  structuredData: Record<string, unknown> | null;
  faqs: Faq[];
  updatedAt: string;
  publishedAt: string | null;
}

export interface CategoryRecord {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  color: string;
  _count?: { posts: number };
}

export interface PostRecord {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  bodyHtml: string;
  authorName: string;
  readMinutes: number;
  coverImage: string | null;
  category: CategoryRecord | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
  noindex: boolean;
  faqs: Faq[];
  publishedAt: string | null;
  updatedAt: string;
}

export type PostSummary = Omit<PostRecord, 'bodyHtml' | 'faqs'>;

async function apiGet<T>(path: string, revalidate = REVALIDATE_SECONDS): Promise<T | null> {
  try {
    const res = await fetch(`${siteConfig.apiUrl}/api/content${path}`, {
      next: { revalidate },
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // During a build with no API running, fall back to null so the page can
    // render its static default rather than failing the whole build.
    return null;
  }
}

export const getPage = async (slug: string): Promise<PageRecord | null> =>
  (await apiGet<{ page: PageRecord }>(`/pages/${slug}`))?.page ?? null;

export const getPages = async (): Promise<Array<Pick<PageRecord, 'slug' | 'title'>>> =>
  (await apiGet<{ pages: Array<Pick<PageRecord, 'slug' | 'title'>> }>('/pages'))?.pages ?? [];

export const getPosts = async (params: { page?: number; category?: string } = {}) => {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.category) qs.set('category', params.category);
  const query = qs.toString();

  return (
    (await apiGet<{
      posts: PostSummary[];
      pagination: { page: number; perPage: number; total: number; totalPages: number };
    }>(`/posts${query ? `?${query}` : ''}`)) ?? {
      posts: [],
      pagination: { page: 1, perPage: 12, total: 0, totalPages: 0 },
    }
  );
};

export const getPost = async (slug: string) =>
  await apiGet<{ post: PostRecord; related: PostSummary[] }>(`/posts/${slug}`);

export const getCategories = async (): Promise<CategoryRecord[]> =>
  (await apiGet<{ categories: CategoryRecord[] }>('/categories'))?.categories ?? [];

export const getSitemapData = async () =>
  (await apiGet<{
    pages: Array<{ slug: string; updatedAt: string }>;
    posts: Array<{ slug: string; updatedAt: string; publishedAt: string | null }>;
    categories: Array<{ slug: string }>;
  }>('/sitemap', 3600)) ?? { pages: [], posts: [], categories: [] };

export const getRedirects = async () =>
  (await apiGet<{ redirects: Array<{ fromPath: string; toPath: string; statusCode: number }> }>(
    '/redirects',
    3600,
  ))?.redirects ?? [];
