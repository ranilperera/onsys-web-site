import { describe, it, expect } from 'vitest';
import {
  newTotpSecret,
  totpEnrolmentUri,
  currentTotp,
  verifyTotp,
  generateRecoveryCodes,
  hashRecoveryCode,
  normaliseRecoveryCode,
} from '../lib/totp';

/**
 * RFC 6238 Appendix B, SHA-1: ASCII secret "12345678901234567890", which is
 * GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ in base32.
 *
 * These are here because the admin console's front door depends on them. An
 * otplib upgrade that changes a default — the hash, the period, the epoch
 * origin — would otherwise be discovered by every admin being locked out at
 * once, with a working build and passing tests.
 */
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('TOTP against the RFC 6238 vectors', () => {
  const vectors: Array<[number, string]> = [
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
  ];

  it.each(vectors)('epoch %i produces the published code', (epoch, expected8) => {
    // We issue 6-digit codes; the published vectors are 8-digit and the
    // 6-digit form is its last six characters.
    expect(currentTotp(RFC_SECRET, epoch)).toBe(expected8.slice(-6));
  });

  it.each(vectors)('accepts the published code at epoch %i', (epoch, expected8) => {
    expect(verifyTotp(RFC_SECRET, expected8.slice(-6), epoch)).toBe(true);
  });
});

describe('verifyTotp', () => {
  it('tolerates a phone whose clock is a step out', () => {
    // The reason TOTP_TOLERANCE_SECONDS is not left at otplib's default of 0:
    // without it, a slightly fast phone reads as "MFA is broken".
    const now = 1_700_000_000;
    expect(verifyTotp(RFC_SECRET, currentTotp(RFC_SECRET, now + 25), now)).toBe(true);
    expect(verifyTotp(RFC_SECRET, currentTotp(RFC_SECRET, now - 25), now)).toBe(true);
  });

  it('rejects a code from far outside the window', () => {
    const now = 1_700_000_000;
    expect(verifyTotp(RFC_SECRET, currentTotp(RFC_SECRET, now + 600), now)).toBe(false);
  });

  it('rejects the wrong code', () => {
    expect(verifyTotp(RFC_SECRET, '000000', 59)).toBe(false);
  });

  it('rejects malformed input without throwing', () => {
    // A typo must be a failed sign-in, not a 500.
    expect(() => verifyTotp(RFC_SECRET, 'abcdef')).not.toThrow();
    expect(verifyTotp(RFC_SECRET, 'abcdef')).toBe(false);
    expect(verifyTotp(RFC_SECRET, '12345')).toBe(false);
    expect(verifyTotp(RFC_SECRET, '')).toBe(false);
    expect(verifyTotp('not-a-secret', '123456')).toBe(false);
  });

  it('ignores spaces, which authenticator apps display in the code', () => {
    expect(verifyTotp(RFC_SECRET, '287 082', 59)).toBe(true);
  });
});

describe('enrolment', () => {
  it('produces a secret an authenticator app will accept', () => {
    const secret = newTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/); // base32, no padding
    expect(verifyTotp(secret, currentTotp(secret))).toBe(true);
  });

  it('builds an otpauth URI carrying the issuer and the secret', () => {
    const secret = newTotpSecret();
    const uri = totpEnrolmentUri(secret, 'admin@onsys.com.au');
    expect(uri.startsWith('otpauth://totp/')).toBe(true);
    expect(uri).toContain(`secret=${secret}`);
    expect(uri).toContain('issuer=');
  });

  it('gives every admin a different secret', () => {
    const secrets = new Set(Array.from({ length: 20 }, newTotpSecret));
    expect(secrets.size).toBe(20);
  });
});

describe('recovery codes', () => {
  it('issues ten distinct codes', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
  });

  it('avoids characters that are ambiguous on paper', () => {
    // Someone typing a recovery code has already lost their phone; they should
    // not also have to decide whether that was a zero or an O.
    for (const code of generateRecoveryCodes(50)) {
      expect(code).toMatch(/^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
      expect(code).not.toMatch(/[O0I1]/);
    }
  });

  it('matches regardless of case and dashes', () => {
    const [code] = generateRecoveryCodes(1);
    expect(hashRecoveryCode(code.toLowerCase())).toBe(hashRecoveryCode(code));
    expect(hashRecoveryCode(code.replace('-', ''))).toBe(hashRecoveryCode(code));
    expect(hashRecoveryCode(` ${code} `)).toBe(hashRecoveryCode(code));
  });

  it('never stores the code itself', () => {
    const [code] = generateRecoveryCodes(1);
    expect(hashRecoveryCode(code)).not.toContain(normaliseRecoveryCode(code));
  });
});
