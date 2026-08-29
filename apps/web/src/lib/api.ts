import { siteConfig } from './config';
import { blockSchema, type Block } from '@onsys/shared';

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

/**
 * Base URL for content fetches.
 *
 * These run on the server, so they should reach the API directly rather than
 * looping back out through the public hostname. That matters most on Azure:
 * a VM generally cannot reach its own public IP, because the load balancer does
 * not hairpin, so an SSR fetch to https://www.onsys.com.au/api would hang and
 * every page would fall back to its empty state.
 *
 * INTERNAL_API_URL is set to http://api:4000 by the compose stack. It is a
 * server-only variable — deliberately not NEXT_PUBLIC_ — because the browser
 * must keep using the public origin, which is also what keeps requests
 * same-origin and free of CORS.
 */
const serverApiBase = process.env.INTERNAL_API_URL || siteConfig.apiUrl;

/**
 * Thrown when the API could not be reached or answered with a server error.
 *
 * Distinct from "this page does not exist" on purpose. Collapsing the two into
 * `null` let a transient outage render as `notFound()`, and Next cached that 404
 * with `stale-while-revalidate` measured in months — so a few seconds of the API
 * being down took working pages off the site until someone restarted the web
 * container. Letting the failure propagate produces a 500, which Next does not
 * cache, so the page recovers on its own the moment the API does.
 */
export class ContentUnavailableError extends Error {
  constructor(path: string, cause?: unknown) {
    super(`Content API unavailable for ${path}`);
    this.name = 'ContentUnavailableError';
    this.cause = cause;
  }
}

/** True while `next build` runs, when no API is expected to exist. */
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

async function apiGet<T>(path: string, revalidate = REVALIDATE_SECONDS): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(`${serverApiBase}/api/content${path}`, {
      next: { revalidate },
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    // The Docker image is built before any API exists, so a build-time failure
    // is expected and must not fail the build.
    if (isBuildPhase) return null;
    throw new ContentUnavailableError(path, error);
  }

  // A genuine 404 means the content really is absent — that is a real
  // notFound(), and safe to cache.
  if (res.status === 404) return null;

  if (!res.ok) {
    if (isBuildPhase) return null;
    throw new ContentUnavailableError(`${path} (HTTP ${res.status})`);
  }

  return (await res.json()) as T;
}

/**
 * Run stored blocks through the schema before rendering them.
 *
 * `Block` is zod's *output* type, so every field with a `.default()` is
 * required on it — but the API returns whatever JSON is in the database, which
 * may have been written before that field existed. Casting therefore lies: the
 * renderer reads `block.slides.length`, the stored hero has no `slides` key,
 * and the page dies with a server-side exception. That is exactly what a
 * deploy-then-seed ordering produces, and it took the homepage down.
 *
 * Parsing applies the defaults and makes the type honest. It is done per block
 * so one malformed entry drops itself rather than blanking the whole page.
 */
function normaliseBlocks(raw: unknown, context: string): Block[] {
  if (!Array.isArray(raw)) return [];
  const kept: Block[] = [];
  for (const item of raw) {
    const parsed = blockSchema.safeParse(item);
    if (parsed.success) {
      kept.push(parsed.data);
    } else {
      const type = (item as { type?: string } | null)?.type ?? 'unknown';
      // eslint-disable-next-line no-console -- server-side, and worth shouting about
      console.error(
        `[content] dropped an unparseable "${type}" block on ${context}: ${parsed.error.issues
          .map((i) => `${i.path.join('.')} ${i.message}`)
          .join('; ')}`,
      );
    }
  }
  return kept;
}

export const getPage = async (slug: string): Promise<PageRecord | null> => {
  const page = (await apiGet<{ page: PageRecord }>(`/pages/${slug}`))?.page ?? null;
  if (!page) return null;
  return { ...page, blocks: normaliseBlocks(page.blocks, `/${slug}`) };
};

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
