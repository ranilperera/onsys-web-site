/**
 * Turn pasted rich text into the site's blog HTML.
 *
 * The workflow this serves: draft an article in ChatGPT (or Word, or Google
 * Docs), copy it, paste it into the admin editor, save. What arrives is
 * structurally fine but carries a pile of foreign presentation — inline
 * styles, framework classes, `<span>` soup, headings that start at h1, and
 * whatever chrome the source app wrapped its code blocks in.
 *
 * Two passes, either side of DOMPurify, because the order matters:
 *
 *   before  — heading levels and tag names. `h1` is not in the sanitiser's
 *             allow-list, so a pasted `<h1>` would otherwise have its tag
 *             stripped and collapse silently into the paragraph beside it.
 *             The heading has to be demoted while it still exists.
 *   after   — presentation. DOMPurify emits well-formed markup, so the
 *             regexes here are working on predictable input rather than on
 *             whatever a word processor felt like producing.
 *
 * Kept free of database and model imports, in the same spirit as
 * escalation.ts and otp.ts: it is pure, and it decides what ends up on the
 * public site, so it should be testable on its own.
 */

/** Tags the article stylesheet has no rule for, and which read as noise. */
const UNWRAP_TAGS = ['span', 'font', 'small', 'section', 'article', 'header', 'footer', 'main'];

/**
 * Shift every heading so the shallowest becomes h2.
 *
 * The post title is the page's h1, so an article body must never contain one.
 * Demoting h1 to h2 alone would be wrong when the source used h1 for the title
 * *and* h2 for sections — both would land on h2 and the hierarchy would
 * flatten. Shifting by the offset of the shallowest heading present keeps the
 * structure the author actually wrote.
 *
 * The stylesheet only defines h2 and h3, so anything deeper clamps to h4 —
 * which renders as unstyled bold text rather than disappearing.
 */
export function normaliseHeadings(html: string): string {
  const levels = [...html.matchAll(/<h([1-6])[\s>]/gi)].map((m) => Number(m[1]));
  if (levels.length === 0) return html;

  const shallowest = Math.min(...levels);
  const shift = 2 - shallowest; // h1 present → +1; already starts at h2 → 0

  if (shift === 0) return html;

  // Two-step through a placeholder so a shifted h2 is not shifted again when
  // the pass reaches the original h2s.
  const shifted = html.replace(
    /<(\/?)h([1-6])([\s>])/gi,
    (_all, slash: string, level: string, tail: string) =>
      `<${slash}hX${Math.min(Math.max(Number(level) + shift, 2), 4)}${tail}`,
  );
  return shifted.replace(/<(\/?)hX([2-4])/g, '<$1h$2');
}

/** Pass one: runs on the raw paste, before the sanitiser sees it. */
export function prepareForSanitise(html: string): string {
  let out = html;

  // Source-app chrome. ChatGPT wraps code blocks in a header carrying a
  // language label and a "Copy code" button; Word and Docs leave comment
  // markers and conditional blocks behind.
  out = out.replace(/<button\b[^>]*>[\s\S]*?<\/button>/gi, '');
  out = out.replace(/<!--[\s\S]*?-->/g, '');
  out = out.replace(/<(script|style|noscript|svg|iframe)\b[\s\S]*?<\/\1>/gi, '');
  out = out.replace(/>\s*Copy code\s*</gi, '><');

  out = normaliseHeadings(out);

  // Presentational tags the stylesheet does not target, mapped to semantic
  // equivalents it does.
  out = out.replace(/<(\/?)b(\s[^>]*)?>/gi, '<$1strong$2>');
  out = out.replace(/<(\/?)i(\s[^>]*)?>/gi, '<$1em$2>');
  out = out.replace(/<(\/?)h([56])([\s>])/gi, '<$1h4$3');

  // Foreign presentation. Stripped here rather than after sanitising because
  // `class` is in the sanitiser's allow-list — it is needed for the wrappers
  // added in pass two, so blanket-removing it later would take those with it.
  out = out.replace(/\s(?:style|class|id|dir|lang|align|bgcolor|width|height)\s*=\s*"[^"]*"/gi, '');
  out = out.replace(/\s(?:style|class|id|dir|lang|align|bgcolor)\s*=\s*'[^']*'/gi, '');
  out = out.replace(/\sdata-[\w-]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, '');

  for (const tag of UNWRAP_TAGS) {
    out = out.replace(new RegExp(`</?${tag}(\\s[^>]*)?>`, 'gi'), '');
  }

  return out;
}

/** Pass two: runs on sanitiser output, which is well-formed. */
export function tidySanitised(html: string): string {
  let out = html;

  // A non-breaking space pasted from a word processor is invisible in the
  // editor and shows up as a stray gap on the published page.
  out = out.replace(/&nbsp;/g, ' ');

  // Empty wrappers left behind by unwrapping spans and stripping chrome.
  out = out.replace(/<p>(\s|<br\s*\/?>)*<\/p>/gi, '');
  out = out.replace(/<div>(\s|<br\s*\/?>)*<\/div>/gi, '');
  out = out.replace(/<(strong|em|u)>\s*<\/\1>/gi, '');

  // Word processors emit runs of <br> where a paragraph break was meant.
  out = out.replace(/(?:<br\s*\/?>\s*){2,}/gi, '</p><p>');

  // Wide tables need their own scroll container or they push the whole page
  // sideways on a phone. The stylesheet already targets .table-scroll; this
  // is what puts content inside it.
  //
  // Unwrap first, then wrap everything. Removing only the opening div would
  // leave its </div> behind, and re-saving a post would accumulate a stray
  // closing tag on every edit.
  out = out.replace(
    /<div class="table-scroll">\s*(<table[\s\S]*?<\/table>)\s*<\/div>/gi,
    '$1',
  );
  out = out.replace(/<table(\s[^>]*)?>/gi, '<div class="table-scroll"><table$1>');
  out = out.replace(/<\/table>/gi, '</table></div>');

  // Outbound links open in a new tab and must not leak the referrer or hand
  // the opened page a window reference.
  out = out.replace(
    /<a\s+href="(https?:\/\/[^"]+)"([^>]*)>/gi,
    (all, href: string, rest: string) =>
      /target=/i.test(rest) ? all : `<a href="${href}"${rest} target="_blank" rel="noopener noreferrer">`,
  );

  // Collapse the blank lines all of the above leaves behind.
  out = out.replace(/\n{3,}/g, '\n\n').trim();

  return out;
}

/**
 * Full pipeline for a caller that already has a sanitiser.
 *
 * `sanitise` is injected rather than imported so this module stays free of
 * DOMPurify — which drags in a DOM implementation and would make the unit
 * tests an integration test.
 */
export function normalisePastedHtml(raw: string, sanitise: (html: string) => string): string {
  return tidySanitised(sanitise(prepareForSanitise(raw)));
}
