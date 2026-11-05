'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABEL,
  isApplicationOpen,
  type ApplicationStatusValue,
  type ApplicationSummary,
} from '@onsys/shared';
import { siteConfig } from '@/lib/config';

/**
 * The application queue.
 *
 * This screen is the entire point of the feature: a list of every CV with a
 * state on each one. The careers inbox could not say which applications had
 * been read, so the question "has anyone looked at this person?" had no answer
 * and some candidates never got one either.
 *
 * Defaults to the open pipeline rather than everything. A list that opens on
 * four hundred historical rows is a list nobody works from.
 */

interface JobOption {
  id: string;
  title: string;
  status: string;
  applicationCount: number;
  newApplicationCount: number;
}

/** Reads the CSRF cookie set at login so mutations pass the double-submit check. */
function csrfToken(): string {
  return document.cookie.match(/(?:^|;\s*)onsys_csrf=([^;]+)/)?.[1] ?? '';
}

const dateFmt = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/**
 * Colour by what the status means, not by position in the list.
 *
 * NEW is the only one that is loud, because it is the only one that means
 * "nobody has looked at this yet".
 */
const STATUS_STYLE: Record<ApplicationStatusValue, { bg: string; fg: string }> = {
  NEW: { bg: '#FFF4CE', fg: '#6B5900' },
  REVIEWED: { bg: '#EDF2FA', fg: '#0E336A' },
  SHORTLISTED: { bg: '#E7F5EC', fg: '#0B5B36' },
  INTERVIEWING: { bg: '#E7F5EC', fg: '#0B5B36' },
  OFFERED: { bg: '#E7F5EC', fg: '#0B5B36' },
  HIRED: { bg: '#0B5B36', fg: '#FFFFFF' },
  REJECTED: { bg: '#F3F2F1', fg: '#605E5C' },
  WITHDRAWN: { bg: '#F3F2F1', fg: '#605E5C' },
};

/** "248 KB" — a CV is never big enough to need more than this. */
function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "3 days ago" — how long a candidate has been waiting, which is the point. */
function waiting(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pre-filtered when arrived at from a row in the jobs console.
  const [jobId, setJobId] = useState(() =>
    typeof window === 'undefined'
      ? ''
      : new URLSearchParams(window.location.search).get('jobId') ?? '',
  );
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  /** Only live applications, which is what somebody signing in wants to see. */
  const [openOnly, setOpenOnly] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (jobId) params.set('jobId', jobId);
    if (status) params.set('status', status);
    if (query.trim()) params.set('q', query.trim());

    try {
      const res = await fetch(
        `${siteConfig.apiUrl}/api/admin/applications?${params.toString()}`,
        { credentials: 'include' },
      );
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      setApplications(data.applications ?? []);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [jobId, status, query]);

  useEffect(() => {
    void load();
  }, [load]);

  // The job filter, and the per-advert counts above it. Loaded once: the list
  // of adverts does not change while somebody works through a queue.
  useEffect(() => {
    fetch(`${siteConfig.apiUrl}/api/admin/jobs`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setJobs(d?.jobs ?? []))
      .catch(() => undefined);
  }, []);

  /**
   * Move an application along, applied optimistically and rolled back if the
   * request fails — the same contract as the leads console, for the same
   * reason: a control that never reverts quietly lies about what is stored.
   */
  async function changeStatus(application: ApplicationSummary, next: ApplicationStatusValue) {
    const previous = application.status;
    setSaving(application.id);
    setError(null);
    setApplications((rows) =>
      rows.map((r) => (r.id === application.id ? { ...r, status: next } : r)),
    );

    try {
      const res = await fetch(
        `${siteConfig.apiUrl}/api/admin/applications/${application.id}/status`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() },
          body: JSON.stringify({ status: next }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Could not change that status.');
        setApplications((rows) =>
          rows.map((r) => (r.id === application.id ? { ...r, status: previous } : r)),
        );
      }
    } catch {
      setError('Could not reach the server.');
      setApplications((rows) =>
        rows.map((r) => (r.id === application.id ? { ...r, status: previous } : r)),
      );
    } finally {
      setSaving(null);
    }
  }

  const visible = openOnly ? applications.filter((a) => isApplicationOpen(a.status)) : applications;
  const newCount = applications.filter((a) => a.status === 'NEW').length;

  return (
    <>
      <div className="admin-head">
        <h1 style={{ fontSize: 26, margin: 0 }}>Applications</h1>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--gray)' }}>
          {newCount > 0
            ? `${newCount} nobody has opened yet`
            : 'Everything here has been looked at'}
        </p>
      </div>

      {error && (
        <div className="form-status error" role="alert">
          {error}
        </div>
      )}

      <section className="admin-card">
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="job">Role</label>
            <select id="job" value={jobId} onChange={(e) => setJobId(e.target.value)}>
              <option value="">All roles</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                  {j.applicationCount ? ` (${j.applicationCount})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                // Asking for a closed status and then filtering it out again
                // would show an empty table and look like a bug.
                if (e.target.value) setOpenOnly(false);
              }}
            >
              <option value="">Any status</option>
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {APPLICATION_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="q">Name or email</label>
            <input
              id="q"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Has this person applied before?"
            />
          </div>

          <div className="form-field">
            <label htmlFor="openOnly" className="checkbox-label">
              <input
                id="openOnly"
                type="checkbox"
                checked={openOnly}
                onChange={(e) => setOpenOnly(e.target.checked)}
              />
              <span>Still open only</span>
            </label>
          </div>
        </div>
      </section>

      {loading ? (
        <p>Loading…</p>
      ) : visible.length === 0 ? (
        <section className="admin-card">
          <p style={{ margin: 0 }}>
            {applications.length === 0
              ? 'No applications yet. They arrive here the moment someone applies on the site.'
              : 'Nothing matches those filters.'}
          </p>
        </section>
      ) : (
        <section className="admin-card" style={{ overflowX: 'auto' }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--gray)' }}>
            Open a candidate to read their note, add an internal comment and see the full record.
          </p>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Role</th>
                <th>Based in</th>
                <th>Available</th>
                <th>Applied</th>
                <th>Status</th>
                <th>CV</th>
                <th>
                  <span className="sr-only">Open the full application</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((application) => {
                const style = STATUS_STYLE[application.status];
                return (
                  <tr key={application.id}>
                    <td>
                      <Link
                        href={`/admin/applications/${application.id}`}
                        style={{ fontWeight: 700, textDecoration: 'underline' }}
                      >
                        {application.fullName}
                      </Link>
                      <div style={{ fontSize: 12.5, color: 'var(--gray)' }}>
                        {/* Clickable, because the first thing anyone does with
                            a promising application is write to them. */}
                        <a
                          href={`mailto:${application.email}?subject=${encodeURIComponent(
                            `Your application — ${application.job.title}`,
                          )}`}
                        >
                          {application.email}
                        </a>{' '}
                        · {application.phone}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--gray)', marginTop: 2 }}>
                        {application.linkedinUrl && (
                          <a
                            href={application.linkedinUrl}
                            target="_blank"
                            rel="noreferrer nofollow"
                            style={{ marginRight: 8 }}
                          >
                            LinkedIn ↗
                          </a>
                        )}
                        {/* A note is the one thing a table cannot summarise,
                            so the row says there is one and the detail page
                            shows it. */}
                        {application.hasCoverNote && <span>Wrote a note</span>}
                      </div>
                    </td>
                    <td>{application.job.title}</td>
                    <td>{application.location}</td>
                    <td>
                      {application.noticePeriod || <span style={{ color: 'var(--gray)' }}>—</span>}
                      {application.expectedSalary && (
                        <div style={{ fontSize: 12.5, color: 'var(--gray)' }}>
                          Asking {application.expectedSalary}
                        </div>
                      )}
                    </td>
                    <td title={dateFmt.format(new Date(application.submittedAt))}>
                      {waiting(application.submittedAt)}
                    </td>
                    <td>
                      <select
                        aria-label={`Status for ${application.fullName}`}
                        value={application.status}
                        disabled={saving === application.id}
                        onChange={(e) =>
                          changeStatus(application, e.target.value as ApplicationStatusValue)
                        }
                        style={{
                          background: style.bg,
                          color: style.fg,
                          border: 'none',
                          borderRadius: 999,
                          padding: '5px 10px',
                          fontSize: 12.5,
                          fontWeight: 600,
                        }}
                      >
                        {APPLICATION_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {APPLICATION_STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {/*
                        A plain link, not fetch: the download is an
                        authenticated GET and the cookie goes with it, so the
                        browser can save the file itself. Opening in a new tab
                        keeps the queue where it was.
                      */}
                      <a
                        href={`${siteConfig.apiUrl}/api/admin/applications/${application.id}/cv`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Download
                      </a>
                      <div style={{ fontSize: 12, color: 'var(--gray)' }}>
                        {fileSize(application.cvBytes)}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Link className="btn btn-outline btn-sm" href={`/admin/applications/${application.id}`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
