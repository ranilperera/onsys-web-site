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
  /// ISO country code derived from the visit — see deriveCountry in the API.
  country: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrer: string | null;
  /// The page the visit landed on, not the page the form sat on.
  landingPath: string | null;
  /// Set only by the plan-card enquiry.
  plan: string | null;
  instanceCount: string | null;
}

/**
 * How this lead arrived, in as few characters as a table cell allows.
 *
 * A campaign beats a referrer, and a referrer beats nothing: "google / cpc" is
 * what a paid click looks like, a bare hostname is organic or a link, and
 * "Direct" means the visit carried no source at all. Older leads predate
 * attribution capture and show a dash rather than claiming to be direct.
 */
function sourceLabel(lead: Lead): string {
  if (lead.utmSource) {
    const campaign = lead.utmCampaign ? ` · ${lead.utmCampaign}` : '';
    return `${lead.utmSource}${lead.utmMedium ? ` / ${lead.utmMedium}` : ''}${campaign}`;
  }
  if (lead.referrer) {
    try {
      return new URL(lead.referrer).hostname.replace(/^www\./, '');
    } catch {
      return lead.referrer.slice(0, 40);
    }
  }
  return 'Direct';
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
  /** Rows ticked for deletion. Spam arrives in batches, so selection is the
      primary flow and the per-row delete is the exception. */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

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

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /**
   * Delete the ticked rows.
   *
   * The confirm names the count and says it cannot be undone, because it
   * cannot — there is no soft delete, deliberately: the rows this exists for
   * are bot submissions carrying other people's email addresses, and a bin
   * full of those is still a store of other people's email addresses.
   */
  async function deleteSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `Delete ${ids.length} lead${ids.length === 1 ? '' : 's'}? This cannot be undone.`,
      )
    ) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/admin/leads/delete`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify({ ids }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          body.error ??
            (res.status === 403
              ? 'Only an administrator can delete leads.'
              : 'Could not delete those leads.'),
        );
        return;
      }

      setLeads((rows) => rows.filter((r) => !selected.has(r.id)));
      setSelected(new Set());
    } catch {
      setError('Could not reach the server.');
    } finally {
      setDeleting(false);
    }
  }

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

      {/* Appears only when something is ticked, so the destructive control is
          not sitting on screen during ordinary work. */}
      {selected.size > 0 && (
        <div className="lead-bulk" role="region" aria-label="Bulk actions">
          <span>
            <strong>{selected.size}</strong> selected
          </span>
          <button className="btn btn-sm btn-danger" onClick={() => void deleteSelected()} disabled={deleting}>
            {deleting ? 'Deleting…' : `Delete ${selected.size}`}
          </button>
          <button className="btn btn-sm btn-outline" onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
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
                <th style={{ padding: 10, width: 28 }}>
                  <label className="sr-only" htmlFor="select-all-leads">
                    Select all shown leads
                  </label>
                  <input
                    id="select-all-leads"
                    type="checkbox"
                    checked={shown.length > 0 && shown.every((l) => selected.has(l.id))}
                    onChange={(e) =>
                      setSelected(e.target.checked ? new Set(shown.map((l) => l.id)) : new Set())
                    }
                  />
                </th>
                <th>Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>Message</th>
                <th>Channel</th>
                {/* Only 10% of site clicks are Australian, so "where did this
                    come from" is the first question asked of a new lead. */}
                <th>Market</th>
                <th>Source</th>
                {/* Which page did the convincing, and what were they sizing. */}
                <th>Landed on</th>
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
                    <td style={{ padding: 10 }}>
                      <label className="sr-only" htmlFor={`select-${l.id}`}>
                        Select lead from {l.name}
                      </label>
                      <input
                        id={`select-${l.id}`}
                        type="checkbox"
                        checked={selected.has(l.id)}
                        onChange={() => toggleSelected(l.id)}
                      />
                    </td>
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
                    <td>{l.country ?? '—'}</td>
                    <td className="lead-source" title={l.referrer ?? undefined}>
                      {sourceLabel(l)}
                    </td>
                    <td className="lead-source">
                      {l.landingPath ? (
                        <a href={l.landingPath} target="_blank" rel="noreferrer">
                          {l.landingPath}
                        </a>
                      ) : (
                        '—'
                      )}
                      {l.plan && (
                        <span className="lead-service">
                          {l.plan}
                          {l.instanceCount ? ` · ${l.instanceCount}` : ''}
                        </span>
                      )}
                    </td>
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
