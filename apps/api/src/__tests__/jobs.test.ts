import { describe, it, expect } from 'vitest';
import { slugifyJob, isJobOpen, jobInputSchema } from '@onsys/shared';

describe('slugifyJob', () => {
  it('makes a URL slug from a title', () => {
    expect(slugifyJob('Senior SQL Server DBA (Melbourne)')).toBe('senior-sql-server-dba-melbourne');
  });

  it('strips accents rather than mangling them', () => {
    expect(slugifyJob('Développeur Logiciel')).toBe('developpeur-logiciel');
  });

  it('collapses punctuation and trims the hyphens it creates', () => {
    expect(slugifyJob('  DBA — 24/7 On-call!  ')).toBe('dba-24-7-on-call');
  });

  it('caps the length', () => {
    expect(slugifyJob('a'.repeat(200)).length).toBe(80);
  });
});

describe('isJobOpen', () => {
  const now = new Date('2026-10-03T09:00:00.000Z');

  it('treats the closing date as end of day', () => {
    // A job posted this morning that closes today must be open today — the
    // bug this guards is a vacancy disappearing the moment it is published.
    expect(isJobOpen('2026-10-03T00:00:00.000Z', now)).toBe(true);
  });

  it('is closed the day after', () => {
    expect(isJobOpen('2026-10-02T00:00:00.000Z', now)).toBe(false);
  });

  it('is open for a future date', () => {
    expect(isJobOpen('2026-11-30T00:00:00.000Z', now)).toBe(true);
  });

  it('accepts a Date as well as a string', () => {
    expect(isJobOpen(new Date('2026-10-31T00:00:00.000Z'), now)).toBe(true);
  });

  it('treats an unparseable date as closed rather than open forever', () => {
    expect(isJobOpen('whenever', now)).toBe(false);
  });
});

describe('jobInputSchema', () => {
  const valid = {
    title: 'Senior SQL Server DBA',
    slug: 'senior-sql-server-dba',
    summary: 'Melbourne-based, 24/7 rostered cover, senior.',
    type: 'PERMANENT' as const,
    location: 'AUSTRALIA' as const,
    workArrangement: 'HYBRID' as const,
    descriptionHtml: '<p>Run production SQL Server estates for Australian clients.</p>',
    closesAt: '2026-11-30',
  };

  it('accepts a complete advert', () => {
    expect(jobInputSchema.safeParse(valid).success).toBe(true);
  });

  it('defaults to DRAFT, so nothing publishes by accident', () => {
    const parsed = jobInputSchema.parse(valid);
    expect(parsed.status).toBe('DRAFT');
  });

  it('rejects a slug with spaces or capitals', () => {
    for (const slug of ['Senior DBA', 'senior_dba', 'Senior-DBA', '-dba-']) {
      expect(jobInputSchema.safeParse({ ...valid, slug }).success).toBe(false);
    }
  });

  it('rejects an invalid closing date', () => {
    expect(jobInputSchema.safeParse({ ...valid, closesAt: 'next Tuesday' }).success).toBe(false);
  });

  it('accepts a bare date from an <input type="date">', () => {
    expect(jobInputSchema.safeParse({ ...valid, closesAt: '2026-12-01' }).success).toBe(true);
  });

  it('rejects a description that is only a placeholder', () => {
    expect(jobInputSchema.safeParse({ ...valid, descriptionHtml: 'TBC' }).success).toBe(false);
  });

  it('allows the optional fields to be empty strings, as a form posts them', () => {
    const parsed = jobInputSchema.safeParse({
      ...valid,
      salaryRange: '',
      applyEmail: '',
      seoTitle: '',
      seoDescription: '',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects an apply address that is not an email', () => {
    expect(jobInputSchema.safeParse({ ...valid, applyEmail: 'careers at onsys' }).success).toBe(
      false,
    );
  });

  it('rejects ARCHIVED, which the admin form does not offer', () => {
    expect(jobInputSchema.safeParse({ ...valid, status: 'ARCHIVED' }).success).toBe(false);
  });
});
