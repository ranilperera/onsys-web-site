/**
 * Who counts as the same customer for the "one free health check" rule.
 *
 * The offer is one free check, on one instance, per customer — so the second
 * request has to be recognisable even when it comes from a colleague rather
 * than the same person. Matching the email domain does that for a company with
 * its own domain.
 *
 * It must not do it for a free mailbox provider: two unrelated businesses both
 * using gmail.com are not the same customer, and refusing the second one would
 * turn away a real lead to save an analysis that was never claimed.
 */

/** Domains where a shared suffix says nothing about a shared employer. */
export const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'outlook.com.au', 'hotmail.com',
  'hotmail.com.au', 'live.com', 'live.com.au', 'yahoo.com', 'yahoo.com.au',
  'ymail.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'msn.com',
  'bigpond.com', 'bigpond.net.au', 'optusnet.com.au', 'iinet.net.au',
  'tpg.com.au', 'internode.on.net', 'proton.me', 'protonmail.com', 'gmx.com',
  'zoho.com', 'mail.com', 'yandex.com',
]);

export interface ClaimMatch {
  /** Always matched: the same address is always the same customer. */
  email: string;
  /**
   * Matched as well when the address belongs to a company domain. Null for a
   * free provider, where the domain carries no signal about the employer.
   */
  domain: string | null;
}

/**
 * Work out how to look for an earlier claim of the free health check.
 *
 * Returns the normalised address to match, and the domain to match alongside
 * it when that domain identifies an organisation.
 */
export function claimMatchFor(email: string): ClaimMatch {
  const normalised = email.trim().toLowerCase();
  const domain = normalised.split('@')[1] ?? '';

  // A malformed address still matches itself; it just cannot match a domain.
  if (!domain || !domain.includes('.') || FREE_EMAIL_DOMAINS.has(domain)) {
    return { email: normalised, domain: null };
  }
  return { email: normalised, domain };
}
