import { describe, it, expect } from 'vitest';
import { rankRelated, significantWords, relatednessScore } from '../lib/related';

/** Real titles from the blog, which is where the reported failure came from. */
const TDE = {
  title:
    'How to Enable TDE on SQL Server 2019 Standard with Always On Availability Groups for Selected Databases',
  excerpt: 'Enabling Transparent Data Encryption across an availability group.',
  categoryId: 'db',
  publishedAt: new Date('2026-04-01'),
};

const CORPUS = [
  {
    title: 'Secure Your SQL Server 2019: A Practical Guide to Enabling SSL/TLS Encryption',
    excerpt: 'Protecting database traffic with certificates.',
    categoryId: 'db',
    publishedAt: new Date('2026-06-03'),
  },
  {
    title: 'How to Find and List Oracle Archive Logs for Specific Dates and RMAN Backups',
    excerpt: 'Managing archive logs as an Oracle DBA.',
    categoryId: 'db',
    publishedAt: new Date('2026-07-07'),
  },
  {
    title: 'Replicating AWS RDS MySQL to SQL Server on Windows',
    excerpt: 'Change data capture with Debezium.',
    categoryId: 'db',
    publishedAt: new Date('2026-07-05'),
  },
  {
    title: 'Configuring Always On Availability Groups for SQL Server 2019',
    excerpt: 'Setting up availability groups end to end.',
    categoryId: 'db',
    publishedAt: new Date('2025-01-01'),
  },
];

describe('rankRelated', () => {
  it('puts the topically closest post first, not the newest', () => {
    // The reported bug: the TDE article recommended the Oracle RMAN guide,
    // purely because it was recent and in the same category.
    const [first] = rankRelated(TDE, CORPUS);
    expect(first.title).toContain('Always On Availability Groups');
  });

  it('does not recommend the Oracle RMAN guide for a SQL Server TDE article', () => {
    const titles = rankRelated(TDE, CORPUS).map((p) => p.title);
    expect(titles.some((t) => t.includes('Oracle Archive Logs'))).toBe(false);
  });

  it('drops candidates with nothing in common rather than padding to three', () => {
    const unrelated = [
      { title: 'Choosing a Melbourne Coworking Space', categoryId: 'x', publishedAt: new Date() },
    ];
    expect(rankRelated(TDE, unrelated)).toEqual([]);
  });

  it('returns at most the requested number', () => {
    expect(rankRelated(TDE, CORPUS, 2).length).toBeLessThanOrEqual(2);
  });

  it('breaks ties on recency', () => {
    const older = { title: 'Enabling TDE basics', categoryId: 'db', publishedAt: new Date('2020-01-01') };
    const newer = { title: 'Enabling TDE basics', categoryId: 'db', publishedAt: new Date('2026-01-01') };
    expect(rankRelated(TDE, [older, newer])[0]).toBe(newer);
  });

  it('never suggests the article itself — callers exclude it, and it would score highest', () => {
    // Documents the contract rather than the implementation: rankRelated does
    // not know the subject's id, so excluding self is the query's job.
    const withSelf = rankRelated(TDE, [{ ...TDE }]);
    expect(withSelf).toHaveLength(1);
  });
});

describe('significantWords', () => {
  it('drops corpus-wide noise that would score every pair alike', () => {
    const words = significantWords('How to Tune a SQL Server Database');
    expect(words.has('sql')).toBe(false);
    expect(words.has('server')).toBe(false);
    expect(words.has('database')).toBe(false);
    // "tune" is four characters and survives the length floor — it is a real
    // topic word, unlike the platform nouns above.
    expect(words.has('tune')).toBe(true);
  });

  it('drops words of three characters or fewer', () => {
    const words = significantWords('Log Shipping for Big Estates');
    expect(words.has('log')).toBe(false);
    expect(words.has('big')).toBe(false);
    expect(words.has('shipping')).toBe(true);
  });

  it('keeps the terms that actually distinguish an article', () => {
    const words = significantWords('Enabling Transparent Data Encryption on Always On');
    expect(words.has('transparent')).toBe(true);
    expect(words.has('encryption')).toBe(true);
    expect(words.has('always')).toBe(true);
  });

  it('is case and punctuation insensitive', () => {
    expect(significantWords('Always-On, Encryption!')).toEqual(
      significantWords('always-on encryption'),
    );
  });
});

describe('relatednessScore', () => {
  it('weights a shared topic above a shared category', () => {
    const subject = significantWords('Transparent Encryption Certificates');
    const sameTopicDifferentCategory = relatednessScore(
      subject,
      { title: 'Transparent Encryption explained', categoryId: 'other' },
      'db',
    );
    const sameCategoryNoTopic = relatednessScore(
      subject,
      { title: 'Coworking spaces in Melbourne', categoryId: 'db' },
      'db',
    );
    expect(sameTopicDifferentCategory).toBeGreaterThan(sameCategoryNoTopic);
  });

  it('scores zero when nothing is shared', () => {
    expect(relatednessScore(significantWords('Encryption'), { title: 'Coworking' }, null)).toBe(0);
  });
});
