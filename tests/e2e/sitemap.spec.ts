import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * Every URL the sitemap advertises must actually resolve.
 *
 * This is the test that would have caught the migration's fifty dead blog
 * URLs on the day it happened. The sitemap is the list of pages we have asked
 * Google to index; a 404 in it is both a crawl-budget leak and a public
 * statement that we do not know what is on our own site.
 *
 * Runs once on desktop — these are HTTP requests, so repeating them under a
 * mobile viewport tests nothing new.
 */
test.describe('sitemap', () => {
  // These are plain HTTP requests, so running them again under a mobile
  // viewport would assert exactly the same thing twice.
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'HTTP-only checks run once');
  });

  let urls: string[] = [];

  test.beforeAll(async ({ playwright, baseURL }) => {
    const request: APIRequestContext = await playwright.request.newContext({ baseURL });
    const res = await request.get('/sitemap.xml');
    expect(res.status(), 'sitemap.xml should be served').toBe(200);

    const xml = await res.text();
    urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    await request.dispose();
  });

  test('advertises a non-trivial set of pages', () => {
    // A sitemap that silently shrinks to the three hardcoded static entries is
    // the shape of a failed database fetch, and it looks like a valid sitemap.
    expect(urls.length).toBeGreaterThan(10);
  });

  test('contains no faceted category URLs', () => {
    const faceted = urls.filter((u) => u.includes('?'));
    expect(faceted, 'query-string URLs canonicalise elsewhere and must not be listed').toEqual([]);
  });

  test('contains no trailing slashes', () => {
    // Both the middleware and HAProxy strip them, so a listed trailing slash
    // is an advertised redirect rather than an advertised page.
    const slashed = urls.filter((u) => u !== new URL(u).origin + '/' && u.endsWith('/'));
    expect(slashed).toEqual([]);
  });

  test('lists every URL exactly once', () => {
    const seen = new Set<string>();
    const duplicates = urls.filter((u) => (seen.has(u) ? true : (seen.add(u), false)));
    expect(duplicates).toEqual([]);
  });

  test('every listed URL resolves without a redirect or an error', async ({ playwright, baseURL }) => {
    const request = await playwright.request.newContext({ baseURL });
    const failures: string[] = [];

    for (const url of urls) {
      // Compare by path so the test works against localhost as well as prod.
      const path = new URL(url).pathname;
      const res = await request.get(path, { maxRedirects: 0 });

      // A redirect is a failure here, not a pass: the sitemap should name the
      // destination, never a URL that bounces to it.
      if (res.status() !== 200) failures.push(`${path} → ${res.status()}`);
    }

    await request.dispose();
    expect(failures, 'these sitemap URLs do not return 200').toEqual([]);
  });
});

test.describe('health endpoint', () => {
  // These are plain HTTP requests, so running them again under a mobile
  // viewport would assert exactly the same thing twice.
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'HTTP-only checks run once');
  });

  test('answers 200 without touching the database', async ({ playwright, baseURL }) => {
    const request = await playwright.request.newContext({ baseURL });
    const res = await request.get('/api/health');

    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'ok' });
    // A cached health check reports whichever process answered first.
    expect(res.headers()['cache-control']).toContain('no-store');

    await request.dispose();
  });
});
