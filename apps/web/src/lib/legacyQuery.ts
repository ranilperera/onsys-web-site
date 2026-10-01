/**
 * Legacy WordPress query strings.
 *
 * Google has `/?mailpoet_page=subscriptions` in the index as a URL distinct
 * from the homepage, and it has been there across four SEO reports. The
 * canonical tag on the page already points at the clean path; Google indexed it
 * anyway. A canonical is a hint, and a 301 is an instruction.
 *
 * Query strings never reach the redirect map — that matches on pathname only —
 * so this has to be handled in the middleware itself.
 *
 * Named parameters only, and extended by name rather than generalised. A
 * blanket "strip anything not recognised" would eat `?category=` and `?page=`
 * on the blog, `?token=` on the collector download, and every `utm_*` the
 * marketing attribution depends on. Missing one legacy parameter costs one
 * duplicate URL; eating a real one breaks a working page.
 *
 * Deliberately NOT included: `?p=` and `?cat=`, WordPress's own unpretty
 * permalinks. Neither has been observed indexed on this site, both are short
 * enough to collide with a parameter someone adds later, and `/?p=123` carries
 * information this code cannot resolve — stripping it would send a specific
 * post to the homepage.
 */
const LEGACY_QUERY_PARAMS = [
  'mailpoet_page',
  'mailpoet_router',
  'replytocom',
  'attachment_id',
];

/**
 * The query string a URL should keep, or null when it carries no legacy
 * parameter and therefore needs no redirect at all.
 *
 * Returns a leading '?' when anything survives and '' when nothing does, so the
 * result can be assigned straight to url.search. Legitimate parameters
 * alongside a legacy one are preserved: ?utm_source=x&replytocom=5 keeps the
 * utm_source.
 */
export function cleanLegacyQuery(params: URLSearchParams): string | null {
  if (!LEGACY_QUERY_PARAMS.some((p) => params.has(p))) return null;
  const kept = new URLSearchParams(params);
  for (const p of LEGACY_QUERY_PARAMS) kept.delete(p);
  const q = kept.toString();
  return q ? `?${q}` : '';
}
