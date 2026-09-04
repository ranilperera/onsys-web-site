'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { siteConfig } from '@/lib/config';
import { RichTextEditor } from './RichTextEditor';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Author {
  id: string;
  slug: string;
  name: string;
  role: string | null;
}

interface PostForm {
  slug: string;
  title: string;
  excerpt: string;
  bodyHtml: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  categoryId: string;
  authorId: string;
  readMinutes: number;
  coverImage: string;
  seoTitle: string;
  seoDescription: string;
  noindex: boolean;
}

const EMPTY: PostForm = {
  slug: '',
  title: '',
  excerpt: '',
  bodyHtml: '',
  status: 'DRAFT',
  categoryId: '',
  authorId: '',
  readMinutes: 5,
  coverImage: '',
  seoTitle: '',
  seoDescription: '',
  noindex: false,
};

/** Reads the CSRF cookie set at login so mutations pass the double-submit check. */
function csrfToken(): string {
  return document.cookie.match(/(?:^|;\s*)onsys_csrf=([^;]+)/)?.[1] ?? '';
}

/** Slug from a title: lowercase, hyphenated, ASCII only — matches the API regex. */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200);
}

/** ~200 words a minute, which is the usual reading-time convention. */
function estimateReadMinutes(html: string): number {
  const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function PostEditor({ postId }: { postId?: string }) {
  const [form, setForm] = useState<PostForm>(EMPTY);
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(Boolean(postId));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  /**
   * Whether the slug still tracks the title.
   *
   * A published slug is a URL other people link to, so it must never change
   * silently because someone reworded a headline. Auto-fill applies while the
   * post is new and untouched, and stops the moment either happens.
   */
  const [slugLocked, setSlugLocked] = useState(Boolean(postId));

  const set = <K extends keyof PostForm>(key: K, v: PostForm[K]) =>
    setForm((f) => ({ ...f, [key]: v }));

  useEffect(() => {
    fetch(`${siteConfig.apiUrl}/api/content/categories`)
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => setCategories([]));

    fetch(`${siteConfig.apiUrl}/api/admin/authors`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const list: Author[] = d?.authors ?? [];
        setAuthors(list);
        // One author is the common case; pre-select it so a new post cannot be
        // published with no byline just because nobody touched the dropdown.
        if (list.length === 1) setForm((f) => (f.authorId ? f : { ...f, authorId: list[0].id }));
      })
      .catch(() => setAuthors([]));
  }, []);

  /**
   * `cancelled` stops a late response from overwriting typed edits.
   *
   * StrictMode mounts, unmounts and remounts in development, so this effect
   * runs twice with two requests in flight. Without the guard the first
   * response clears `loading` and makes the form usable, and the second lands
   * on top and reverts whatever was typed in between — a save afterwards then
   * writes the server's own copy back and looks like it did nothing.
   */
  useEffect(() => {
    if (!postId) return;
    let cancelled = false;

    fetch(`${siteConfig.apiUrl}/api/admin/posts/${postId}`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 401) {
          const next = encodeURIComponent(window.location.pathname);
          window.location.href = `/admin/login?next=${next}`;
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (cancelled || !d?.post) return;
        const p = d.post;
        setForm({
          slug: p.slug ?? '',
          title: p.title ?? '',
          excerpt: p.excerpt ?? '',
          bodyHtml: p.bodyHtml ?? '',
          status: p.status ?? 'DRAFT',
          categoryId: p.categoryId ?? '',
          authorId: p.authorId ?? '',
          readMinutes: p.readMinutes ?? 5,
          coverImage: p.coverImage ?? '',
          seoTitle: p.seoTitle ?? '',
          seoDescription: p.seoDescription ?? '',
          noindex: Boolean(p.noindex),
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [postId]);

  const onBody = useCallback((html: string) => {
    setForm((f) => ({ ...f, bodyHtml: html, readMinutes: estimateReadMinutes(html) }));
  }, []);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setStatus(null);

    const payload = {
      ...form,
      slug: form.slug || slugify(form.title),
      categoryId: form.categoryId || null,
      authorId: form.authorId || null,
      // Derived server-side from authorId. Sending a blank string here is what
      // wiped the byline on the first post written in this editor.
      authorName: authors.find((a) => a.id === form.authorId)?.name || undefined,
      excerpt: form.excerpt || null,
      coverImage: form.coverImage || null,
      seoTitle: form.seoTitle || null,
      seoDescription: form.seoDescription || null,
      // Sending both would make the API prefer markdown and discard the body
      // that was just edited.
      bodyMarkdown: null,
      faqs: [],
    };

    try {
      const res = await fetch(
        `${siteConfig.apiUrl}/api/admin/posts${postId ? `/${postId}` : ''}`,
        {
          method: postId ? 'PUT' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();

      if (!res.ok) {
        setStatus({
          ok: false,
          text: data.error ?? data.message ?? 'Could not save. Check the required fields.',
        });
        return;
      }

      // The API normalises on save, so the stored body can differ from what
      // was submitted. Showing the returned version means the editor never
      // disagrees with the published article.
      if (data.post?.bodyHtml) setForm((f) => ({ ...f, bodyHtml: data.post.bodyHtml }));

      setStatus({ ok: true, text: postId ? 'Saved.' : 'Created. Redirecting…' });
      if (!postId && data.post?.id) {
        window.location.href = `/admin/posts/${data.post.id}`;
      }
    } catch {
      setStatus({ ok: false, text: 'Could not reach the server.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading…</p>;

  return (
    <form onSubmit={save}>
      <div className="admin-head">
        <div>
          <h1 style={{ fontSize: 26, marginBottom: 6 }}>{postId ? 'Edit post' : 'New post'}</h1>
          <p style={{ color: 'var(--gray)', fontSize: 14, margin: 0 }}>
            Paste from ChatGPT and it will be cleaned to match the blog&rsquo;s own styling.
          </p>
        </div>
        <div className="purge-control">
          {form.slug && (
            <a className="btn btn-outline btn-sm" href={`/blog/${form.slug}`} target="_blank" rel="noreferrer">
              Preview
            </a>
          )}
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? 'Saving…' : postId ? 'Save changes' : 'Create post'}
          </button>
        </div>
      </div>

      {status && (
        <div className={`form-status ${status.ok ? 'success' : 'error'}`} role="alert">
          {status.text}
        </div>
      )}

      <section className="admin-card">
        <div className="form-row">
          <div className="form-field full">
            <label htmlFor="p-title">Title *</label>
            <input
              id="p-title"
              required
              maxLength={300}
              value={form.title}
              onChange={(e) => {
                const title = e.target.value;
                setForm((f) => ({
                  ...f,
                  title,
                  slug: slugLocked ? f.slug : slugify(title),
                }));
              }}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="p-slug">Slug *</label>
            <input
              id="p-slug"
              required
              pattern="[a-z0-9-]+"
              maxLength={200}
              value={form.slug}
              onChange={(e) => {
                setSlugLocked(true);
                set('slug', e.target.value);
              }}
            />
            <small style={{ color: 'var(--gray)', fontSize: 12 }}>
              /blog/{form.slug || 'your-post'}
              {postId && ' — changing this breaks existing links unless you add a redirect.'}
            </small>
          </div>
          <div className="form-field">
            <label htmlFor="p-author">Author</label>
            <select
              id="p-author"
              value={form.authorId}
              onChange={(e) => set('authorId', e.target.value)}
            >
              <option value="">Onsys Technologies (no named author)</option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.role ? ` — ${a.role}` : ''}
                </option>
              ))}
            </select>
            <small style={{ color: 'var(--gray)', fontSize: 12 }}>
              Drives the byline and the Person schema. A named author is what search engines can
              attribute expertise to.
            </small>
          </div>
          <div className="form-field">
            <label htmlFor="p-category">Category</label>
            <select
              id="p-category"
              value={form.categoryId}
              onChange={(e) => set('categoryId', e.target.value)}
            >
              <option value="">Uncategorised</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field full">
            <label htmlFor="p-excerpt">Excerpt</label>
            <textarea
              id="p-excerpt"
              rows={2}
              maxLength={1000}
              value={form.excerpt}
              onChange={(e) => set('excerpt', e.target.value)}
              placeholder="A one or two sentence summary of the article."
            />
            <small style={{ color: 'var(--gray)', fontSize: 12 }}>
              This is the summary on the blog listing card and the fallback meta description — a
              sentence about the article, not the author&rsquo;s name.
            </small>
          </div>
        </div>
      </section>

      <section className="admin-card">
        <h2>Article body</h2>
        <RichTextEditor value={form.bodyHtml} onChange={onBody} />
        <p style={{ fontSize: 12.5, color: 'var(--gray)', margin: '10px 0 0' }}>
          Estimated reading time: <strong>{form.readMinutes} min</strong> (calculated from the body).
        </p>
      </section>

      <section className="admin-card">
        <h2>Publishing</h2>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="p-status">Status</label>
            <select
              id="p-status"
              value={form.status}
              onChange={(e) => set('status', e.target.value as PostForm['status'])}
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="p-cover">Cover image path</label>
            <input
              id="p-cover"
              maxLength={500}
              value={form.coverImage}
              onChange={(e) => set('coverImage', e.target.value)}
              placeholder="/images/hero-article.jpg"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="p-seotitle">SEO title</label>
            <input
              id="p-seotitle"
              maxLength={200}
              value={form.seoTitle}
              onChange={(e) => set('seoTitle', e.target.value)}
              placeholder={form.title}
            />
            <small style={{ color: (form.seoTitle || form.title).length > 60 ? '#A4262C' : 'var(--gray)', fontSize: 12 }}>
              {(form.seoTitle || form.title).length} characters — keep under 60
            </small>
          </div>
          <div className="form-field">
            <label htmlFor="p-seodesc">SEO description</label>
            <input
              id="p-seodesc"
              maxLength={500}
              value={form.seoDescription}
              onChange={(e) => set('seoDescription', e.target.value)}
            />
            <small
              style={{
                color:
                  form.seoDescription.length > 0 &&
                  (form.seoDescription.length < 150 || form.seoDescription.length > 158)
                    ? '#A4262C'
                    : 'var(--gray)',
                fontSize: 12,
              }}
            >
              {form.seoDescription.length} characters — aim for 150&ndash;158
            </small>
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginTop: 8 }}>
          <input
            type="checkbox"
            checked={form.noindex}
            onChange={(e) => set('noindex', e.target.checked)}
          />
          Hide from search engines (noindex)
        </label>
      </section>

      <div style={{ display: 'flex', gap: 12, marginBottom: 40 }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : postId ? 'Save changes' : 'Create post'}
        </button>
        <a className="btn btn-outline" href="/admin/posts">
          Back to posts
        </a>
      </div>
    </form>
  );
}
