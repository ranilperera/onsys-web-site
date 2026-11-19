'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { siteConfig } from '@/lib/config';

/**
 * Two shapes, because an author's dashboard is not a smaller version of the
 * full one — it is a different set of facts.
 *
 * The lead and chat figures are how much work is coming in and how much of it
 * the bot could not handle. Neither is a contributor's business, and the API
 * leaves them out rather than sending zeroes: a zero is a statement, and that
 * one would be false.
 */
interface Stats {
  scope?: 'full' | 'author';
  leads?: { total: number; last30Days: number; new: number };
  content: { publishedPosts: number; draftPosts: number; inReview?: number };
  chat?: { last30Days: number; escalations: number };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${siteConfig.apiUrl}/api/admin/stats`, { credentials: 'include' })
      .then(async (r) => {
        if (r.status === 401) {
          window.location.href = '/admin/login';
          return null;
        }
        /*
         * An error body is not a smaller set of statistics. Reading on without
         * this check put { error, code } into state, and the first tile then
         * crashed the whole console on content.publishedPosts — which is what
         * a writer met on their very first sign-in, while still holding the
         * temporary password the API was refusing them over.
         */
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          setError(body.error ?? 'Could not load dashboard stats.');
          return null;
        }
        return r.json();
      })
      .then((d) => d && setStats(d))
      .catch(() => setError('Could not load dashboard stats.'));
  }, []);

  if (error) return <div className="form-status error">{error}</div>;
  if (!stats) return <p>Loading…</p>;

  const authorView = stats.scope === 'author' || !stats.leads;

  const tiles = authorView
    ? [
        { label: 'Your published articles', value: stats.content.publishedPosts, href: '/admin/posts' },
        { label: 'Your drafts', value: stats.content.draftPosts, href: '/admin/posts' },
        { label: 'With an editor', value: stats.content.inReview ?? 0, href: '/admin/posts' },
      ]
    : [
        { label: 'Leads (30 days)', value: stats.leads?.last30Days ?? 0, href: '/admin/leads' },
        { label: 'New / unactioned', value: stats.leads?.new ?? 0, href: '/admin/leads' },
        { label: 'Published posts', value: stats.content.publishedPosts, href: '/admin/posts' },
        { label: 'Drafts', value: stats.content.draftPosts, href: '/admin/posts' },
        // What is waiting on an editor. Put beside the drafts count because
        // the two are read together: of all the unfinished work, this is the
        // part somebody else is now holding up.
        { label: 'Ready for review', value: stats.content.inReview ?? 0, href: '/admin/posts' },
        { label: 'Chats (30 days)', value: stats.chat?.last30Days ?? 0, href: '/admin/chat' },
        { label: 'Escalated to Teams', value: stats.chat?.escalations ?? 0, href: '/admin/chat' },
      ];

  return (
    <>
      <h1 style={{ fontSize: 26, marginBottom: 22 }}>Dashboard</h1>
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {tiles.map((t) => (
          <Link key={t.label} className="mcard mcard--link" href={t.href}>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--navy)' }}>{t.value}</div>
            <div style={{ fontSize: 13, color: 'var(--gray)' }}>{t.label}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
