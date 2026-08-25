import { test, expect } from '@playwright/test';

const PAGES = ['/', '/expertise', '/about', '/pricing-and-plans', '/contact', '/managed-database-services', '/blog'];

test.describe('Core pages', () => {
  for (const path of PAGES) {
    test(`${path} loads with a single h1 and no horizontal overflow`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(400);

      await expect(page.locator('h1')).toHaveCount(1);

      // The whole point of the responsive work — assert it, don't assume it.
      const overflows = await page.evaluate(() => {
        window.scrollTo(9999, 0);
        return window.scrollX > 0;
      });
      expect(overflows, `${path} scrolls horizontally`).toBe(false);
    });
  }
});

test.describe('SEO', () => {
  test('home page has canonical, OG tags and Organization JSON-LD', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[name="description"]')).toHaveCount(1);

    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(jsonLd).toContain('Organization');
  });

  test('sitemap, robots and llms.txt are served', async ({ request }) => {
    for (const path of ['/sitemap.xml', '/robots.txt', '/llms.txt']) {
      const res = await request.get(path);
      expect(res.status(), `${path} should be 200`).toBe(200);
    }
  });

  test('old WordPress URLs 301 to their new home', async ({ request }) => {
    const res = await request.get('/our-expertise', { maxRedirects: 0 });
    expect([301, 308]).toContain(res.status());
    expect(res.headers()['location']).toContain('/expertise');
  });
});

test.describe('Accessibility basics', () => {
  test('skip link is present and focusable', async ({ page }) => {
    await page.goto('/');
    const skip = page.locator('.skip-link');
    await expect(skip).toHaveCount(1);
    await page.keyboard.press('Tab');
    await expect(skip).toBeFocused();
  });

  test('every image has an alt attribute', async ({ page }) => {
    await page.goto('/');
    const missing = await page.locator('img:not([alt])').count();
    expect(missing).toBe(0);
  });

  test('mobile nav toggle is keyboard operable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const toggle = page.locator('#navToggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#navPanel')).toHaveClass(/open/);
  });
});

test.describe('Chat widget', () => {
  test('launcher opens the panel', async ({ page }) => {
    await page.goto('/');
    await page.locator('.chat-launcher').click();
    await expect(page.locator('.chat-panel')).toBeVisible();
    await expect(page.getByRole('dialog', { name: /chat/i })).toBeVisible();
  });
});

test.describe('Contact form', () => {
  test('client-side validation rejects a bad email', async ({ page }) => {
    await page.goto('/contact');
    await page.fill('#name', 'Test User');
    await page.fill('#email', 'not-an-email');
    await page.click('button[type="submit"]');
    await expect(page.locator('.form-status.error')).toBeVisible();
  });
});
