import { describe, it, expect } from 'vitest';
import { cleanLegacyQuery } from '../legacyQuery';

/**
 * `/?mailpoet_page=subscriptions` has been in Google's index as a separate URL
 * from the homepage across four consecutive SEO reports. These guard both
 * halves of the fix: the legacy parameter goes, and nothing else does.
 */

const clean = (qs: string) => cleanLegacyQuery(new URLSearchParams(qs));

describe('cleanLegacyQuery', () => {
  it('returns null when there is nothing to strip, so no redirect fires', () => {
    expect(clean('')).toBeNull();
    expect(clean('utm_source=linkedin&utm_medium=social')).toBeNull();
  });

  it('strips the indexed mailpoet parameter down to no query at all', () => {
    expect(clean('mailpoet_page=subscriptions')).toBe('');
  });

  it('keeps the parameters that are not legacy', () => {
    expect(clean('utm_source=google&replytocom=481')).toBe('?utm_source=google');
  });

  it('strips several legacy parameters in one pass', () => {
    expect(clean('mailpoet_page=x&mailpoet_router&attachment_id=9')).toBe('');
  });

  it('strips a valueless legacy parameter', () => {
    // /?replytocom is still a distinct URL to a crawler.
    expect(clean('replytocom')).toBe('');
  });

  it('leaves the blog listing parameters alone', () => {
    // ?page= and ?category= drive real pagination and filtering; eating them
    // would break the listing, which is far worse than one duplicate URL.
    expect(clean('page=3')).toBeNull();
    expect(clean('category=database&page=2')).toBeNull();
  });

  it('leaves the collector download token alone', () => {
    // The token is the only thing standing between the gated script and anyone
    // who guesses the URL.
    expect(clean('token=abc123')).toBeNull();
  });

  it('does not strip WordPress ?p= or ?cat=', () => {
    // Not observed indexed here, short enough to collide with a parameter
    // someone adds later, and /?p=123 names a post this code cannot resolve.
    expect(clean('p=481')).toBeNull();
    expect(clean('cat=7')).toBeNull();
  });

  it('is case-sensitive, matching how a query string is actually keyed', () => {
    expect(clean('MailPoet_Page=x')).toBeNull();
  });

  it('never returns a bare "?"', () => {
    // url.search = '?' would publish a redirect target ending in a stray ?.
    for (const qs of ['mailpoet_page=a', 'replytocom=1&attachment_id=2']) {
      expect(clean(qs)).toBe('');
    }
  });

  it('preserves a repeated non-legacy parameter', () => {
    expect(clean('tag=a&tag=b&replytocom=1')).toBe('?tag=a&tag=b');
  });
});
