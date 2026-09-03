/**
 * Topical clustering for "related posts".
 *
 * Kept free of database and model imports deliberately, in the same spirit as
 * escalation.ts and otp.ts: this decides what a reader is offered next, it is
 * pure scoring, and it should be testable against the real failure it fixes.
 *
 * The previous implementation was "same category, newest first". Almost every
 * post sits in Database, so the same three recent articles appeared under
 * everything, and a piece on Transparent Data Encryption recommended an Oracle
 * RMAN guide.
 *
 * Application-side scoring is right at this corpus size (~50 posts). At 500
 * this should become a Postgres full-text query.
 */

/**
 * Words too common in this corpus to distinguish anything.
 *
 * "database", "server" and "sql" appear in most titles on this site, so
 * leaving them in scores every pair alike and quietly reproduces the recency
 * widget this replaces.
 */
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'how', 'why', 'what', 'when', 'your', 'you',
  'this', 'that', 'into', 'onto', 'using', 'guide', 'introduction', 'part',
  'database', 'databases', 'server', 'servers', 'sql',
]);

export function significantWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w)),
  );
}

export interface Relatable {
  title: string;
  excerpt?: string | null;
  publishedAt?: Date | string | null;
  categoryId?: string | null;
}

/**
 * Score one candidate against the article being read.
 *
 * Shared significant words are worth 2 each; sharing a category is worth 1.
 * The weighting matters: category is a single bit of information where word
 * overlap is many, so letting category dominate would rebuild the old
 * behaviour with extra steps.
 */
export function relatednessScore(subject: Set<string>, candidate: Relatable, subjectCategoryId?: string | null): number {
  const words = significantWords(`${candidate.title} ${candidate.excerpt ?? ''}`);
  let overlap = 0;
  for (const w of subject) if (words.has(w)) overlap += 1;

  const sameCategory = Boolean(
    candidate.categoryId && subjectCategoryId && candidate.categoryId === subjectCategoryId,
  );
  return overlap * 2 + (sameCategory ? 1 : 0);
}

/**
 * Rank candidates, best first. Recency only breaks ties.
 *
 * Anything scoring zero is dropped rather than used as filler — two genuine
 * suggestions are worth more than three where the third is unrelated, and a
 * visibly irrelevant recommendation costs trust in the other two.
 */
export function rankRelated<T extends Relatable>(
  subject: Relatable,
  candidates: T[],
  limit = 3,
): T[] {
  const subjectWords = significantWords(`${subject.title} ${subject.excerpt ?? ''}`);

  return candidates
    .map((c) => ({ post: c, score: relatednessScore(subjectWords, c, subject.categoryId) }))
    .filter((c) => c.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        new Date(b.post.publishedAt ?? 0).getTime() - new Date(a.post.publishedAt ?? 0).getTime(),
    )
    .slice(0, limit)
    .map((c) => c.post);
}
