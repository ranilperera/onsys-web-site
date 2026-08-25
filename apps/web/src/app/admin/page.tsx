'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { siteConfig } from '@/lib/config';

interface Stats {
  leads: { total: number; last30Days: number; new: number };
  content: { publishedPosts: number; draftPosts: number };
  chat: { last30Days: number; escalations: number };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${siteConfig.apiUrl}/api/admin/stats`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 401) {
          window.location.href = '/admin/login';
          return null;
        }
        return r.json();
      })
      .then((d) => d && setStats(d))
      .catch(() => setError('Could not load dashboard stats.'));
  }, []);

  if (error) return <div className="form-status error">{error}</div>;
  if (!stats) return <p>Loading…</p>;

  const tiles = [
    { label: 'Leads (30 days)', value: stats.leads.last30Days, href: '/admin/leads' },
    { label: 'New / unactioned', value: stats.leads.new, href: '/admin/leads' },
    { label: 'Published posts', value: stats.content.publishedPosts, href: '/admin/posts' },
    { label: 'Drafts', value: stats.content.draftPosts, href: '/admin/posts' },
    { label: 'Chats (30 days)', value: stats.chat.last30Days, href: '/admin/chat' },
    { label: 'Escalated to Teams', value: stats.chat.escalations, href: '/admin/chat' },
  ];

  return (
    <>
      <h1 style={{ fontSize: 26, marginBottom: 22 }}>Dashboard</h1>
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {tiles.map((t) => (
          <Link key={t.label} className="mcard" href={t.href} style={{ padding: 24 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--navy)' }}>{t.value}</div>
            <div style={{ fontSize: 13, color: 'var(--gray)' }}>{t.label}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
