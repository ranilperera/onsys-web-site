import { describe, it, expect } from 'vitest';
import { leadInputSchema } from '@onsys/shared';

describe('leadInputSchema', () => {
  const valid = { name: 'Jane Smith', email: 'jane@company.com.au' };

  it('accepts a minimal valid lead', () => {
    expect(leadInputSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a malformed email', () => {
    const result = leadInputSchema.safeParse({ ...valid, email: 'nope' });
    expect(result.success).toBe(false);
  });

  it('rejects a name that is too short', () => {
    expect(leadInputSchema.safeParse({ ...valid, name: 'J' }).success).toBe(false);
  });

  it('rejects a filled honeypot', () => {
    const result = leadInputSchema.safeParse({ ...valid, website: 'http://spam.example' });
    expect(result.success).toBe(false);
  });

  it('allows optional fields to be empty strings', () => {
    const result = leadInputSchema.safeParse({ ...valid, company: '', phone: '', message: '' });
    expect(result.success).toBe(true);
  });
});
