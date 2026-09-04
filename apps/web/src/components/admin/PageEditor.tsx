'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/admin';
import { RichTextEditor } from './RichTextEditor';
import {
  moveAt,
  nextBlockId,
  removeById,
  stripIds,
  updateById,
  withIds,
  type EditorBlock,
  type LooseBlock,
} from '@/lib/blockList';

/**
 * Blocks are a discriminated union in @onsys/shared, but this editor has to
 * hold half-edited values that do not satisfy it yet — a JSON textarea is
 * invalid on almost every keystroke. So the form keeps them loose and the API
 * schema is the thing that decides what is valid, which also means a block
 * type added to the union later needs no change here.
 */


interface Faq {
  question: string;
  answer: string;
}

interface PageForm {
  slug: string;
  title: string;
  heading: string;
  eyebrow: string;
  lede: string;
  status: string;
  blocks: EditorBlock[];
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  noindex: boolean;
  faqs: Faq[];
}

const EMPTY: PageForm = {
  slug: '',
  title: '',
  heading: '',
  eyebrow: '',
  lede: '',
  status: 'DRAFT',
  blocks: [],
  seoTitle: '',
  seoDescription: '',
  canonicalUrl: '',
  noindex: false,
  faqs: [],
};

/** Human labels for the block types the renderer knows about. */
const BLOCK_LABELS: Record<string, string> = {
  hero: 'Hero',
  quicklinks: 'Quick links',
  cardGrid: 'Card grid',
  checkList: 'Check list',
  steps: 'Steps',
  pricing: 'Pricing plans',
  productGrid: 'Product grid',
  logoGrid: 'Logo grid',
  faq: 'FAQ',
  stats: 'Stats',
  platformChips: 'Platform chips',
  richText: 'Rich text',
  ctaBand: 'Call-to-action band',
  contactForm: 'Contact form',
  healthCheckBooking: 'Health check booking',
  relatedService: 'Related service',
  emergencyCheckout: 'Emergency checkout',
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * One full-width field inside the site's form grid.
 *
 * `.form-row` is a two-column grid and `.form-field` is the cell that carries
 * the label and input styling — putting a label straight into the row lands it
 * in column one with its input in column two, which is not a form layout.
 */
function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="form-row">
      <div className="form-field full">{children}</div>
    </div>
  );
}

export function PageEditor({ pageId }: { pageId?: string }) {
  const [form, setForm] = useState<PageForm>(EMPTY);
  const [loading, setLoading] = useState(Boolean(pageId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  /** Blocks whose JSON is currently unparseable, keyed by block id. */
  const [badJson, setBadJson] = useState<Record<string, string>>({});

  /**
   * `cancelled` is what stops a late response from overwriting typed edits.
   *
   * React StrictMode mounts, unmounts and remounts in development, so this
   * effect runs twice and two requests are in flight at once. Without the
   * guard the first response populates the form and clears `loading` — the
   * editor becomes usable — and the *second* response then lands on top,
   * silently reverting whatever was typed in between. Saving afterwards
   * writes the server's own copy back, which looks exactly like a save that
   * did nothing. The cleanup runs before the second mount, so the first
   * response is discarded rather than applied.
   */
  useEffect(() => {
    if (!pageId) return;
    let cancelled = false;

    adminFetch<{ page: Record<string, unknown> & { faqs?: Faq[] } }>(`/pages/${pageId}`)
      .then(({ page }) => {
        if (cancelled) return;
        setForm({
          slug: (page.slug as string) ?? '',
          title: (page.title as string) ?? '',
          heading: (page.heading as string) ?? '',
          eyebrow: (page.eyebrow as string) ?? '',
          lede: (page.lede as string) ?? '',
          status: (page.status as string) ?? 'DRAFT',
          blocks: withIds(Array.isArray(page.blocks) ? (page.blocks as LooseBlock[]) : []),
          seoTitle: (page.seoTitle as string) ?? '',
          seoDescription: (page.seoDescription as string) ?? '',
          canonicalUrl: (page.canonicalUrl as string) ?? '',
          noindex: Boolean(page.noindex),
          faqs: (page.faqs ?? []).map((f) => ({ question: f.question, answer: f.answer })),
        });
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load that page.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pageId]);

  const set = useCallback(<K extends keyof PageForm>(key: K, value: PageForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }, []);

  const updateBlock = useCallback((id: string, next: LooseBlock) => {
    setForm((f) => ({
      ...f,
      blocks: updateById(f.blocks, id, next),
    }));
    setSaved(false);
  }, []);

  const moveBlock = useCallback((index: number, delta: number) => {
    setForm((f) => ({ ...f, blocks: moveAt(f.blocks, index, delta) }));
    setSaved(false);
  }, []);

  const removeBlock = useCallback((id: string) => {
    setForm((f) => ({ ...f, blocks: removeById(f.blocks, id) }));
    // Drop only this block's error. Clearing the whole map would hide a
    // genuine JSON error still sitting in another block.
    setBadJson(({ [id]: _removed, ...rest }) => rest);
    setSaved(false);
  }, []);

  const addRichText = useCallback(() => {
    setForm((f) => ({
      ...f,
      blocks: [...f.blocks, { id: nextBlockId(), block: { type: 'richText', html: '<p></p>' } }],
    }));
    setSaved(false);
  }, []);

  const jsonErrors = useMemo(() => Object.values(badJson).filter(Boolean), [badJson]);

  async function save() {
    if (jsonErrors.length > 0) {
      setError('Fix the invalid JSON above before saving.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        slug: form.slug,
        title: form.title,
        heading: form.heading,
        // The API takes null, not '', for the optional text fields — an empty
        // string is a value, and storing it makes an unset eyebrow render as a
        // blank line rather than being skipped.
        eyebrow: form.eyebrow.trim() || null,
        lede: form.lede.trim() || null,
        status: form.status,
        blocks: stripIds(form.blocks),
        seoTitle: form.seoTitle.trim() || null,
        seoDescription: form.seoDescription.trim() || null,
        canonicalUrl: form.canonicalUrl.trim() || null,
        noindex: form.noindex,
        faqs: form.faqs.filter((f) => f.question.trim() && f.answer.trim()),
      };

      const { page } = await adminFetch<{ page: { id: string } }>(
        pageId ? `/pages/${pageId}` : '/pages',
        { method: pageId ? 'PUT' : 'POST', body: JSON.stringify(payload) },
      );

      if (!pageId) {
        window.location.href = `/admin/pages/${page.id}`;
        return;
      }
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save that page.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading…</p>;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 style={{ fontSize: 26, marginBottom: 6 }}>
            {pageId ? 'Edit page' : 'New page'}
          </h1>
          {form.slug && (
            <a
              href={`/${form.slug}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 13, color: 'var(--gray)' }}
            >
              /{form.slug} ↗
            </a>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a className="btn btn-outline btn-sm" href="/admin/pages">
            Back
          </a>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="form-status error" role="alert">
          {error}
        </div>
      )}
      {saved && (
        <div className="form-status success" role="status">
          Saved. The public page updates within five minutes.
        </div>
      )}

      <section className="admin-card">
        <h2 className="admin-card-title">Page details</h2>

        <Row>
          <label htmlFor="title">Title</label>
          <input
            id="title"
            value={form.title}
            onChange={(e) => {
              const title = e.target.value;
              setForm((f) => ({
                ...f,
                title,
                // Only auto-fill the slug for a page that has no URL yet.
                // Rewriting it on an existing page would silently break every
                // inbound link to it.
                slug: pageId ? f.slug : slugify(title),
                heading: f.heading || title,
              }));
              setSaved(false);
            }}
          />
        </Row>

        <Row>
          <label htmlFor="slug">Slug</label>
          <input
            id="slug"
            value={form.slug}
            onChange={(e) => set('slug', e.target.value)}
            aria-describedby="slug-help"
          />
          <small id="slug-help" style={{ color: 'var(--gray)' }}>
            Lowercase letters, numbers and hyphens. Changing this on a live page breaks its
            existing links unless you add a redirect.
          </small>
        </Row>

        <Row>
          <label htmlFor="eyebrow">Eyebrow</label>
          <input id="eyebrow" value={form.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} />
        </Row>

        <Row>
          <label htmlFor="heading">Heading (H1)</label>
          <input id="heading" value={form.heading} onChange={(e) => set('heading', e.target.value)} />
        </Row>

        <Row>
          <label htmlFor="lede">Lede</label>
          <textarea id="lede" rows={3} value={form.lede} onChange={(e) => set('lede', e.target.value)} />
        </Row>

        <Row>
          <label htmlFor="status">Status</label>
          <select id="status" value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </Row>
      </section>

      <section className="admin-card">
        <h2 className="admin-card-title">Content blocks</h2>
        <p style={{ color: 'var(--gray)', fontSize: 13, marginTop: 0 }}>
          Rich text sections are edited directly. Other block types are structured layouts — their
          fields are shown as JSON, and the server rejects anything that does not match the block
          schema, so a bad edit cannot reach the site.
        </p>

        {form.blocks.length === 0 && (
          <p style={{ color: 'var(--gray)' }}>No blocks yet. Add a rich text section below.</p>
        )}

        {form.blocks.map(({ id, block }, index) => (
          // Keyed by the block's own id, never the index: on a removal React
          // must unmount this row, not hand its state to the next block along.
          <div key={id} className="block-editor">
            <div className="block-editor-head">
              <strong>
                {BLOCK_LABELS[block.type] ?? block.type}
                {typeof block.heading === 'string' && block.heading ? ` — ${block.heading}` : ''}
              </strong>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => moveBlock(index, -1)}
                  disabled={index === 0}
                  aria-label="Move block up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => moveBlock(index, 1)}
                  disabled={index === form.blocks.length - 1}
                  aria-label="Move block down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    if (window.confirm('Remove this block from the page?')) removeBlock(id);
                  }}
                >
                  Remove
                </button>
              </div>
            </div>

            {block.type === 'richText' ? (
              <>
                <Row>
                  <label htmlFor={`block-heading-${id}`}>Section heading (optional)</label>
                  <input
                    id={`block-heading-${id}`}
                    value={(block.heading as string) ?? ''}
                    onChange={(e) => {
                      const next = { ...block };
                      if (e.target.value) next.heading = e.target.value;
                      else delete next.heading;
                      updateBlock(id, next);
                    }}
                  />
                </Row>
                <RichTextEditor
                  value={(block.html as string) ?? ''}
                  onChange={(html) => updateBlock(id, { ...block, html })}
                />
              </>
            ) : (
              <BlockJsonEditor
                block={block}
                error={badJson[id]}
                onChange={(next, err) => {
                  setBadJson((b) => ({ ...b, [id]: err ?? '' }));
                  if (next) updateBlock(id, next);
                }}
              />
            )}
          </div>
        ))}

        <button type="button" className="btn btn-outline btn-sm" onClick={addRichText}>
          Add rich text section
        </button>
      </section>

      <section className="admin-card">
        <h2 className="admin-card-title">FAQs</h2>
        <p style={{ color: 'var(--gray)', fontSize: 13, marginTop: 0 }}>
          These render on the page and feed its FAQPage structured data.
        </p>

        {form.faqs.map((faq, i) => (
          <div key={i} className="block-editor">
            <Row>
              <label htmlFor={`faq-q-${i}`}>Question</label>
              <input
                id={`faq-q-${i}`}
                value={faq.question}
                onChange={(e) =>
                  set(
                    'faqs',
                    form.faqs.map((f, j) => (j === i ? { ...f, question: e.target.value } : f)),
                  )
                }
              />
            </Row>
            <Row>
              <label htmlFor={`faq-a-${i}`}>Answer</label>
              <textarea
                id={`faq-a-${i}`}
                rows={3}
                value={faq.answer}
                onChange={(e) =>
                  set(
                    'faqs',
                    form.faqs.map((f, j) => (j === i ? { ...f, answer: e.target.value } : f)),
                  )
                }
              />
            </Row>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => set('faqs', form.faqs.filter((_, j) => j !== i))}
            >
              Remove FAQ
            </button>
          </div>
        ))}

        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => set('faqs', [...form.faqs, { question: '', answer: '' }])}
        >
          Add FAQ
        </button>
      </section>

      <section className="admin-card">
        <h2 className="admin-card-title">Search engines</h2>

        <Row>
          <label htmlFor="seoTitle">SEO title</label>
          <input
            id="seoTitle"
            value={form.seoTitle}
            onChange={(e) => set('seoTitle', e.target.value)}
            aria-describedby="seoTitle-help"
          />
          <small id="seoTitle-help" style={{ color: 'var(--gray)' }}>
            {form.seoTitle.length}/60 characters used — Google truncates around 60.
          </small>
        </Row>

        <Row>
          <label htmlFor="seoDescription">Meta description</label>
          <textarea
            id="seoDescription"
            rows={3}
            value={form.seoDescription}
            onChange={(e) => set('seoDescription', e.target.value)}
            aria-describedby="seoDescription-help"
          />
          <small id="seoDescription-help" style={{ color: 'var(--gray)' }}>
            {form.seoDescription.length}/160 characters used.
          </small>
        </Row>

        <Row>
          <label htmlFor="canonicalUrl">Canonical URL</label>
          <input
            id="canonicalUrl"
            value={form.canonicalUrl}
            onChange={(e) => set('canonicalUrl', e.target.value)}
          />
        </Row>

        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
          <input
            type="checkbox"
            checked={form.noindex}
            onChange={(e) => set('noindex', e.target.checked)}
          />
          Hide this page from search engines (noindex)
        </label>
      </section>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <a className="btn btn-outline" href="/admin/pages">
          Cancel
        </a>
      </div>
    </>
  );
}

/**
 * JSON editor for the structured block types.
 *
 * Kept as its own component with local text state so that typing inside a
 * half-written object does not push unparseable values into the page form —
 * the parsed block is only handed up once it is valid JSON again.
 */
function BlockJsonEditor({
  block,
  error,
  onChange,
}: {
  block: LooseBlock;
  error?: string;
  onChange: (next: LooseBlock | null, error: string | null) => void;
}) {
  const [text, setText] = useState(() => JSON.stringify(block, null, 2));

  return (
    <Row>
      <textarea
        rows={12}
        spellCheck={false}
        value={text}
        aria-label={`${block.type} block JSON`}
        style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5 }}
        onChange={(e) => {
          const value = e.target.value;
          setText(value);
          try {
            const parsed = JSON.parse(value) as LooseBlock;
            if (!parsed || typeof parsed !== 'object' || typeof parsed.type !== 'string') {
              onChange(null, 'A block must be an object with a "type".');
              return;
            }
            onChange(parsed, null);
          } catch {
            onChange(null, 'Invalid JSON.');
          }
        }}
      />
      {error && (
        <small style={{ color: '#A4262C' }} role="alert">
          {error}
        </small>
      )}
    </Row>
  );
}
