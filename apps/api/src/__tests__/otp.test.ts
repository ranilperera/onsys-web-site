import { describe, it, expect } from 'vitest';
import { generateCode, hashCode, codeMatches } from '../lib/otp';

describe('generateCode', () => {
  it('always returns exactly six digits', () => {
    // The padding is the point: randomInt can return values below 100000, and
    // a five-character code fails the widget's length check, locking out a
    // visitor who did nothing wrong. 2000 draws makes a missing padStart
    // overwhelmingly likely to show up.
    for (let i = 0; i < 2000; i += 1) {
      expect(generateCode()).toMatch(/^\d{6}$/);
    }
  });

  it('does not return the same code twice in a row', () => {
    const codes = new Set(Array.from({ length: 50 }, generateCode));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe('hashCode', () => {
  it('never returns the code itself', () => {
    expect(hashCode('sess_1', '123456')).not.toContain('123456');
  });

  it('salts by session, so one code hashes differently per conversation', () => {
    expect(hashCode('sess_1', '123456')).not.toBe(hashCode('sess_2', '123456'));
  });

  it('is stable for the same session and code', () => {
    expect(hashCode('sess_1', '123456')).toBe(hashCode('sess_1', '123456'));
  });
});

describe('codeMatches', () => {
  const session = 'sess_abc';
  const stored = hashCode(session, '123456');

  it('accepts the right code', () => {
    expect(codeMatches(session, '123456', stored)).toBe(true);
  });

  it('rejects the wrong code', () => {
    expect(codeMatches(session, '654321', stored)).toBe(false);
  });

  it('rejects a code issued for a different session', () => {
    expect(codeMatches('sess_other', '123456', stored)).toBe(false);
  });

  it('rejects a malformed stored hash without throwing', () => {
    // timingSafeEqual throws on a length mismatch, which would surface as a
    // 500 instead of a clean "wrong code" for any row written by an older
    // build or truncated in the database.
    expect(() => codeMatches(session, '123456', 'short')).not.toThrow();
    expect(codeMatches(session, '123456', 'short')).toBe(false);
  });
});
