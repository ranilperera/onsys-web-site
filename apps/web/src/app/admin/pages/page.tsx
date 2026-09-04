'use client';

import { useEffect, useState } from 'react';
import { adminFetch, AdminRequestError } from '@/lib/admin';

interface PageRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  updatedAt: string;
  navOrder: number | null;
}

const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  PUBLISHED: { bg: '#E7F5EC', fg: '#0B5B36' },
  DRAFT: { bg: '#FFF4CE', fg: '#6B5900' },
  ARCHIVED: { bg: '#F3F2F1', fg: '#605E5C' },
};

export default function AdminPagesPage() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    adminFetch<{ pages: PageRow[] }>('/pages')
      .then((d) => setPages(d.pages))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load pages.'))
      .finally(() => setLoading(false));
  }, []);

  /**
   * Applied optimistically, then rolled back if the request fails — the same
   * rule the posts list uses. Unpublishing a page is the one action here with
   * an immediate public consequence, so the control must never show a state
   * the server did not accept.
   */
  async function changeStatus(page: PageRow, status: string) {
    const previous = page.status;
    setSaving(page.id);
    setError(null);
    setPages((rows) => rows.map((r) => (r.id === page.id ? { ...r, status } : r)));

    try {
      const { page: updated } = await adminFetch<{ page: { updatedAt: string } }>(
        `/pages/${page.id}/status`,
        { method: 'PATCH', body: JSON.stringify({ status }) },
      );
      setPages((rows) =>
        rows.map((r) => (r.id === page.id ? { ...r, status, updatedAt: updated.updatedAt } : r)),
      );
    } catch (e) {
      setError(
        e instanceof AdminRequestError ? e.message : 'Could not reach the server.',
      );
      setPages((rows) => rows.map((r) => (r.id === page.id ? { ...r, status: previous } : r)));
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <p>Loading…</p>;

  const needle = filter.trim().toLowerCase();
  const visible = needle
    ? pages.filter(
        (p) => p.title.toLowerCase().includes(needle) || p.slug.toLowerCase().includes(needle),
      )
    : pages;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 style={{ fontSize: 26, marginBottom: 6 }}>Pages</h1>
          <p style={{ color: 'var(--gray)', fontSize: 14, margin: 0 }}>
            Every marketing page on the site. Edits go live within five minutes — pages are cached
            and revalidated on a timer, not rebuilt.
          </p>
        </div>
        <a className="btn btn-primary btn-sm" href="/admin/pages/new">
          New page
        </a>
      </div>

      {error && (
        <div className="form-status error" role="alert">
          {error}
        </div>
      )}

      {/* With this many pages, scanning the list is slower than typing. */}
      <div className="form-row" style={{ marginBottom: 14 }}>
        <label htmlFor="page-filter" className="sr-only">
          Filter pages
        </label>
        <input
          id="page-filter"
          type="search"
          placeholder="Filter by title or slug…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {visible.length === 0 ? (
        <p style={{ color: 'var(--gray)' }}>
          {pages.length === 0 ? (
            <>
              No pages yet. <a href="/admin/pages/new">Create one</a>.
            </>
          ) : (
            <>Nothing matches “{filter}”.</>
          )}
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--gray-light)' }}>
                <th style={{ padding: 10 }}>Title</th>
                <th style={{ padding: 10 }}>Status</th>
                <th style={{ padding: 10 }}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--gray-light)' }}>
                  <td style={{ padding: 10 }}>
                    <a href={`/admin/pages/${p.id}`} style={{ fontWeight: 600 }}>
                      {p.title}
                    </a>
                    <br />
                    <a
                      href={`/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 12, color: 'var(--gray)' }}
                    >
                      /{p.slug} ↗
                    </a>
                  </td>
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
                  <td style={{ padding: 10 }}>
                    {new Date(p.updatedAt).toLocaleDateString('en-AU')}
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
