import { env } from '../lib/env';
import { logger } from '../lib/logger';

/**
 * Tell the web app to drop cached copies of content we have just changed.
 *
 * The Next.js front end caches pages and their API reads for 300 seconds, so
 * without this an editor's save is invisible for up to five minutes — long
 * enough to look broken and be saved again. This turns that into roughly the
 * time of one HTTP round trip.
 *
 * Nothing here is allowed to fail a write. The database change has already
 * committed by the time this runs; if the purge cannot be delivered the only
 * consequence is that the content takes the old five minutes to appear, which
 * is exactly the behaviour we had before. So every failure is logged and
 * swallowed, and the call is not awaited by the request handler.
 */

/** Mirrors `cacheTags` in apps/web/src/lib/api.ts. */
export const tags = {
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

/** Give up rather than hold a connection open behind a user's save. */
const TIMEOUT_MS = 4000;

export async function revalidate(input: {
  tags?: string[];
  paths?: string[];
}): Promise<void> {
  const secret = env.REVALIDATE_SECRET;
  if (!secret) {
    logger.debug('REVALIDATE_SECRET unset — relying on the timer to refresh content');
    return;
  }

  const payload = {
    tags: input.tags ?? [],
    paths: input.paths ?? [],
  };
  if (payload.tags.length === 0 && payload.paths.length === 0) return;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${env.SITE_URL}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      logger.warn({ status: res.status, ...payload }, 'Cache purge rejected by the web app');
      return;
    }
    logger.info(payload, 'Cache purged');
  } catch (err) {
    logger.warn({ err, ...payload }, 'Cache purge could not be delivered');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fire-and-forget wrapper for use inside route handlers.
 *
 * `void`-ing the promise keeps the editor's save from waiting on a cache purge
 * it does not need to see the result of, while the catch guarantees no
 * unhandled rejection can take the process down.
 */
export function revalidateInBackground(input: { tags?: string[]; paths?: string[] }): void {
  void revalidate(input).catch(() => {
    /* already logged inside revalidate */
  });
}
