import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

/**
 * Where a CV is invited to.
 *
 * This had a regression that reached production: `careersEmail` fell back
 * through `NEXT_PUBLIC_ORG_EMAIL` to the sales address, the deployed build had
 * no careers variable set, and https://www.onsys.com.au/careers spent its life
 * asking candidates to send personal information to the sales inbox.
 *
 * The config module reads `process.env` at import time, so each case resets
 * the module registry and imports it fresh.
 */
async function loadCareersEmail(): Promise<string> {
  vi.resetModules();
  const { siteConfig } = await import('../config');
  return siteConfig.careersEmail;
}

describe('siteConfig.careersEmail', () => {
  const original = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_ORG_CAREERS_EMAIL;
    delete process.env.NEXT_PUBLIC_ORG_EMAIL;
  });

  afterEach(() => {
    process.env = { ...original };
    vi.resetModules();
  });

  it('uses the configured careers address', async () => {
    process.env.NEXT_PUBLIC_ORG_CAREERS_EMAIL = 'hiring@example.com';
    expect(await loadCareersEmail()).toBe('hiring@example.com');
  });

  it('falls back to the careers address, not the general one', async () => {
    expect(await loadCareersEmail()).toBe('jobs@onsys.com.au');
  });

  it('never falls through to the sales inbox when only ORG_EMAIL is set', async () => {
    // The exact shape of the production bug: the careers variable missing
    // from the build, the general one present.
    process.env.NEXT_PUBLIC_ORG_EMAIL = 'sales@onsys.com.au';
    const email = await loadCareersEmail();
    expect(email).toBe('jobs@onsys.com.au');
    expect(email).not.toContain('sales@');
  });

  it('treats an empty careers variable as unset rather than publishing nothing', async () => {
    // docker-compose passes ${ORG_CAREERS_EMAIL:-}, so "unset" arrives as "".
    process.env.NEXT_PUBLIC_ORG_CAREERS_EMAIL = '';
    process.env.NEXT_PUBLIC_ORG_EMAIL = 'sales@onsys.com.au';
    expect(await loadCareersEmail()).toBe('jobs@onsys.com.au');
  });
});
