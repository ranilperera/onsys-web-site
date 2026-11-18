'use client';

import { useEffect, useState } from 'react';
import { assignableStatuses, canPublish } from '@onsys/shared';
import { siteConfig } from '@/lib/config';
import { useAdminUser } from '@/lib/adminUser';

interface PostRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  updatedAt: string;
  category: { name: string } | null;
  authorName: string;
  authorId: string | null;
  submittedForReviewAt: string | null;
}

/** Reads the CSRF cookie set at login so mutations pass the double-submit check. */
function csrfToken(): string {
  return document.cookie.match(/(?:^|;\s*)onsys_csrf=([^;]+)/)?.[1] ?? '';
}

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  PUBLISHED: { bg: '#E7F5EC', fg: '#0B5B36' },
  DRAFT: { bg: '#FFF4CE', fg: '#6B5900' },
  ARCHIVED: { bg: 'var(--surface-gray)', fg: 'var(--gray)' },
};

/**
 * What an author sees in the status column.
 *
 * A dropdown would be the wrong control: there is only ever one move to make,
 * and the two states it cannot reach — published and archived — are somebody
 * else's decision. A button that says what will happen is honest about that in
 * a way a disabled Publish option is not.
 */
function StatusForAuthor({
  post,
  busy,
  onSubmit,
}: {
  post: PostRow;
  busy: boolean;
  onSubmit: (submitted: boolean) => void;
}) {
  if (post.status === 'PUBLISHED') {
    return <span style={{ color: '#0B5B36', fontWeight: 600 }}>Published</span>;
  }
  if (post.status === 'ARCHIVED') {
    return <span style={{ color: 'var(--gray)' }}>Archived</span>;
  }
  if (post.submittedForReviewAt) {
    return (
      <>
        <div style={{ color: 'var(--orange-text)', fontWeight: 700 }}>With an editor</div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={busy}
          style={{ marginTop: 6 }}
          onClick={() => onSubmit(false)}
        >
          Take it back
        </button>
      </>
    );
  }
  return (
    <>
      <div style={{ color: '#6B5900', fontWeight: 600 }}>Draft</div>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        disabled={busy}
        style={{ marginTop: 6 }}
        onClick={() => onSubmit(true)}
      >
        Send for review
      </button>
    </>
  );
}

export default function PostsPage() {
  const { user } = useAdminUser();
  const role = user?.role ?? 'EDITOR';
  const mayPublish = canPublish(role);

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

  /**
   * Hand a draft to an editor, or take it back.
   *
   * The status never moves: a submitted article is still a draft, so there is
   * no path by which an unreviewed piece reaches the public site. All that
   * changes is whether it is in somebody's queue.
   */
  async function setReview(post: PostRow, submitted: boolean) {
    setSaving(post.id);
    setError(null);
    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/admin/posts/${post.id}/review`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify({ submitted }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Could not update that article.');
        return;
      }
      const { post: updated } = await res.json();
      setPosts((rows) =>
        rows.map((r) =>
          r.id === post.id
            ? { ...r, submittedForReviewAt: updated.submittedForReviewAt, updatedAt: updated.updatedAt }
            : r,
        ),
      );
    } catch {
      setError('Could not reach the server.');
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
            {mayPublish ? (
              <>
                Imported WordPress content lands here as <strong>DRAFT</strong>. Review, then
                publish.
              </>
            ) : (
              <>
                Your articles. Write and save as often as you like — when one is finished, send it
                for review and an editor publishes it.
              </>
            )}
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
          {mayPublish ? (
            <>
              No posts yet. <a href="/admin/posts/new">Write one</a>, or import the WordPress
              archive with <code>npm run import:wp -- --source=https://www.onsys.com.au</code>
            </>
          ) : (
            <>
              Nothing under your byline yet. <a href="/admin/posts/new">Write your first article</a>.
            </>
          )}
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--gray-light)' }}>
                <th style={{ padding: 10 }}>Title</th>
                {/* An author's list is all their own work, so a byline column
                    would be the same name on every row. */}
                {mayPublish ? <th style={{ padding: 10 }}>Author</th> : null}
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
                  {mayPublish ? (
                    <td style={{ padding: 10 }}>{p.authorName}</td>
                  ) : null}
                  <td style={{ padding: 10 }}>{p.category?.name ?? '—'}</td>
                  <td style={{ padding: 10 }}>
                    {mayPublish ? (
                      <>
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
                          {assignableStatuses(role).map((s) => (
                            <option key={s} value={s}>
                              {s.charAt(0) + s.slice(1).toLowerCase()}
                            </option>
                          ))}
                        </select>
                        {/* The queue marker. An editor opening this list needs
                            to see what is waiting on them before anything
                            else. */}
                        {p.status === 'DRAFT' && p.submittedForReviewAt ? (
                          <div
                            style={{
                              fontSize: 12,
                              color: 'var(--orange-text)',
                              fontWeight: 700,
                              marginTop: 4,
                            }}
                          >
                            Ready for review
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <StatusForAuthor
                        post={p}
                        busy={saving === p.id}
                        onSubmit={(submitted) => void setReview(p, submitted)}
                      />
                    )}
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
