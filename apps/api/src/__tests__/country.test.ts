import { describe, it, expect } from 'vitest';
import { deriveCountry, regionFromLocale, regionFromAcceptLanguage } from '../lib/country';

/**
 * The reporting question is "how many of these leads are Australian or from New
 * Zealand", and 90% of current clicks are not. These guard the derivation that
 * answers it, including the cases where it must refuse to answer.
 */

describe('regionFromLocale', () => {
  it('reads the region', () => {
    expect(regionFromLocale('en-AU')).toBe('AU');
    expect(regionFromLocale('en-NZ')).toBe('NZ');
  });

  it('handles a script subtag before the region', () => {
    expect(regionFromLocale('zh-Hans-SG')).toBe('SG');
  });

  it('returns null for a tag with no region', () => {
    expect(regionFromLocale('en')).toBeNull();
    expect(regionFromLocale('')).toBeNull();
    expect(regionFromLocale(null)).toBeNull();
  });

  it('does not mistake a three-letter subtag for a region', () => {
    expect(regionFromLocale('en-GBR')).toBeNull();
  });
});

describe('regionFromAcceptLanguage', () => {
  it('takes the first tag that carries a region', () => {
    expect(regionFromAcceptLanguage('en,en-AU;q=0.9,fr;q=0.8')).toBe('AU');
  });

  it('returns null when nothing carries one', () => {
    expect(regionFromAcceptLanguage('en,fr;q=0.8')).toBeNull();
    expect(regionFromAcceptLanguage('*')).toBeNull();
    expect(regionFromAcceptLanguage(undefined)).toBeNull();
  });
});

describe('deriveCountry', () => {
  it('maps the Australian zones', () => {
    for (const zone of [
      'Australia/Melbourne',
      'Australia/Sydney',
      'Australia/Perth',
      'Australia/Eucla',
      'Antarctica/Macquarie',
    ]) {
      expect(deriveCountry({ timezone: zone })).toBe('AU');
    }
  });

  it('maps New Zealand and the Pacific markets', () => {
    expect(deriveCountry({ timezone: 'Pacific/Auckland' })).toBe('NZ');
    expect(deriveCountry({ timezone: 'Pacific/Chatham' })).toBe('NZ');
    expect(deriveCountry({ timezone: 'Pacific/Fiji' })).toBe('FJ');
    expect(deriveCountry({ timezone: 'Pacific/Port_Moresby' })).toBe('PG');
  });

  it('maps the countries the blog traffic actually comes from', () => {
    expect(deriveCountry({ timezone: 'Asia/Colombo' })).toBe('LK');
    expect(deriveCountry({ timezone: 'Asia/Kolkata' })).toBe('IN');
    expect(deriveCountry({ timezone: 'Europe/London' })).toBe('GB');
  });

  it('falls back to Australia for an unlisted Australian zone', () => {
    expect(deriveCountry({ timezone: 'Australia/Somewhere_New' })).toBe('AU');
  });

  it('prefers the time zone over the browser locale', () => {
    // A laptop bought in the US and used in Melbourne is the common case, and
    // where the machine is beats how it was configured.
    expect(deriveCountry({ timezone: 'Australia/Melbourne', locale: 'en-US' })).toBe('AU');
  });

  it('uses the locale when the zone is unknown', () => {
    expect(deriveCountry({ timezone: 'Mars/Olympus', locale: 'en-NZ' })).toBe('NZ');
  });

  it('uses Accept-Language only when nothing better exists', () => {
    expect(deriveCountry({ acceptLanguage: 'en-AU,en;q=0.9' })).toBe('AU');
    expect(deriveCountry({ timezone: 'Mars/Olympus', locale: 'en', acceptLanguage: 'en-GB' })).toBe(
      'GB',
    );
  });

  it('returns null rather than guessing', () => {
    expect(deriveCountry({})).toBeNull();
    expect(deriveCountry({ timezone: '  ', locale: 'en', acceptLanguage: 'en' })).toBeNull();
    expect(deriveCountry({ timezone: 'Etc/UTC' })).toBeNull();
  });
});
