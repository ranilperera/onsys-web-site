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

export default function PostsPage() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${siteConfig.apiUrl}/api/admin/posts`, { credentials: 'include' })
      .then((r) => (r.status === 401 ? (window.location.href = '/admin/login', null) : r.json()))
      .then((d) => d && setPosts(d.posts))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading…</p>;

  return (
    <>
      <h1 style={{ fontSize: 26, marginBottom: 22 }}>Posts</h1>
      <p style={{ color: 'var(--gray)', fontSize: 14, marginBottom: 20 }}>
        Imported WordPress content lands here as <strong>DRAFT</strong>. Review, then publish.
      </p>
      {posts.length === 0 ? (
        <p style={{ color: 'var(--gray)' }}>
          No posts yet. Run <code>npm run import:wp -- --source=https://www.onsys.com.au</code>
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
                    <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer">
                      {p.title}
                    </a>
                  </td>
                  <td style={{ padding: 10 }}>{p.category?.name ?? '—'}</td>
                  <td style={{ padding: 10 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: 999,
                        background: p.status === 'PUBLISHED' ? '#E7F5EC' : '#F3F2F1',
                        color: p.status === 'PUBLISHED' ? '#0B5B36' : '#605E5C',
                      }}
                    >
                      {p.status}
                    </span>
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
