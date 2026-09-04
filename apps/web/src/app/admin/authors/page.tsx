'use client';

import { useCallback, useEffect, useState } from 'react';
import { siteConfig } from '@/lib/config';

interface AuthorRow {
  id: string;
  slug: string;
  name: string;
  role: string | null;
  linkedIn: string | null;
  photo: string | null;
  _count: { posts: number };
}

/** Reads the CSRF cookie set at login so mutations pass the double-submit check. */
function csrfToken(): string {
  return document.cookie.match(/(?:^|;\s*)onsys_csrf=([^;]+)/)?.[1] ?? '';
}

export default function AuthorsPage() {
  const [authors, setAuthors] = useState<AuthorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`${siteConfig.apiUrl}/api/admin/authors`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 401) {
          window.location.href = `/admin/login?next=${encodeURIComponent(window.location.pathname)}`;
          return null;
        }
        return r.json();
      })
      .then((d) => d && setAuthors(d.authors ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function remove(author: AuthorRow) {
    if (
      !window.confirm(
        `Delete ${author.name}? Their profile page at /about/${author.slug} will stop existing.`,
      )
    ) {
      return;
    }

    setBusy(author.id);
    setError(null);
    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/admin/authors/${author.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'x-csrf-token': csrfToken() },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Could not delete that author.');
        return;
      }
      setAuthors((rows) => rows.filter((r) => r.id !== author.id));
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p>Loading…</p>;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 style={{ fontSize: 26, marginBottom: 6 }}>Authors</h1>
          <p style={{ color: 'var(--gray)', fontSize: 14, margin: 0 }}>
            Each author has a profile page and a Person entry in the schema of every article they
            byline.
          </p>
        </div>
        <a className="btn btn-primary btn-sm" href="/admin/authors/new">
          New author
        </a>
      </div>

      {error && (
        <div className="form-status error" role="alert">
          {error}
        </div>
      )}

      {authors.length === 0 ? (
        <p style={{ color: 'var(--gray)' }}>
          No authors yet. <a href="/admin/authors/new">Add one</a> — articles currently byline the
          organisation, which resolves to no entity a search engine can attribute expertise to.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Posts</th>
                <th>Verified by</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {authors.map((a) => (
                <tr key={a.id}>
                  <td>
                    <a href={`/admin/authors/${a.id}`} style={{ fontWeight: 600 }}>
                      {a.name}
                    </a>
                    <br />
                    <a
                      href={`/about/${a.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 12, color: 'var(--gray)' }}
                    >
                      /about/{a.slug} ↗
                    </a>
                  </td>
                  <td>{a.role ?? <span style={{ color: 'var(--gray)' }}>— not set</span>}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{a._count.posts}</td>
                  <td>
                    {a.linkedIn ? (
                      <a href={a.linkedIn} target="_blank" rel="noreferrer">
                        LinkedIn ↗
                      </a>
                    ) : (
                      // Worth flagging rather than leaving blank: an author with
                      // no sameAs is a name nothing corroborates, which is the
                      // one thing this feature exists to provide.
                      <span style={{ color: '#A4262C', fontSize: 12.5 }}>No sameAs link</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <a className="btn btn-outline btn-sm" href={`/admin/authors/${a.id}`}>
                      Edit
                    </a>{' '}
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={busy === a.id || a._count.posts > 0}
                      title={
                        a._count.posts > 0
                          ? 'Reassign this author’s posts before deleting'
                          : 'Delete this author'
                      }
                      onClick={() => void remove(a)}
                    >
                      {busy === a.id ? '…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
