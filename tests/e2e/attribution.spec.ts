import { test, expect } from '@playwright/test';

/**
 * The case this exists for: somebody clicks an ad onto an article, reads it,
 * navigates to the contact page, and submits. The campaign is no longer in the
 * URL at that point, which is why the previous implementation — reading
 * window.location.search inside the submit handler — recorded nothing for
 * exactly the visitors who cost money to acquire.
 *
 * These run against a dev server on BASE_URL and assert on the request the
 * browser actually sends, not on the helper in isolation.
 */

const KEY = 'onsys.attribution.v1';

/** Waits for the capture effect to write, then returns what it stored. */
async function readStored(page: import('@playwright/test').Page) {
  await page.waitForFunction((k) => Boolean(sessionStorage.getItem(k)), KEY, { timeout: 15000 });
  return JSON.parse((await page.evaluate((k) => sessionStorage.getItem(k), KEY)) as string);
}

test('a campaign survives a navigation and reaches the lead payload', async ({ page }) => {
  await page.goto('/blog?utm_source=google&utm_medium=cpc&utm_campaign=dba-oct');

  // Internal navigation, the way a reader actually moves through the site.
  await page.goto('/contact');

  const held = await readStored(page);
  expect(held).toMatchObject({ utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'dba-oct' });
  // Captured in a real browser, so this is the live value rather than a stub.
  expect(held.timezone).toBeTruthy();

  // Intercepted, not really created: /api/leads is rate-limited to five an hour
  // per IP, so a suite that posts for real passes or fails depending on how
  // many leads that address has already sent, and leaves rows behind either way.
  let posted: string | null = null;
  await page.route('**/api/leads', async (route) => {
    posted = route.request().postData();
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, message: 'Thanks' }),
    });
  });

  await page.fill('input[name="name"]', 'Playwright Attribution');
  await page.fill('input[name="email"]', 'attr-e2e@example.com');
  await page.fill('textarea[name="message"]', 'End-to-end attribution check.');
  await page.click('form button[type="submit"]');

  await expect(page.locator('text=Thanks').first()).toBeVisible({ timeout: 15000 });
  const body = JSON.parse(posted ?? '{}');
  expect(body).toMatchObject({
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'dba-oct',
  });
  expect(body.timezone).toBeTruthy();
});

test('a later campaign does not overwrite the first touch', async ({ page }) => {
  await page.goto('/?utm_source=linkedin&utm_medium=social');
  await page.goto('/contact?utm_source=newsletter&utm_medium=email');

  const held = await readStored(page);
  expect(held.utmSource).toBe('linkedin');
});

test('a Google Ads click with no UTMs is still attributed', async ({ page }) => {
  await page.goto('/free-20-point-sql-server-health-check?gclid=TESTCLICKID');

  // Capture runs in an effect, so it lands after hydration rather than after
  // load. Waiting for the write is both correct and the thing worth asserting.
  const held = await readStored(page);
  expect(held).toMatchObject({ utmSource: 'google', utmMedium: 'cpc' });
});

test('an ordinary visit records no campaign and no self-referral', async ({ page }) => {
  await page.goto('/');
  await page.goto('/contact');

  const held = await readStored(page);
  expect(held.utmSource).toBeUndefined();
  // The defect being guarded: document.referrer at submit time is our own page.
  expect(held.referrer).toBeUndefined();
});

test('the conversion goal is queued for Plausible when analytics is configured', async ({
  page,
}) => {
  // Block the real script so the queue stub stays in place. Once script.js
  // loads it replaces window.plausible and drains the queue, which is correct
  // behaviour and untestable from here — the stub is the part this code owns.
  await page.route('**/plausible.io/**', (route) => route.abort());
  await page.route('**/api/leads', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, message: 'Thanks' }),
    }),
  );

  await page.goto('/contact');

  const configured = await page.evaluate(() => typeof window.plausible === 'function');
  test.skip(!configured, 'NEXT_PUBLIC_PLAUSIBLE_DOMAIN is not set in this environment');

  await page.fill('input[name="name"]', 'Playwright Goal');
  await page.fill('input[name="email"]', 'attr-goal@example.com');
  await page.fill('textarea[name="message"]', 'Goal check.');
  await page.click('form button[type="submit"]');

  await expect(page.locator('text=Thanks').first()).toBeVisible({ timeout: 15000 });

  const queued = await page.evaluate(() =>
    (window.plausible?.q ?? []).map((args) => Array.from(args as IArguments)[0]),
  );
  expect(queued).toContain('Lead: Contact form');
});
