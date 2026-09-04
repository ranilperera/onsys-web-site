import { describe, it, expect } from 'vitest';
import {
  normaliseHeadings,
  prepareForSanitise,
  tidySanitised,
  normalisePastedHtml,
} from '@onsys/shared';

/** Stands in for DOMPurify: the real one is exercised by the route. */
const passthrough = (h: string) => h;

describe('normaliseHeadings', () => {
  it('demotes an h1 so the article body never competes with the page title', () => {
    expect(normaliseHeadings('<h1>Title</h1>')).toBe('<h2>Title</h2>');
  });

  it('preserves hierarchy rather than flattening it', () => {
    // The bug this guards: demoting only h1 would land the title and the
    // section headings both on h2, losing a level the author wrote.
    const out = normaliseHeadings('<h1>Title</h1><h2>Section</h2><h3>Sub</h3>');
    expect(out).toBe('<h2>Title</h2><h3>Section</h3><h4>Sub</h4>');
  });

  it('leaves content that already starts at h2 alone', () => {
    const html = '<h2>Section</h2><h3>Sub</h3>';
    expect(normaliseHeadings(html)).toBe(html);
  });

  it('clamps deeper levels at h4 rather than emitting an unstyled h5', () => {
    expect(normaliseHeadings('<h1>A</h1><h4>D</h4>')).toBe('<h2>A</h2><h4>D</h4>');
  });

  it('shifts closing tags with their openers', () => {
    expect(normaliseHeadings('<h1 class="x">A</h1>')).toContain('</h2>');
  });

  it('does nothing when there are no headings', () => {
    expect(normaliseHeadings('<p>Just prose.</p>')).toBe('<p>Just prose.</p>');
  });
});

describe('prepareForSanitise', () => {
  it('strips the copy button and language label ChatGPT wraps code blocks in', () => {
    const pasted =
      '<div><div>sql</div><button class="flex">Copy code</button><pre><code>SELECT 1;</code></pre></div>';
    const out = prepareForSanitise(pasted);
    expect(out).not.toContain('button');
    expect(out).not.toContain('Copy code');
    expect(out).toContain('SELECT 1;');
  });

  it('removes foreign presentation attributes', () => {
    const out = prepareForSanitise(
      '<p style="color:#ff0000" class="prose-p" data-start="12" dir="ltr">Text</p>',
    );
    expect(out).toBe('<p>Text</p>');
  });

  it('unwraps span soup without losing the text inside it', () => {
    const out = prepareForSanitise('<p><span><span>Hello</span> world</span></p>');
    expect(out).toBe('<p>Hello world</p>');
  });

  it('maps presentational tags onto semantic ones the stylesheet targets', () => {
    expect(prepareForSanitise('<b>bold</b> and <i>italic</i>')).toBe(
      '<strong>bold</strong> and <em>italic</em>',
    );
  });

  it('clamps an h5 that the shift left alone', () => {
    // When the document already starts at h2 the shift is zero, so an h5
    // survives normaliseHeadings and this is what catches it. h5 has no style
    // rule, so left alone it renders as unstyled text.
    expect(prepareForSanitise('<h2>A</h2><h5>Deep</h5>')).toContain('<h4>Deep</h4>');
  });

  it('promotes a document whose only heading is deep', () => {
    // Shallowest becomes h2 regardless of where the author started, so a
    // fragment written entirely in h5 is not left looking like body text.
    expect(prepareForSanitise('<h5>Deep</h5>')).toContain('<h2>Deep</h2>');
  });

  it('drops script and style blocks entirely, content included', () => {
    const out = prepareForSanitise('<p>Keep</p><script>alert(1)</script><style>p{}</style>');
    expect(out).toBe('<p>Keep</p>');
  });
});

describe('tidySanitised', () => {
  it('wraps tables so a wide one scrolls instead of breaking the page', () => {
    const out = tidySanitised('<table><tr><td>1</td></tr></table>');
    expect(out).toBe('<div class="table-scroll"><table><tr><td>1</td></tr></table></div>');
  });

  it('does not double-wrap a table that is already wrapped', () => {
    const once = tidySanitised('<table><tr><td>1</td></tr></table>');
    expect(tidySanitised(once)).toBe(once);
  });

  it('removes empty paragraphs left by unwrapping', () => {
    expect(tidySanitised('<p></p><p>Real</p><p> </p><p><br></p>')).toBe('<p>Real</p>');
  });

  it('turns runs of line breaks into a paragraph break', () => {
    expect(tidySanitised('<p>One<br><br>Two</p>')).toBe('<p>One</p><p>Two</p>');
  });

  it('replaces the non-breaking spaces word processors leave behind', () => {
    expect(tidySanitised('<p>A&nbsp;B</p>')).toBe('<p>A B</p>');
  });

  it('makes outbound links safe to open', () => {
    const out = tidySanitised('<p><a href="https://example.com">x</a></p>');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it('leaves internal links alone', () => {
    const out = tidySanitised('<p><a href="/pricing-and-plans">Pricing</a></p>');
    expect(out).not.toContain('target=');
  });

  it('does not add a second target to a link that has one', () => {
    const out = tidySanitised('<a href="https://example.com" target="_self">x</a>');
    expect(out.match(/target=/g)).toHaveLength(1);
  });
});

describe('normalisePastedHtml', () => {
  it('turns a realistic ChatGPT paste into the site style', () => {
    const pasted = [
      '<h1 data-start="0">Enabling TDE on SQL Server</h1>',
      '<p class="prose-p" style="margin:0"><span>Transparent Data Encryption protects data</span>&nbsp;at rest.</p>',
      '<h2>Step 1: Create the master key</h2>',
      '<div class="code-header"><span>sql</span><button>Copy code</button></div>',
      '<pre><code class="language-sql">CREATE MASTER KEY;</code></pre>',
      '<p></p>',
      '<table class="w-full"><thead><tr><th>Version</th></tr></thead><tbody><tr><td>2019</td></tr></tbody></table>',
    ].join('');

    const out = normalisePastedHtml(pasted, passthrough);

    // Heading hierarchy preserved, shifted down one.
    expect(out).toContain('<h2>Enabling TDE on SQL Server</h2>');
    expect(out).toContain('<h3>Step 1: Create the master key</h3>');
    expect(out).not.toMatch(/<h1[\s>]/);

    // Foreign presentation gone.
    expect(out).not.toContain('style=');
    expect(out).not.toContain('prose-p');
    expect(out).not.toContain('data-start');
    expect(out).not.toContain('Copy code');
    expect(out).not.toContain('&nbsp;');

    // Structure kept.
    expect(out).toContain('CREATE MASTER KEY;');
    expect(out).toContain('<div class="table-scroll">');
    expect(out).not.toContain('<p></p>');
  });

  it('is idempotent — saving an already-normalised post changes nothing', () => {
    // Editors re-save constantly. A pipeline that shifted headings on every
    // save would walk an article down to h4 in three edits.
    const once = normalisePastedHtml('<h1>Title</h1><h2>Section</h2><p>Body</p>', passthrough);
    expect(normalisePastedHtml(once, passthrough)).toBe(once);
  });

  it('leaves hand-written site HTML untouched', () => {
    const authored = '<h2>Section</h2><p>Body with <strong>emphasis</strong>.</p>';
    expect(normalisePastedHtml(authored, passthrough)).toBe(authored);
  });
});
