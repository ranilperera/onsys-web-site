/**
 * Decide whether a write actually changed what a reader would see.
 *
 * `updatedAt` cannot answer this: Prisma moves it on every write, and the
 * content seed rewrites all thirty-seven pages on every deploy whether or not
 * a word differs. The sitemap that came out of that claimed every page changed
 * at the same instant, which is worse than a stale date — it tells a crawler
 * nothing about which of several similar pages is current, on a site whose
 * pages are deliberately similar.
 *
 * So `contentUpdatedAt` is moved only when the fingerprint below differs.
 * Fields that affect presentation but not meaning — status, navOrder, ordering
 * columns — are deliberately excluded: republishing an unchanged page is not a
 * content change, and claiming otherwise is the exact lie we are removing.
 */

/** Stable JSON: key order must not decide whether content "changed". */
function stable(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(',')}}`;
  }
  // Collapse whitespace so a reflowed paragraph that reads identically does
  // not register as an edit.
  if (typeof value === 'string') return JSON.stringify(value.replace(/\s+/g, ' ').trim());
  return JSON.stringify(value);
}

export function fingerprint(parts: Record<string, unknown>): string {
  return stable(parts);
}

/** The fields that make up a page's visible content. */
export function pageFingerprint(p: {
  title?: string | null;
  heading?: string | null;
  eyebrow?: string | null;
  lede?: string | null;
  blocks?: unknown;
  heroImage?: string | null;
  heroCtas?: unknown;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  noindex?: boolean | null;
  faqs?: Array<{ question: string; answer: string }>;
}): string {
  return fingerprint({
    title: p.title ?? null,
    heading: p.heading ?? null,
    eyebrow: p.eyebrow ?? null,
    lede: p.lede ?? null,
    blocks: p.blocks ?? null,
    heroImage: p.heroImage ?? null,
    heroCtas: p.heroCtas ?? null,
    seoTitle: p.seoTitle ?? null,
    seoDescription: p.seoDescription ?? null,
    canonicalUrl: p.canonicalUrl ?? null,
    noindex: p.noindex ?? false,
    // Order matters to a reader, so it is kept rather than sorted away.
    faqs: (p.faqs ?? []).map((f) => ({ q: f.question, a: f.answer })),
  });
}

/** The fields that make up a post's visible content. */
export function postFingerprint(p: {
  title?: string | null;
  excerpt?: string | null;
  bodyHtml?: string | null;
  coverImage?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  noindex?: boolean | null;
  authorName?: string | null;
  faqs?: Array<{ question: string; answer: string }>;
}): string {
  return fingerprint({
    title: p.title ?? null,
    excerpt: p.excerpt ?? null,
    bodyHtml: p.bodyHtml ?? null,
    coverImage: p.coverImage ?? null,
    seoTitle: p.seoTitle ?? null,
    seoDescription: p.seoDescription ?? null,
    canonicalUrl: p.canonicalUrl ?? null,
    noindex: p.noindex ?? false,
    authorName: p.authorName ?? null,
    faqs: (p.faqs ?? []).map((f) => ({ q: f.question, a: f.answer })),
  });
}

/**
 * The value to write to contentUpdatedAt.
 *
 * Returns the existing timestamp when nothing changed, so an unchanged row
 * keeps the date it earned. Returns now when the content differs, and now for
 * a row that has never carried one.
 */
export function nextContentUpdatedAt(
  before: string | null,
  after: string,
  existing: Date | null | undefined,
): Date {
  if (before !== null && before === after && existing) return existing;
  return new Date();
}
