/**
 * Helpers for the llms.txt body. Pure, so the rules below are testable without
 * a database behind them.
 */

/**
 * The one-line description that follows a page link.
 *
 * The Pages section used to be thirty-eight bare links, which tells a retrieval
 * layer the page exists and nothing about whether it answers the question being
 * asked. The meta description is the line already written to do that job, so it
 * is preferred; the lede is the fallback, and a page with neither keeps its
 * bare link rather than getting an invented one.
 *
 * A description that already fits the ceiling is used whole. A longer one is
 * trimmed to the sentences that do fit, because this runs once per page and
 * the sections after it are the ones a retriever truncates.
 */
export function pageDescription(
  p: { lede?: string | null; seoDescription?: string | null },
  maxChars = 160,
): string {
  const raw = (p.seoDescription ?? p.lede ?? '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  if (raw.length <= maxChars) return raw;

  /**
   * Keep whole sentences while they fit.
   *
   * Cutting at the first sentence full stop is tempting and wrong: the
   * emergency support page opens "Production database down?", and a
   * description consisting of that question alone tells a retrieval layer
   * nothing it can answer with. The useful half is usually the sentence after.
   *
   * The lookahead on the terminator is what keeps "SQL Server 2016" and
   * "$1.5k" from reading as sentence ends — a real one is followed by a space
   * or the end of the string.
   */
  const sentences = raw.match(/[^.?!]+[.?!]+(?=\s|$)|[^.?!]+$/g) ?? [raw];
  let kept = '';
  for (const sentence of sentences) {
    const next = kept ? `${kept} ${sentence.trim()}` : sentence.trim();
    if (next.length > maxChars) break;
    kept = next;
  }
  if (kept) return kept;

  // Not even the first sentence fits. Cut on a word boundary and mark the cut,
  // so nothing reads as a complete sentence that was never written.
  const cut = raw.slice(0, maxChars);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\s]+$/, '')}…`;
}

/**
 * The ISO date (YYYY-MM-DD) to publish as the file's own freshness stamp.
 *
 * It is the freshest real content date on the site, not the time the request
 * was served. `force-dynamic` means "now" is always available and always
 * truthful-looking, which is exactly why it is the wrong answer: a file that
 * claims to be updated every hour carries no information, and that is the same
 * lie that was removed from the sitemap's lastmod.
 *
 * Returns null when there is nothing to date, so the caller omits the line
 * rather than publishing the epoch.
 */
export function freshestIsoDate(candidates: Array<string | null | undefined>): string | null {
  let best: number | null = null;
  for (const c of candidates) {
    if (!c) continue;
    const t = Date.parse(c);
    if (Number.isNaN(t)) continue;
    // A future date is a data error, not freshness.
    if (t > Date.now()) continue;
    if (best === null || t > best) best = t;
  }
  return best === null ? null : new Date(best).toISOString().slice(0, 10);
}
