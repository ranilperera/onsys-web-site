import { describe, it, expect } from 'vitest';
import {
  readAttribution,
  mergeAttribution,
  isExternalReferrer,
  type Attribution,
} from '../attribution';

const SITE = 'https://www.onsys.com.au';

describe('isExternalReferrer', () => {
  it('accepts another site', () => {
    expect(isExternalReferrer('https://www.google.com/', 'www.onsys.com.au')).toBe(true);
  });

  it('rejects our own site, with or without www', () => {
    // This is the defect being fixed: after an internal navigation the referrer
    // is our own blog, and recording it files an ad click as a self-referral.
    expect(isExternalReferrer(`${SITE}/blog/x`, 'www.onsys.com.au')).toBe(false);
    expect(isExternalReferrer('https://onsys.com.au/blog/x', 'www.onsys.com.au')).toBe(false);
  });

  it('rejects an empty or unparseable referrer rather than guessing', () => {
    expect(isExternalReferrer('', 'www.onsys.com.au')).toBe(false);
    expect(isExternalReferrer('not a url', 'www.onsys.com.au')).toBe(false);
  });
});

describe('readAttribution', () => {
  it('reads explicit UTM tags', () => {
    const a = readAttribution(
      `${SITE}/contact?utm_source=linkedin&utm_medium=social&utm_campaign=dba-oct`,
    );
    expect(a).toMatchObject({
      utmSource: 'linkedin',
      utmMedium: 'social',
      utmCampaign: 'dba-oct',
    });
  });

  it('translates a Google Ads gclid, which arrives with no UTMs at all', () => {
    // Auto-tagging is the default in Google Ads. Without this, every paid click
    // is filed as direct traffic and the ad spend cannot be attributed.
    const a = readAttribution(`${SITE}/free-20-point-sql-server-health-check?gclid=abc123`);
    expect(a.utmSource).toBe('google');
    expect(a.utmMedium).toBe('cpc');
  });

  it('translates a Microsoft Ads msclkid', () => {
    const a = readAttribution(`${SITE}/?msclkid=xyz`);
    expect(a).toMatchObject({ utmSource: 'bing', utmMedium: 'cpc' });
  });

  it('lets an explicit utm_source beat the inferred one', () => {
    const a = readAttribution(`${SITE}/?gclid=abc&utm_source=newsletter&utm_medium=email`);
    expect(a).toMatchObject({ utmSource: 'newsletter', utmMedium: 'email' });
  });

  it('keeps an external referrer and drops an internal one', () => {
    expect(readAttribution(`${SITE}/contact`, 'https://news.ycombinator.com/').referrer).toBe(
      'https://news.ycombinator.com/',
    );
    expect(readAttribution(`${SITE}/contact`, `${SITE}/blog/x`).referrer).toBeUndefined();
  });

  it('carries the browser timezone and locale through', () => {
    const a = readAttribution(`${SITE}/`, '', {
      timezone: 'Australia/Melbourne',
      locale: 'en-AU',
    });
    expect(a).toMatchObject({ timezone: 'Australia/Melbourne', locale: 'en-AU' });
  });

  it('omits empty keys instead of sending blank strings', () => {
    const a = readAttribution(`${SITE}/contact`);
    expect(Object.keys(a)).toHaveLength(0);
  });

  it('truncates to the width the API schema accepts', () => {
    const a = readAttribution(`${SITE}/?utm_source=${'x'.repeat(400)}`);
    expect(a.utmSource).toHaveLength(120);
  });

  it('truncates a long referrer to 500', () => {
    const a = readAttribution(`${SITE}/`, `https://other.example/${'y'.repeat(900)}`);
    expect(a.referrer).toHaveLength(500);
  });

  it('survives a URL it cannot parse', () => {
    expect(() => readAttribution('://broken')).not.toThrow();
    expect(readAttribution('://broken')).toEqual({});
  });
});

describe('mergeAttribution', () => {
  const landed: Attribution = { utmSource: 'google', utmMedium: 'cpc', timezone: 'Asia/Colombo' };

  it('keeps the first touch when a later page carries a different campaign', () => {
    const later: Attribution = { utmSource: 'linkedin', utmMedium: 'social' };
    expect(mergeAttribution(landed, later).utmSource).toBe('google');
  });

  it('keeps the first touch when a later page carries nothing', () => {
    expect(mergeAttribution(landed, {}).utmSource).toBe('google');
  });

  it('adopts a campaign when the session started without one', () => {
    // Someone who browses in, leaves, and comes back through an ad in the same
    // session should be credited to the ad.
    const out = mergeAttribution({ timezone: 'Australia/Sydney' }, { utmSource: 'google' });
    expect(out.utmSource).toBe('google');
  });

  it('treats an external referrer as a source worth keeping', () => {
    const out = mergeAttribution({ referrer: 'https://news.example/' }, { utmSource: 'linkedin' });
    expect(out.referrer).toBe('https://news.example/');
    expect(out.utmSource).toBeUndefined();
  });

  it('always refreshes timezone and locale, which describe the device not the campaign', () => {
    const out = mergeAttribution(landed, { timezone: 'Pacific/Auckland', locale: 'en-NZ' });
    expect(out).toMatchObject({
      utmSource: 'google',
      timezone: 'Pacific/Auckland',
      locale: 'en-NZ',
    });
  });

  it('does not lose a stored timezone when the new read has none', () => {
    expect(mergeAttribution(landed, { utmSource: 'x' }).timezone).toBe('Asia/Colombo');
  });

  it('is a no-op on two empty records', () => {
    expect(mergeAttribution({}, {})).toEqual({ timezone: undefined, locale: undefined });
  });
});
