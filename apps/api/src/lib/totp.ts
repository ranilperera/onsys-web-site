import crypto from 'node:crypto';
import { generateSecret, generateURI, generateSync, verifySync } from 'otplib';
import { org } from './env';

/**
 * Time-based one-time passwords for admin sign-in.
 *
 * Pure and dependency-light on purpose, in the same spirit as escalation.ts
 * and otp.ts: this decides who gets into the console, so it must be testable
 * against the RFC 6238 vectors rather than "looks right in the browser".
 */

/**
 * Accept a code from one step either side of now.
 *
 * otplib defaults `epochTolerance` to 0 — a literal reading of "the current
 * period and nothing else". In practice a phone whose clock is a few seconds
 * out, or a code typed just as the period rolls over, is then rejected, and
 * the admin concludes MFA is broken. One step is the usual compromise: it
 * widens the window a legitimate code is valid for to ~90 seconds, while
 * leaving a brute-force attacker needing 1 in ~333,000 per attempt against a
 * rate-limited endpoint.
 */
export const TOTP_TOLERANCE_SECONDS = 30;

export const RECOVERY_CODE_COUNT = 10;

/** Base32, 20 bytes — what every authenticator app expects. */
export function newTotpSecret(): string {
  return generateSecret();
}

/**
 * otpauth:// URI for the enrolment QR code. The label is the admin's email so
 * someone administering two tenants can tell the entries apart.
 */
export function totpEnrolmentUri(secret: string, email: string): string {
  return generateURI({ issuer: org.name, label: email, secret });
}

/** Current code for a secret. Test/diagnostic use — never sent to a client. */
export function currentTotp(secret: string, epoch?: number): string {
  return generateSync({ secret, ...(epoch === undefined ? {} : { epoch }) });
}

/**
 * True when `token` is a valid code for `secret`.
 *
 * Never throws: a malformed secret or a token with letters in it is a failed
 * verification, not a 500. An exception here would turn a typo into an error
 * page and tell the person nothing useful.
 */
export function verifyTotp(secret: string, token: string, epoch?: number): boolean {
  const cleaned = token.replace(/\s/g, '');
  if (!/^\d{6}$/.test(cleaned)) return false;

  try {
    const result = verifySync({
      secret,
      token: cleaned,
      epochTolerance: TOTP_TOLERANCE_SECONDS,
      ...(epoch === undefined ? {} : { epoch }),
    });
    return result.valid;
  } catch {
    return false;
  }
}

/**
 * Ten single-use recovery codes, shown once at enrolment.
 *
 * Grouped as xxxx-xxxx so they can be read off a printout without losing your
 * place. Ambiguous characters are excluded from the alphabet — someone typing
 * a recovery code has already lost their phone and does not need to work out
 * whether that was a zero or an O.
 */
const RECOVERY_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  return Array.from({ length: count }, () => {
    const chars = Array.from(
      { length: 8 },
      () => RECOVERY_ALPHABET[crypto.randomInt(0, RECOVERY_ALPHABET.length)],
    ).join('');
    return `${chars.slice(0, 4)}-${chars.slice(4)}`;
  });
}

/** Normalised so case and the dash do not decide whether someone gets in. */
export function normaliseRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Recovery codes are stored hashed, exactly like passwords and chat OTPs.
 * They are long-lived credentials — a leaked table of plaintext codes is a
 * leaked table of admin logins.
 */
export function hashRecoveryCode(code: string): string {
  return crypto.createHash('sha256').update(normaliseRecoveryCode(code)).digest('hex');
}
