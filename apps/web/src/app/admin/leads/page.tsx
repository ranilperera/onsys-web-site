'use client';

import { useCallback, useEffect, useState } from 'react';
import { siteConfig } from '@/lib/config';

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  service: string | null;
  message: string | null;
  status: string;
  channel: string;
  createdAt: string;
}

/** Reads the CSRF cookie set at login so mutations pass the double-submit check. */
function csrfToken(): string {
  return document.cookie.match(/(?:^|;\s*)onsys_csrf=([^;]+)/)?.[1] ?? '';
}

/**
 * The follow-up pipeline. Each status names the next action rather than a
 * state, so the button can say what it does instead of what it sets.
 */
const NEXT_STATUS: Record<string, { to: string; label: string } | undefined> = {
  NEW: { to: 'CONTACTED', label: 'Mark contacted' },
  CONTACTED: { to: 'QUALIFIED', label: 'Mark qualified' },
  QUALIFIED: { to: 'CLOSED', label: 'Mark closed' },
  CLOSED: undefined,
};

const STATUS_ORDER = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED'];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`${siteConfig.apiUrl}/api/admin/leads`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 401) {
          const next = encodeURIComponent(window.location.pathname);
          window.location.href = `/admin/login?next=${next}`;
          return null;
        }
        return r.json();
      })
      .then((d) => d && setLeads(d.leads))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function advance(lead: Lead) {
    const next = NEXT_STATUS[lead.status];
    if (!next) return;

    setSaving(lead.id);
    setError(null);
    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/admin/leads/${lead.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify({ status: next.to }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Could not update that lead.');
        return;
      }
      // Update in place rather than refetching: the list is sorted by date,
      // and a reload would not move the row anyway.
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: next.to } : l)));
    } catch {
      setError('Could not reach the server.');
    } finally {
      setSaving(null);
    }
  }

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });

  if (loading) return <p>Loading…</p>;

  const shown = filter === 'ALL' ? leads : leads.filter((l) => l.status === filter);
  const counts = STATUS_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s).length;
    return acc;
  }, {});

  return (
    <>
      <h1 style={{ fontSize: 26, marginBottom: 16 }}>Leads</h1>

      {error && (
        <div className="form-status error" role="alert">
          {error}
        </div>
      )}

      <div className="lead-filters">
        <button
          className={filter === 'ALL' ? 'active' : undefined}
          onClick={() => setFilter('ALL')}
        >
          All ({leads.length})
        </button>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            className={filter === s ? 'active' : undefined}
            onClick={() => setFilter(s)}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p style={{ color: 'var(--gray)' }}>
          {leads.length === 0 ? 'No enquiries yet.' : 'Nothing with that status.'}
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>Message</th>
                <th>Channel</th>
                <th>Received</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((l) => {
                const next = NEXT_STATUS[l.status];
                const isOpen = expanded.has(l.id);
                const message = l.message ?? '';
                const isLong = message.length > 90;

                return (
                  <tr key={l.id}>
                    <td>{l.name}</td>
                    <td>
                      <a href={`mailto:${l.email}`}>{l.email}</a>
                    </td>
                    <td>{l.company ?? '—'}</td>
                    <td className="lead-message">
                      {message ? (
                        <>
                          <span className={isOpen ? 'full' : 'clamped'}>{message}</span>
                          {isLong && (
                            <button className="lead-more" onClick={() => toggle(l.id)}>
                              {isOpen ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </>
                      ) : (
                        <span style={{ color: 'var(--gray)' }}>—</span>
                      )}
                      {l.service && <span className="lead-service">{l.service}</span>}
                    </td>
                    <td>{l.channel}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(l.createdAt).toLocaleDateString('en-AU')}
                    </td>
                    <td>
                      <span className={`lead-status ${l.status.toLowerCase()}`}>{l.status}</span>
                    </td>
                    <td>
                      {next ? (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => void advance(l)}
                          disabled={saving === l.id}
                        >
                          {saving === l.id ? 'Saving…' : next.label}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--gray)', fontSize: 12.5 }}>Done</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
