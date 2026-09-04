'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { prepareForSanitise, tidySanitised } from '@onsys/shared';

/**
 * Article body editor.
 *
 * The workflow it serves is "draft it in ChatGPT, paste it here, save" — so
 * paste is the important interaction, not the toolbar. A raw paste into a
 * contenteditable brings the source app's entire stylesheet with it: inline
 * colours, framework classes, span soup and headings starting at h1. Left
 * alone that lands in the database and the published article stops matching
 * the rest of the blog.
 *
 * The paste handler runs the same normalisation the API runs on save, from
 * @onsys/shared, so what you see here is what gets stored. The server repeats
 * it because a client is never the place to enforce anything — but doing it
 * here too means the editor shows the real result immediately rather than
 * something that silently changes on save.
 *
 * The editing surface carries the `article-body` class, so it renders in the
 * published article's own styles. Editing looks like reading.
 */

interface ToolbarButton {
  label: string;
  title: string;
  run: () => void;
}

export function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [showSource, setShowSource] = useState(false);
  const [pasteNote, setPasteNote] = useState<string | null>(null);

  /**
   * Only write into the DOM when the incoming value differs from what is
   * already rendered. Assigning innerHTML on every keystroke would move the
   * caret to the start of the document on each character typed.
   */
  useEffect(() => {
    const el = ref.current;
    if (el && !showSource && el.innerHTML !== value) el.innerHTML = value;
  }, [value, showSource]);

  const emit = useCallback(() => {
    if (ref.current) onChange(ref.current.innerHTML);
  }, [onChange]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      const html = e.clipboardData.getData('text/html');

      // Plain text has nothing to clean; let the browser handle it so line
      // breaks behave the way the person typing expects.
      if (!html) return;

      e.preventDefault();

      // The sanitiser is server-side only (it needs a DOM implementation), so
      // the client runs the two structural passes and the API applies
      // DOMPurify plus the same passes again on save.
      const cleaned = tidySanitised(prepareForSanitise(html));

      // execCommand is deprecated but is still the only API that inserts HTML
      // at the caret while keeping the browser's native undo stack intact.
      // Losing undo in an editor is worse than using a deprecated call.
      document.execCommand('insertHTML', false, cleaned);

      const before = html.length;
      const after = cleaned.length;
      setPasteNote(
        `Pasted and cleaned — ${Math.max(0, Math.round((1 - after / before) * 100))}% of the source markup was formatting that has been stripped.`,
      );
      emit();
    },
    [emit],
  );

  const exec = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    ref.current?.focus();
    emit();
  };

  const buttons: ToolbarButton[] = [
    { label: 'H2', title: 'Section heading', run: () => exec('formatBlock', 'h2') },
    { label: 'H3', title: 'Sub-heading', run: () => exec('formatBlock', 'h3') },
    { label: 'P', title: 'Paragraph', run: () => exec('formatBlock', 'p') },
    { label: 'B', title: 'Bold', run: () => exec('bold') },
    { label: 'I', title: 'Italic', run: () => exec('italic') },
    { label: '• List', title: 'Bulleted list', run: () => exec('insertUnorderedList') },
    { label: '1. List', title: 'Numbered list', run: () => exec('insertOrderedList') },
    { label: 'Quote', title: 'Block quote', run: () => exec('formatBlock', 'blockquote') },
    {
      label: 'Code',
      title: 'Code block',
      run: () => exec('formatBlock', 'pre'),
    },
    {
      label: 'Link',
      title: 'Insert link',
      run: () => {
        const url = window.prompt('Link URL');
        if (url) exec('createLink', url);
      },
    },
    {
      label: 'Clear',
      title: 'Remove formatting from the selection',
      run: () => exec('removeFormat'),
    },
    {
      label: 'Tidy',
      title: 'Re-run the cleanup over the whole document',
      run: () => {
        if (!ref.current) return;
        const cleaned = tidySanitised(prepareForSanitise(ref.current.innerHTML));
        ref.current.innerHTML = cleaned;
        onChange(cleaned);
        setPasteNote('Document tidied.');
      },
    },
  ];

  return (
    <div className="rte">
      <div className="rte-toolbar" role="toolbar" aria-label="Formatting">
        {buttons.map((b) => (
          <button key={b.label} type="button" title={b.title} onClick={b.run}>
            {b.label}
          </button>
        ))}
        <button
          type="button"
          className={showSource ? 'active' : undefined}
          title="Edit the HTML directly"
          onClick={() => setShowSource((v) => !v)}
          style={{ marginLeft: 'auto' }}
        >
          {showSource ? 'Editor' : 'HTML'}
        </button>
      </div>

      {pasteNote && (
        <p className="rte-note" role="status">
          {pasteNote}
        </p>
      )}

      {showSource ? (
        <textarea
          className="rte-source"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
        />
      ) : (
        <div
          ref={ref}
          className="rte-surface article-body"
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onBlur={emit}
          onPaste={handlePaste}
          data-placeholder="Paste your article here, or start typing…"
        />
      )}

      <p className="rte-help">
        Paste straight from ChatGPT, Word or Google Docs — headings, lists, tables and code blocks
        are kept, and the source app&rsquo;s styling is removed. Headings are shifted so the article
        starts at H2, because the post title is the page&rsquo;s H1.
      </p>
    </div>
  );
}
