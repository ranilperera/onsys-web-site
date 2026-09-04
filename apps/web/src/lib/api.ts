import { siteConfig, navigation } from './config';
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

export interface AuthorRecord {
  id: string;
  slug: string;
  name: string;
  role: string | null;
  bio: string | null;
  photo: string | null;
  credentials: string[];
  linkedIn: string | null;
  website: string | null;
}

export interface AuthorWithPosts extends AuthorRecord {
  posts: Array<{
    slug: string;
    title: string;
    excerpt: string | null;
    coverImage: string | null;
    publishedAt: string | null;
    readMinutes: number;
    category: { name: string; slug: string; color: string } | null;
  }>;
}

export interface PostRecord {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  bodyHtml: string;
  authorName: string;
  /// Null on posts written before the Author model existed, or if the row was
  /// removed — authorName is what keeps a byline on the page either way.
  author?: AuthorRecord | null;
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

/**
 * Cache tags let a save in the admin console purge exactly the entries it
 * invalidated, instead of everyone waiting out the revalidate timer. The
 * timer stays as the backstop for when the purge call cannot be delivered.
 */
export const cacheTags = {
  page: (slug: string) => `page:${slug}`,
  pageList: 'pages',
  post: (slug: string) => `post:${slug}`,
  postList: 'posts',
  author: (slug: string) => `author:${slug}`,
  categories: 'categories',
  footerNav: 'nav:footer',
  sitemap: 'sitemap',
  redirects: 'redirects',
} as const;

async function apiGet<T>(
  path: string,
  revalidate = REVALIDATE_SECONDS,
  tags: string[] = [],
): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(`${serverApiBase}/api/content${path}`, {
      next: { revalidate, tags },
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
  const page =
    (await apiGet<{ page: PageRecord }>(`/pages/${slug}`, REVALIDATE_SECONDS, [
      cacheTags.page(slug),
    ]))?.page ?? null;
  if (!page) return null;
  return { ...page, blocks: normaliseBlocks(page.blocks, `/${slug}`) };
};

export const getPages = async (): Promise<Array<Pick<PageRecord, 'slug' | 'title'>>> =>
  (await apiGet<{ pages: Array<Pick<PageRecord, 'slug' | 'title'>> }>('/pages', REVALIDATE_SECONDS, [
    cacheTags.pageList,
  ]))?.pages ?? [];

export const getPosts = async (params: { page?: number; category?: string } = {}) => {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.category) qs.set('category', params.category);
  const query = qs.toString();

  return (
    (await apiGet<{
      posts: PostSummary[];
      pagination: { page: number; perPage: number; total: number; totalPages: number };
    }>(`/posts${query ? `?${query}` : ''}`, REVALIDATE_SECONDS, [cacheTags.postList])) ?? {
      posts: [],
      pagination: { page: 1, perPage: 12, total: 0, totalPages: 0 },
    }
  );
};

export const getPost = async (slug: string) =>
  await apiGet<{ post: PostRecord; related: PostSummary[] }>(`/posts/${slug}`, REVALIDATE_SECONDS, [
    cacheTags.post(slug),
  ]);

export const getAuthor = async (slug: string): Promise<AuthorWithPosts | null> =>
  (await apiGet<{ author: AuthorWithPosts }>(`/authors/${slug}`, REVALIDATE_SECONDS, [
    cacheTags.author(slug),
  ]))?.author ?? null;

export const getCategories = async (): Promise<CategoryRecord[]> =>
  (await apiGet<{ categories: CategoryRecord[] }>('/categories', REVALIDATE_SECONDS, [
    cacheTags.categories,
  ]))?.categories ?? [];

export const getSitemapData = async () =>
  (await apiGet<{
    pages: Array<{ slug: string; updatedAt: string }>;
    posts: Array<{ slug: string; updatedAt: string; publishedAt: string | null }>;
    categories: Array<{ slug: string }>;
  }>('/sitemap', 3600, [cacheTags.sitemap])) ?? { pages: [], posts: [], categories: [] };

export const getRedirects = async () =>
  (await apiGet<{ redirects: Array<{ fromPath: string; toPath: string; statusCode: number }> }>(
    '/redirects',
    3600,
    [cacheTags.redirects],
  ))?.redirects ?? [];

export type FooterGroups = Record<string, Array<{ label: string; href: string }>>;

/**
 * Footer links, admin-managed, with the built-in list as a fallback.
 *
 * This is the one query that runs on literally every page, so unlike the rest
 * of the module it must not throw: `apiGet` raises ContentUnavailableError
 * when the API is unreachable, and letting that propagate from a component in
 * the root layout would turn a footer outage into a whole-site outage. An
 * empty table is treated the same way as a failed request — both mean "nothing
 * to render from the database", and a stale footer beats no footer.
 */
export async function getFooterNav(): Promise<FooterGroups> {
  try {
    const data = await apiGet<{ groups: FooterGroups }>('/nav/footer', REVALIDATE_SECONDS, [
      cacheTags.footerNav,
    ]);
    const groups = data?.groups;
    if (groups && Object.keys(groups).length > 0) return groups;
  } catch {
    // Fall through to the built-in list below.
  }
  // `navigation.footer` is a readonly literal, so it is copied into plain
  // arrays rather than cast — the cast would be a lie about mutability that
  // only holds until something appends to a group.
  return Object.fromEntries(
    Object.entries(navigation.footer).map(([group, entries]) => [
      group,
      entries.map(({ label, href }) => ({ label, href })),
    ]),
  );
}
