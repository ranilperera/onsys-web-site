'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { siteConfig } from '@/lib/config';

interface AuthorForm {
  slug: string;
  name: string;
  role: string;
  bio: string;
  photo: string;
  credentials: string;
  linkedIn: string;
  website: string;
}

const EMPTY: AuthorForm = {
  slug: '',
  name: '',
  role: '',
  bio: '',
  photo: '',
  credentials: '',
  linkedIn: '',
  website: '',
};

/** Reads the CSRF cookie set at login so mutations pass the double-submit check. */
function csrfToken(): string {
  return document.cookie.match(/(?:^|;\s*)onsys_csrf=([^;]+)/)?.[1] ?? '';
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200);
}

export function AuthorEditor({ authorId }: { authorId?: string }) {
  const [form, setForm] = useState<AuthorForm>(EMPTY);
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(Boolean(authorId));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  /** The slug is a live URL once saved, so it stops tracking the name. */
  const [slugLocked, setSlugLocked] = useState(Boolean(authorId));

  const set = <K extends keyof AuthorForm>(k: K, v: AuthorForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

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
    if (!authorId) return;
    let cancelled = false;

    fetch(`${siteConfig.apiUrl}/api/admin/authors/${authorId}`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 401) {
          window.location.href = `/admin/login?next=${encodeURIComponent(window.location.pathname)}`;
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (cancelled || !d?.author) return;
        const a = d.author;
        setPostCount(a._count?.posts ?? 0);
        setForm({
          slug: a.slug ?? '',
          name: a.name ?? '',
          role: a.role ?? '',
          bio: a.bio ?? '',
          photo: a.photo ?? '',
          // One per line is far easier to edit than a comma-separated string
          // when the values themselves contain commas, which certifications do.
          credentials: (a.credentials ?? []).join('\n'),
          linkedIn: a.linkedIn ?? '',
          website: a.website ?? '',
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authorId]);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setStatus(null);

    const payload = {
      ...form,
      slug: form.slug || slugify(form.name),
      credentials: form.credentials
        .split('\n')
        .map((c) => c.trim())
        .filter(Boolean),
    };

    try {
      const res = await fetch(
        `${siteConfig.apiUrl}/api/admin/authors${authorId ? `/${authorId}` : ''}`,
        {
          method: authorId ? 'PUT' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();

      if (!res.ok) {
        setStatus({ ok: false, text: data.error ?? 'Could not save. Check the fields above.' });
        return;
      }

      setStatus({
        ok: true,
        text: authorId
          ? `Saved.${postCount > 0 ? ` The byline on ${postCount} post(s) was updated to match.` : ''}`
          : 'Author created. Redirecting…',
      });
      if (!authorId && data.author?.id) {
        window.location.href = `/admin/authors/${data.author.id}`;
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
          <h1 style={{ fontSize: 26, marginBottom: 6 }}>{authorId ? 'Edit author' : 'New author'}</h1>
          <p style={{ color: 'var(--gray)', fontSize: 14, margin: 0 }}>
            Drives the byline, the profile page and the Person schema on every article.
          </p>
        </div>
        <div className="purge-control">
          {authorId && form.slug && (
            <a
              className="btn btn-outline btn-sm"
              href={`/about/${form.slug}`}
              target="_blank"
              rel="noreferrer"
            >
              View profile
            </a>
          )}
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? 'Saving…' : authorId ? 'Save changes' : 'Create author'}
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
          <div className="form-field">
            <label htmlFor="a-name">Name *</label>
            <input
              id="a-name"
              required
              maxLength={120}
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((f) => ({ ...f, name, slug: slugLocked ? f.slug : slugify(name) }));
              }}
              placeholder="Ranil Perera"
            />
            <small style={{ color: 'var(--gray)', fontSize: 12 }}>
              Use the full name as it appears on the linked LinkedIn profile — a search engine
              corroborates the two against each other.
            </small>
          </div>
          <div className="form-field">
            <label htmlFor="a-slug">Slug *</label>
            <input
              id="a-slug"
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
              /about/{form.slug || 'name'}
              {authorId && ' — changing this breaks the profile URL already in every article.'}
            </small>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="a-role">Job title</label>
            <input
              id="a-role"
              maxLength={160}
              value={form.role}
              onChange={(e) => set('role', e.target.value)}
              placeholder="Principal DBA"
            />
          </div>
          <div className="form-field">
            <label htmlFor="a-photo">Photo path</label>
            <input
              id="a-photo"
              maxLength={500}
              value={form.photo}
              onChange={(e) => set('photo', e.target.value)}
              placeholder="/images/authors/name.jpg"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field full">
            <label htmlFor="a-bio">Bio</label>
            <textarea
              id="a-bio"
              rows={4}
              maxLength={4000}
              value={form.bio}
              onChange={(e) => set('bio', e.target.value)}
              placeholder="A short paragraph describing what this person actually does."
            />
            <small style={{ color: 'var(--gray)', fontSize: 12 }}>
              Appears under every article with this byline, and on the profile page. Keep it factual
              — it is a public claim about a real person.
            </small>
          </div>
        </div>
      </section>

      <section className="admin-card">
        <h2>Verification</h2>
        <p style={{ fontSize: 13.5, color: 'var(--gray)', marginTop: -6 }}>
          These become <code>sameAs</code> on the Person node. Without at least one, the author is a
          name a crawler cannot corroborate against anything — which is most of the reason to have
          named authors at all.
        </p>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="a-linkedin">LinkedIn URL</label>
            <input
              id="a-linkedin"
              type="url"
              maxLength={500}
              value={form.linkedIn}
              onChange={(e) => set('linkedIn', e.target.value)}
              placeholder="https://www.linkedin.com/in/…"
            />
          </div>
          <div className="form-field">
            <label htmlFor="a-website">Personal website</label>
            <input
              id="a-website"
              type="url"
              maxLength={500}
              value={form.website}
              onChange={(e) => set('website', e.target.value)}
              placeholder="https://…"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field full">
            <label htmlFor="a-credentials">Certifications — one per line</label>
            <textarea
              id="a-credentials"
              rows={4}
              value={form.credentials}
              onChange={(e) => set('credentials', e.target.value)}
              placeholder={'Microsoft Certified: Azure Database Administrator Associate\nOracle Certified Professional'}
            />
            <small style={{ color: 'var(--gray)', fontSize: 12 }}>
              Rendered as chips on the profile and emitted as <code>hasCredential</code>. A stronger
              expertise signal than the bio prose.
            </small>
          </div>
        </div>
      </section>

      <div style={{ display: 'flex', gap: 12, marginBottom: 40 }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : authorId ? 'Save changes' : 'Create author'}
        </button>
        <a className="btn btn-outline" href="/admin/authors">
          Back to authors
        </a>
      </div>
    </form>
  );
}
