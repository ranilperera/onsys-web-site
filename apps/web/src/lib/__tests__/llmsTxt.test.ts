import { describe, it, expect } from 'vitest';
import { pageDescription, freshestIsoDate } from '../llmsTxt';

describe('pageDescription', () => {
  it('prefers the meta description, which is written for exactly this job', () => {
    expect(
      pageDescription({ seoDescription: 'Remote DBA cover from $1,500.', lede: 'Something else.' }),
    ).toBe('Remote DBA cover from $1,500.');
  });

  it('falls back to the lede', () => {
    expect(pageDescription({ seoDescription: null, lede: 'Cover from $1,500 a month.' })).toBe(
      'Cover from $1,500 a month.',
    );
  });

  it('returns empty when there is nothing written, rather than inventing a line', () => {
    expect(pageDescription({ seoDescription: null, lede: null })).toBe('');
    expect(pageDescription({ seoDescription: '   ' })).toBe('');
  });

  it('collapses whitespace so a wrapped seed string stays on one line', () => {
    // Every description in the seed is a wrapped template literal.
    expect(pageDescription({ seoDescription: 'Remote DBA\n  cover  from $1,500.' })).toBe(
      'Remote DBA cover from $1,500.',
    );
  });

  it('keeps every sentence that fits under the ceiling', () => {
    expect(
      pageDescription({ seoDescription: 'Remote DBA cover. Melbourne based. Call us.' }),
    ).toBe('Remote DBA cover. Melbourne based. Call us.');
  });

  it('does not reduce a description to the question it opens with', () => {
    // /emergency-database-support opens "Production database down?" and the
    // answer is the sentence after it. A first-sentence-only rule published the
    // question on its own, which is no use to anything answering a query.
    const out = pageDescription(
      { seoDescription: `Production database down? ${'Onsys responds in one hour. '.repeat(8)}` },
      100,
    );
    expect(out.startsWith('Production database down? Onsys responds in one hour.')).toBe(true);
  });

  it('does not split on a decimal point', () => {
    expect(pageDescription({ seoDescription: 'Upgrade from SQL Server 2016 to 2022.' })).toBe(
      'Upgrade from SQL Server 2016 to 2022.',
    );
    expect(pageDescription({ seoDescription: 'Costs $1.5k a month to run.' })).toBe(
      'Costs $1.5k a month to run.',
    );
  });

  it('truncates on a word boundary and marks the cut', () => {
    const out = pageDescription({ seoDescription: 'word '.repeat(60) }, 40);
    expect(out.length).toBeLessThanOrEqual(41);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toContain('wor…');
  });

  it('does not leave a dangling comma before the ellipsis', () => {
    expect(pageDescription({ seoDescription: 'Melbourne, Sydney, Brisbane and Perth' }, 20)).toBe(
      'Melbourne, Sydney…',
    );
  });

  it('truncates when even the first sentence overflows the ceiling', () => {
    const out = pageDescription({ seoDescription: `${'word '.repeat(60)}. Short.` }, 160);
    expect(out.length).toBeLessThanOrEqual(161);
    expect(out.endsWith('…')).toBe(true);
  });

  it('stops at a sentence boundary rather than ellipsing mid-sentence', () => {
    const out = pageDescription(
      { seoDescription: 'Short one. A considerably longer second sentence that will not fit.' },
      30,
    );
    expect(out).toBe('Short one.');
  });
});

describe('freshestIsoDate', () => {
  it('returns the newest date as YYYY-MM-DD', () => {
    expect(freshestIsoDate(['2026-09-01T00:00:00.000Z', '2026-09-28T11:00:00.000Z'])).toBe(
      '2026-09-28',
    );
  });

  it('ignores nulls, blanks and unparseable values', () => {
    expect(freshestIsoDate([null, undefined, '', 'soon', '2026-07-04T00:00:00.000Z'])).toBe(
      '2026-07-04',
    );
  });

  it('returns null when there is no usable date, so the line is omitted', () => {
    expect(freshestIsoDate([null, 'nonsense'])).toBeNull();
    expect(freshestIsoDate([])).toBeNull();
  });

  it('ignores a future date, which is a data error and not freshness', () => {
    const future = new Date(Date.now() + 86_400_000 * 30).toISOString();
    expect(freshestIsoDate([future, '2026-05-05T00:00:00.000Z'])).toBe('2026-05-05');
  });
});
