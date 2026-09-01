import crypto from 'node:crypto';

/**
 * One-time codes for the chat widget's email gate.
 *
 * Kept free of database and model imports deliberately, in the same spirit as
 * escalation.ts: this is the security-critical part, it runs before anyone is
 * allowed to speak to us, and it must stay trivially testable.
 */

export const OTP_TTL_MINUTES = 10;
/** Wrong guesses before the code is burned and a new one must be requested. */
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60_000;

/**
 * Six digits from a CSPRNG.
 *
 * randomInt is uniform over the range, unlike `Math.random() * 900000 + 100000`
 * — and unlike that expression, this can legitimately produce a value below
 * 100000, so the padding is what keeps every code exactly six characters. A
 * short code would fail the client-side length check and lock the visitor out
 * of a conversation they were entitled to have.
 */
export function generateCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

/**
 * Codes are stored hashed, salted with the session id, so the same code issued
 * for two conversations produces different rows and a stolen hash cannot be
 * replayed anywhere but its own session. A leaked database row must never hand
 * someone a working credential.
 */
export function hashCode(sessionId: string, code: string): string {
  return crypto.createHash('sha256').update(`${sessionId}:${code}`).digest('hex');
}

/** Constant-time comparison, so a wrong code leaks nothing through timing. */
export function codeMatches(sessionId: string, code: string, storedHash: string): boolean {
  const provided = Buffer.from(hashCode(sessionId, code));
  const expected = Buffer.from(storedHash);
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}
