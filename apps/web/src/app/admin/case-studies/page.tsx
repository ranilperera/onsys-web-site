'use client';

import { useEffect, useState } from 'react';
import { siteConfig } from '@/lib/config';

interface CaseStudyRow {
  id: string;
  slug: string;
  title: string;
  sector: string;
  region: string;
  deliveredYear: number;
  status: string;
  platforms: string[];
  updatedAt: string;
}

/** Reads the CSRF cookie set at login so mutations pass the double-submit check. */
function csrfToken(): string {
  return document.cookie.match(/(?:^|;\s*)onsys_csrf=([^;]+)/)?.[1] ?? '';
}

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  PUBLISHED: { bg: '#E7F5EC', fg: '#0B5B36' },
  DRAFT: { bg: '#FFF4CE', fg: '#6B5900' },
};

export default function CaseStudiesAdminPage() {
  const [rows, setRows] = useState<CaseStudyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(row: CaseStudyRow, status: string) {
    const previous = row.status;
    setSaving(row.id);
    setError(null);
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status } : r)));

    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/admin/case-studies/${row.id}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Could not change that status.');
        setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status: previous } : r)));
      }
    } catch {
      setError('Could not reach the server.');
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status: previous } : r)));
    } finally {
      setSaving(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`${siteConfig.apiUrl}/api/admin/case-studies`, { credentials: 'include' })
      .then((r) => (r.status === 401 ? ((window.location.href = '/admin/login'), null) : r.json()))
      .then((d) => {
        if (!cancelled && d) setRows(d.caseStudies);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p>Loading…</p>;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 style={{ fontSize: 26, marginBottom: 6 }}>Case studies</h1>
          <p style={{ color: 'var(--gray)', fontSize: 14, margin: 0 }}>
            Published studies appear on <a href="/case-studies">/case-studies</a>. No client is ever
            named. Saving is refused if the copy contains a hostname, an IP address, a build number,
            a port or a price — see the note below.
          </p>
        </div>
      </div>

      {error && (
        <div className="form-status error" role="alert">
          {error}
        </div>
      )}

      <div className="admin-card" style={{ marginBottom: 18 }}>
        <h2>Before you publish one</h2>
        <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0, color: 'var(--gray)' }}>
          These are written from commercial-in-confidence client documentation. The save check is a
          net, not a sieve — it catches a hostname or a build number pasted in with a sentence, but
          it cannot tell a client&apos;s platform name from an ordinary word. Sector, region and year
          are all the identity that is permitted, and <strong>region is deliberately coarse for the
          Pacific</strong>: naming the country identifies the client in a market with one operator.
        </p>
      </div>

      {rows.length === 0 ? (
        <p style={{ color: 'var(--gray)' }}>
          No case studies yet. They are seeded from the repository —{' '}
          <code>npm run seed -w @onsys/api</code> — because the reviewed, anonymised wording lives
          in version control.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--gray-light)' }}>
                <th style={{ padding: 10 }}>Engagement</th>
                <th style={{ padding: 10 }}>Sector</th>
                <th style={{ padding: 10 }}>Region</th>
                <th style={{ padding: 10 }}>Delivered</th>
                <th style={{ padding: 10 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--gray-light)' }}>
                  <td style={{ padding: 10 }}>
                    <strong>{r.title}</strong>
                    <br />
                    <a
                      href={`/case-studies/${r.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 12, color: 'var(--gray)' }}
                    >
                      /case-studies/{r.slug} ↗
                    </a>
                    {r.platforms.length > 0 && (
                      <>
                        <br />
                        <span style={{ fontSize: 12, color: 'var(--gray)' }}>
                          {r.platforms.join(' · ')}
                        </span>
                      </>
                    )}
                  </td>
                  <td style={{ padding: 10 }}>{r.sector}</td>
                  <td style={{ padding: 10 }}>{r.region}</td>
                  <td style={{ padding: 10 }}>{r.deliveredYear}</td>
                  <td style={{ padding: 10 }}>
                    <label htmlFor={`status-${r.id}`} className="sr-only">
                      Status for {r.title}
                    </label>
                    <select
                      id={`status-${r.id}`}
                      className="status-select"
                      value={r.status}
                      disabled={saving === r.id}
                      onChange={(e) => void changeStatus(r, e.target.value)}
                      style={{
                        background: (STATUS_STYLE[r.status] ?? STATUS_STYLE.DRAFT).bg,
                        color: (STATUS_STYLE[r.status] ?? STATUS_STYLE.DRAFT).fg,
                      }}
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="PUBLISHED">PUBLISHED</option>
                    </select>
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
