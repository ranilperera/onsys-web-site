import { describe, it, expect } from 'vitest';
import {
  pageFingerprint,
  postFingerprint,
  nextContentUpdatedAt,
} from '../lib/content-changed';

/**
 * The sitemap's lastmod is only worth publishing if it means something.
 *
 * `updatedAt` moves on every write and the content seed rewrites all 37 pages
 * on every deploy, so the sitemap claimed every page changed at the same
 * instant. These guard the rule that replaced it: a date moves when the
 * content differs, and not otherwise.
 */

const page = (over: Record<string, unknown> = {}) => ({
  title: 'Remote Database Support',
  heading: 'Remote database support',
  eyebrow: null,
  lede: 'Cover from $1,500 a month.',
  blocks: [{ type: 'richText', html: '<p>Hello</p>' }],
  seoTitle: 'Remote Database Support Australia',
  seoDescription: 'Cover from $1,500 a month.',
  faqs: [{ question: 'How much?', answer: '$1,500.' }],
  ...over,
});

describe('pageFingerprint', () => {
  it('is stable for identical content', () => {
    expect(pageFingerprint(page())).toBe(pageFingerprint(page()));
  });

  it('ignores key order', () => {
    // Prisma and the seed build these objects differently; that is not an edit.
    const a = pageFingerprint({ title: 'A', lede: 'B' });
    const b = pageFingerprint({ lede: 'B', title: 'A' });
    expect(a).toBe(b);
  });

  it('ignores whitespace reflow', () => {
    // A paragraph rewrapped in the editor reads identically to a visitor.
    expect(pageFingerprint(page({ lede: 'Cover  from\n$1,500 a month.' }))).toBe(
      pageFingerprint(page()),
    );
  });

  it('treats null and undefined the same', () => {
    expect(pageFingerprint(page({ eyebrow: undefined }))).toBe(pageFingerprint(page()));
  });

  it('changes when a block changes', () => {
    expect(pageFingerprint(page({ blocks: [{ type: 'richText', html: '<p>Bye</p>' }] }))).not.toBe(
      pageFingerprint(page()),
    );
  });

  it('changes when an FAQ answer changes', () => {
    expect(
      pageFingerprint(page({ faqs: [{ question: 'How much?', answer: '$3,000.' }] })),
    ).not.toBe(pageFingerprint(page()));
  });

  it('changes when FAQs are reordered, because a reader sees the order', () => {
    const two = [
      { question: 'A', answer: '1' },
      { question: 'B', answer: '2' },
    ];
    expect(pageFingerprint(page({ faqs: two }))).not.toBe(
      pageFingerprint(page({ faqs: [...two].reverse() })),
    );
  });

  it('changes when the meta description changes', () => {
    expect(pageFingerprint(page({ seoDescription: 'Different.' }))).not.toBe(
      pageFingerprint(page()),
    );
  });

  it('does not change when status or navOrder change', () => {
    // Republishing an unchanged page is not a content change, and telling a
    // crawler it is was the whole defect.
    expect(pageFingerprint({ ...page(), status: 'DRAFT', navOrder: 9 })).toBe(
      pageFingerprint({ ...page(), status: 'PUBLISHED', navOrder: 1 }),
    );
  });
});

describe('postFingerprint', () => {
  const post = (over: Record<string, unknown> = {}) => ({
    title: 'Reduce log growth',
    excerpt: 'How to reduce it.',
    bodyHtml: '<p>Body</p>',
    seoDescription: 'How to reduce it.',
    authorName: 'Ranil Perera',
    ...over,
  });

  it('changes when the body changes', () => {
    expect(postFingerprint(post({ bodyHtml: '<p>Other</p>' }))).not.toBe(postFingerprint(post()));
  });

  it('changes when the byline changes', () => {
    expect(postFingerprint(post({ authorName: 'Someone Else' }))).not.toBe(
      postFingerprint(post()),
    );
  });

  it('is stable for identical content', () => {
    expect(postFingerprint(post())).toBe(postFingerprint(post()));
  });
});

describe('nextContentUpdatedAt', () => {
  const existing = new Date('2026-03-01T00:00:00.000Z');

  it('keeps the existing date when nothing changed', () => {
    expect(nextContentUpdatedAt('same', 'same', existing)).toBe(existing);
  });

  it('moves to now when the content differs', () => {
    const out = nextContentUpdatedAt('before', 'after', existing);
    expect(out).not.toBe(existing);
    expect(out.getTime()).toBeGreaterThan(existing.getTime());
  });

  it('sets a date for a row that never had one', () => {
    // Backfill covers existing rows; this covers anything the backfill missed.
    const out = nextContentUpdatedAt('same', 'same', null);
    expect(out).toBeInstanceOf(Date);
  });

  it('sets a date for a brand-new row', () => {
    expect(nextContentUpdatedAt(null, 'anything', null)).toBeInstanceOf(Date);
  });
});
