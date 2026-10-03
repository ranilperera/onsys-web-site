'use client';

import { useEffect, useState } from 'react';
import { siteConfig } from '@/lib/config';
import {
  JOB_TYPE_LABEL,
  JOB_LOCATION_LABEL,
  WORK_ARRANGEMENT_LABEL,
  isJobOpen,
  type JobTypeValue,
  type JobLocationValue,
  type WorkArrangementValue,
} from '@onsys/shared';

interface JobRow {
  id: string;
  slug: string;
  title: string;
  type: JobTypeValue;
  location: JobLocationValue;
  workArrangement: WorkArrangementValue;
  status: string;
  closesAt: string;
  publishedAt: string | null;
  updatedAt: string;
  createdBy: { name: string } | null;
}

/** Reads the CSRF cookie set at login so mutations pass the double-submit check. */
function csrfToken(): string {
  return document.cookie.match(/(?:^|;\s*)onsys_csrf=([^;]+)/)?.[1] ?? '';
}

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  PUBLISHED: { bg: '#E7F5EC', fg: '#0B5B36' },
  DRAFT: { bg: '#FFF4CE', fg: '#6B5900' },
};

const dateFmt = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Publish or withdraw from the list, applied optimistically and rolled back
   * if the request fails — the same contract as the posts console, for the
   * same reason: a control that never reverts quietly lies about what is live.
   */
  async function changeStatus(job: JobRow, status: string) {
    const previous = job.status;
    setSaving(job.id);
    setError(null);
    setJobs((rows) => rows.map((r) => (r.id === job.id ? { ...r, status } : r)));

    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/admin/jobs/${job.id}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Could not change that status.');
        setJobs((rows) => rows.map((r) => (r.id === job.id ? { ...r, status: previous } : r)));
        return;
      }
    } catch {
      setError('Could not reach the server.');
      setJobs((rows) => rows.map((r) => (r.id === job.id ? { ...r, status: previous } : r)));
    } finally {
      setSaving(null);
    }
  }

  /**
   * Delete, with a confirm naming the role.
   *
   * Withdrawing a job is a status change; deleting it throws the advert away,
   * and the API restricts it to administrators. The confirm exists because the
   * two controls sit on the same row.
   */
  async function remove(job: JobRow) {
    if (!window.confirm(`Delete "${job.title}"? The advert is removed permanently.`)) return;
    setSaving(job.id);
    setError(null);

    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/admin/jobs/${job.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'x-csrf-token': csrfToken() },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(
          body.error ??
            (res.status === 403
              ? 'Only an administrator can delete a job. Set it to Draft to take it off the site.'
              : 'Could not delete that job.'),
        );
        return;
      }

      setJobs((rows) => rows.filter((r) => r.id !== job.id));
    } catch {
      setError('Could not reach the server.');
    } finally {
      setSaving(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`${siteConfig.apiUrl}/api/admin/jobs`, { credentials: 'include' })
      .then((r) => (r.status === 401 ? ((window.location.href = '/admin/login'), null) : r.json()))
      .then((d) => {
        if (!cancelled && d) setJobs(d.jobs);
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
          <h1 style={{ fontSize: 26, marginBottom: 6 }}>Jobs</h1>
          <p style={{ color: 'var(--gray)', fontSize: 14, margin: 0 }}>
            Published roles appear on <a href="/careers">/careers</a>. A role past its closing date
            leaves the listing and the sitemap on its own — no need to withdraw it.
          </p>
        </div>
        <a className="btn btn-primary btn-sm" href="/admin/jobs/new">
          New job
        </a>
      </div>

      {error && (
        <div className="form-status error" role="alert">
          {error}
        </div>
      )}

      {jobs.length === 0 ? (
        <p style={{ color: 'var(--gray)' }}>
          No jobs yet. <a href="/admin/jobs/new">Post one</a> — it saves as a draft until you
          publish it.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--gray-light)' }}>
                <th style={{ padding: 10 }}>Role</th>
                <th style={{ padding: 10 }}>Where</th>
                <th style={{ padding: 10 }}>Closes</th>
                <th style={{ padding: 10 }}>Status</th>
                <th style={{ padding: 10 }}>Posted by</th>
                <th style={{ padding: 10 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => {
                const open = isJobOpen(j.closesAt);
                return (
                  <tr key={j.id} style={{ borderBottom: '1px solid var(--gray-light)' }}>
                    <td style={{ padding: 10 }}>
                      <a href={`/admin/jobs/${j.id}`} style={{ fontWeight: 600 }}>
                        {j.title}
                      </a>
                      <br />
                      <a
                        href={`/careers/${j.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 12, color: 'var(--gray)' }}
                      >
                        /careers/{j.slug} ↗
                      </a>
                    </td>
                    <td style={{ padding: 10 }}>
                      {JOB_LOCATION_LABEL[j.location]}
                      <br />
                      <span style={{ fontSize: 12, color: 'var(--gray)' }}>
                        {JOB_TYPE_LABEL[j.type]} · {WORK_ARRANGEMENT_LABEL[j.workArrangement]}
                      </span>
                    </td>
                    <td style={{ padding: 10, whiteSpace: 'nowrap' }}>
                      {dateFmt.format(new Date(j.closesAt))}
                      {/* A published-but-closed role is the state worth
                          flagging: it looks live in this list and is not. */}
                      {!open && (
                        <>
                          <br />
                          <span style={{ fontSize: 12, color: '#A4262C', fontWeight: 600 }}>
                            Closed
                          </span>
                        </>
                      )}
                    </td>
                    <td style={{ padding: 10 }}>
                      <label htmlFor={`status-${j.id}`} className="sr-only">
                        Status for {j.title}
                      </label>
                      <select
                        id={`status-${j.id}`}
                        className="status-select"
                        value={j.status}
                        disabled={saving === j.id}
                        onChange={(e) => void changeStatus(j, e.target.value)}
                        style={{
                          background: (STATUS_STYLE[j.status] ?? STATUS_STYLE.DRAFT).bg,
                          color: (STATUS_STYLE[j.status] ?? STATUS_STYLE.DRAFT).fg,
                        }}
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="PUBLISHED">PUBLISHED</option>
                      </select>
                    </td>
                    <td style={{ padding: 10, color: 'var(--gray)' }}>
                      {j.createdBy?.name ?? '—'}
                    </td>
                    <td style={{ padding: 10 }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => void remove(j)}
                        disabled={saving === j.id}
                      >
                        Delete
                      </button>
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
