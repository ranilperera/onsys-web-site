import { describe, it, expect } from 'vitest';
import { claimMatchFor, FREE_EMAIL_DOMAINS } from '@onsys/shared';

describe('claimMatchFor', () => {
  it('matches a company domain as well as the address', () => {
    // The second request for a free check usually comes from a colleague, not
    // the person who asked first.
    expect(claimMatchFor('ann@acme.com.au')).toEqual({
      email: 'ann@acme.com.au',
      domain: 'acme.com.au',
    });
  });

  it('does not match on a free mailbox domain', () => {
    // Two unrelated businesses both on gmail.com are not the same customer.
    // Blocking the second would turn away a real lead.
    for (const address of ['dan@gmail.com', 'eve@outlook.com', 'joe@bigpond.net.au']) {
      expect(claimMatchFor(address).domain).toBeNull();
    }
  });

  it('still matches a free-mailbox user against themselves', () => {
    expect(claimMatchFor('dan@gmail.com').email).toBe('dan@gmail.com');
  });

  it('normalises case, so a recapitalised address is still the same claim', () => {
    expect(claimMatchFor('Ann@ACME.com.au')).toEqual({
      email: 'ann@acme.com.au',
      domain: 'acme.com.au',
    });
  });

  it('trims surrounding whitespace', () => {
    expect(claimMatchFor('  ann@acme.com.au  ').email).toBe('ann@acme.com.au');
  });

  it('treats a domain with no dot as unusable for matching', () => {
    // "localhost" or a typo — matching every address ending in it would sweep
    // in unrelated people.
    expect(claimMatchFor('root@localhost').domain).toBeNull();
  });

  it('does not throw on a malformed address', () => {
    expect(claimMatchFor('not-an-email')).toEqual({ email: 'not-an-email', domain: null });
    expect(claimMatchFor('')).toEqual({ email: '', domain: null });
  });

  it('covers the Australian consumer providers that actually turn up', () => {
    for (const d of ['bigpond.com', 'optusnet.com.au', 'iinet.net.au', 'tpg.com.au']) {
      expect(FREE_EMAIL_DOMAINS.has(d)).toBe(true);
    }
  });

  it('does not classify an Australian company domain as a free provider', () => {
    // The list is an exception list; a false entry here silently denies a
    // legitimate customer their free check.
    for (const d of ['onsys.com.au', 'telstra.com.au', 'anz.com', 'acme.com.au']) {
      expect(FREE_EMAIL_DOMAINS.has(d)).toBe(false);
    }
  });
});
