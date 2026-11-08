'use client';

import { useEffect, useState } from 'react';
import { siteConfig } from '@/lib/config';

interface PostRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  updatedAt: string;
  category: { name: string } | null;
}

/** Reads the CSRF cookie set at login so mutations pass the double-submit check. */
function csrfToken(): string {
  return document.cookie.match(/(?:^|;\s*)onsys_csrf=([^;]+)/)?.[1] ?? '';
}

const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  PUBLISHED: { bg: '#E7F5EC', fg: '#0B5B36' },
  DRAFT: { bg: '#FFF4CE', fg: '#6B5900' },
  ARCHIVED: { bg: 'var(--surface-gray)', fg: 'var(--gray)' },
};

export default function PostsPage() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Applied optimistically, then rolled back if the request fails.
   *
   * A dropdown that snaps back to its old value on error tells the truth; one
   * that waits for a round trip before moving feels broken on a slow link, and
   * one that never reverts quietly lies about what is published.
   */
  async function changeStatus(post: PostRow, status: string) {
    const previous = post.status;
    setSaving(post.id);
    setError(null);
    setPosts((rows) => rows.map((r) => (r.id === post.id ? { ...r, status } : r)));

    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/admin/posts/${post.id}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Could not change that status.');
        setPosts((rows) => rows.map((r) => (r.id === post.id ? { ...r, status: previous } : r)));
        return;
      }

      const { post: updated } = await res.json();
      setPosts((rows) =>
        rows.map((r) => (r.id === post.id ? { ...r, status, updatedAt: updated.updatedAt } : r)),
      );
    } catch {
      setError('Could not reach the server.');
      setPosts((rows) => rows.map((r) => (r.id === post.id ? { ...r, status: previous } : r)));
    } finally {
      setSaving(null);
    }
  }

  useEffect(() => {
    fetch(`${siteConfig.apiUrl}/api/admin/posts`, { credentials: 'include' })
      .then((r) => (r.status === 401 ? (window.location.href = '/admin/login', null) : r.json()))
      .then((d) => d && setPosts(d.posts))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading…</p>;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 style={{ fontSize: 26, marginBottom: 6 }}>Posts</h1>
          <p style={{ color: 'var(--gray)', fontSize: 14, margin: 0 }}>
            Imported WordPress content lands here as <strong>DRAFT</strong>. Review, then publish.
          </p>
        </div>
        <a className="btn btn-primary btn-sm" href="/admin/posts/new">
          New post
        </a>
      </div>
      {error && (
        <div className="form-status error" role="alert">
          {error}
        </div>
      )}

      {posts.length === 0 ? (
        <p style={{ color: 'var(--gray)' }}>
          No posts yet. <a href="/admin/posts/new">Write one</a>, or import the WordPress archive
          with <code>npm run import:wp -- --source=https://www.onsys.com.au</code>
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--gray-light)' }}>
                <th style={{ padding: 10 }}>Title</th>
                <th style={{ padding: 10 }}>Category</th>
                <th style={{ padding: 10 }}>Status</th>
                <th style={{ padding: 10 }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--gray-light)' }}>
                  <td style={{ padding: 10 }}>
                    {/* The title edits the post; the slug previews it. A list
                        whose only link is the public page cannot be worked
                        from. */}
                    <a href={`/admin/posts/${p.id}`} style={{ fontWeight: 600 }}>
                      {p.title}
                    </a>
                    <br />
                    <a
                      href={`/blog/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 12, color: 'var(--gray)' }}
                    >
                      /blog/{p.slug} ↗
                    </a>
                  </td>
                  <td style={{ padding: 10 }}>{p.category?.name ?? '—'}</td>
                  <td style={{ padding: 10 }}>
                    <label htmlFor={`status-${p.id}`} className="sr-only">
                      Status for {p.title}
                    </label>
                    <select
                      id={`status-${p.id}`}
                      className="status-select"
                      value={p.status}
                      disabled={saving === p.id}
                      onChange={(e) => void changeStatus(p, e.target.value)}
                      style={{
                        background: (STATUS_STYLE[p.status] ?? STATUS_STYLE.ARCHIVED).bg,
                        color: (STATUS_STYLE[p.status] ?? STATUS_STYLE.ARCHIVED).fg,
                      }}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0) + s.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: 10 }}>{new Date(p.updatedAt).toLocaleDateString('en-AU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
