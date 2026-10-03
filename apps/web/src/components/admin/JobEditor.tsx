'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { siteConfig } from '@/lib/config';
import {
  JOB_TYPES,
  JOB_LOCATIONS,
  WORK_ARRANGEMENTS,
  JOB_TYPE_LABEL,
  JOB_LOCATION_LABEL,
  WORK_ARRANGEMENT_LABEL,
  slugifyJob,
  type JobTypeValue,
  type JobLocationValue,
  type WorkArrangementValue,
} from '@onsys/shared';
import { RichTextEditor } from './RichTextEditor';

/**
 * Create or edit a vacancy.
 *
 * Ported from the standalone careers app's HR screens, minus its separate
 * login and user table — this sits behind the admin session the rest of the
 * console already uses, so there is one credential with one MFA enrolment.
 */

interface JobForm {
  slug: string;
  title: string;
  summary: string;
  type: JobTypeValue;
  location: JobLocationValue;
  workArrangement: WorkArrangementValue;
  descriptionHtml: string;
  salaryRange: string;
  closesAt: string;
  applyEmail: string;
  status: 'DRAFT' | 'PUBLISHED';
  seoTitle: string;
  seoDescription: string;
}

/** Four weeks out — a normal advertising window, and never a past date. */
function defaultCloseDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 28);
  return d.toISOString().slice(0, 10);
}

const EMPTY: JobForm = {
  slug: '',
  title: '',
  summary: '',
  type: 'PERMANENT',
  location: 'AUSTRALIA',
  workArrangement: 'HYBRID',
  descriptionHtml: '',
  salaryRange: '',
  closesAt: defaultCloseDate(),
  applyEmail: '',
  status: 'DRAFT',
  seoTitle: '',
  seoDescription: '',
};

/** Reads the CSRF cookie set at login so mutations pass the double-submit check. */
function csrfToken(): string {
  return document.cookie.match(/(?:^|;\s*)onsys_csrf=([^;]+)/)?.[1] ?? '';
}

export function JobEditor({ jobId }: { jobId?: string }) {
  const [form, setForm] = useState<JobForm>(EMPTY);
  const [loading, setLoading] = useState(Boolean(jobId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Once an advert exists at a URL, retyping the title must not move it. */
  const [slugLocked, setSlugLocked] = useState(Boolean(jobId));

  useEffect(() => {
    if (!jobId) return;
    // StrictMode double-invokes effects, and without this guard a slow first
    // response can land after the second and overwrite what has been typed.
    let cancelled = false;

    fetch(`${siteConfig.apiUrl}/api/admin/jobs/${jobId}`, { credentials: 'include' })
      .then((r) => (r.status === 401 ? ((window.location.href = '/admin/login'), null) : r.json()))
      .then((d) => {
        if (cancelled || !d?.job) return;
        const j = d.job;
        setForm({
          slug: j.slug,
          title: j.title,
          summary: j.summary,
          type: j.type,
          location: j.location,
          workArrangement: j.workArrangement,
          descriptionHtml: j.descriptionHtml,
          salaryRange: j.salaryRange ?? '',
          closesAt: String(j.closesAt).slice(0, 10),
          applyEmail: j.applyEmail ?? '',
          status: j.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
          seoTitle: j.seoTitle ?? '',
          seoDescription: j.seoDescription ?? '',
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const onDescription = useCallback(
    (html: string) => setForm((f) => ({ ...f, descriptionHtml: html })),
    [],
  );

  function onTitle(title: string) {
    setForm((f) => ({ ...f, title, slug: slugLocked ? f.slug : slugifyJob(title) }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/admin/jobs${jobId ? `/${jobId}` : ''}`, {
        method: jobId ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // A slug clash returns `error`; a bad field returns zod issues. Show
        // whichever arrived rather than a generic failure the author cannot act on.
        const issues = Array.isArray(body.issues)
          ? body.issues.map((i: { message: string }) => i.message).join(' ')
          : null;
        setError(body.error ?? issues ?? 'Could not save this job.');
        return;
      }

      window.location.href = '/admin/jobs';
    } catch {
      setError('Could not reach the server.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading…</p>;

  return (
    <form onSubmit={onSubmit}>
      <div className="admin-head">
        <h1 style={{ fontSize: 26, margin: 0 }}>{jobId ? 'Edit job' : 'New job'}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <a className="btn btn-outline btn-sm" href="/admin/jobs">
            Cancel
          </a>
          <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="form-status error" role="alert">
          {error}
        </div>
      )}

      <section className="admin-card">
        <h2>The role</h2>
        <div className="form-row">
          <div className="form-field full">
            <label htmlFor="title">Job title</label>
            <input
              id="title"
              value={form.title}
              onChange={(e) => onTitle(e.target.value)}
              required
              maxLength={200}
            />
          </div>

          <div className="form-field full">
            <label htmlFor="slug">
              URL slug{' '}
              <span style={{ fontWeight: 400, color: 'var(--gray)' }}>
                /careers/{form.slug || '…'}
              </span>
            </label>
            <input
              id="slug"
              value={form.slug}
              onChange={(e) => {
                setSlugLocked(true);
                setForm((f) => ({ ...f, slug: e.target.value }));
              }}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              required
            />
            {jobId ? (
              <p style={{ fontSize: 12.5, color: 'var(--gray)', margin: '6px 0 0' }}>
                Changing this moves the advert. Anyone holding the old link gets a 404.
              </p>
            ) : null}
          </div>

          <div className="form-field full">
            <label htmlFor="summary">One-line summary</label>
            <input
              id="summary"
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              required
              maxLength={300}
            />
            <p style={{ fontSize: 12.5, color: 'var(--gray)', margin: '6px 0 0' }}>
              Shown on the /careers list, and used as the meta description when none is set.
            </p>
          </div>

          <div className="form-field">
            <label htmlFor="type">Type</label>
            <select
              id="type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as JobTypeValue }))}
            >
              {JOB_TYPES.map((t) => (
                <option key={t} value={t}>
                  {JOB_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="location">Location</label>
            <select
              id="location"
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value as JobLocationValue }))
              }
            >
              {JOB_LOCATIONS.map((l) => (
                <option key={l} value={l}>
                  {JOB_LOCATION_LABEL[l]}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="arrangement">Work arrangement</label>
            <select
              id="arrangement"
              value={form.workArrangement}
              onChange={(e) =>
                setForm((f) => ({ ...f, workArrangement: e.target.value as WorkArrangementValue }))
              }
            >
              {WORK_ARRANGEMENTS.map((w) => (
                <option key={w} value={w}>
                  {WORK_ARRANGEMENT_LABEL[w]}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="closesAt">Applications close</label>
            <input
              id="closesAt"
              type="date"
              value={form.closesAt}
              onChange={(e) => setForm((f) => ({ ...f, closesAt: e.target.value }))}
              required
            />
            <p style={{ fontSize: 12.5, color: 'var(--gray)', margin: '6px 0 0' }}>
              Open for all of this day. After it, the advert leaves /careers and the sitemap on its
              own.
            </p>
          </div>

          <div className="form-field">
            <label htmlFor="salaryRange">Salary range (optional)</label>
            <input
              id="salaryRange"
              value={form.salaryRange}
              onChange={(e) => setForm((f) => ({ ...f, salaryRange: e.target.value }))}
              maxLength={160}
              placeholder="AUD 120,000 – 140,000 + super"
            />
          </div>

          <div className="form-field">
            <label htmlFor="applyEmail">Applications to (optional)</label>
            <input
              id="applyEmail"
              type="email"
              value={form.applyEmail}
              onChange={(e) => setForm((f) => ({ ...f, applyEmail: e.target.value }))}
              maxLength={200}
              placeholder={siteConfig.careersEmail}
            />
          </div>
        </div>
      </section>

      <section className="admin-card">
        <h2>The advert</h2>
        <RichTextEditor value={form.descriptionHtml} onChange={onDescription} />
      </section>

      <section className="admin-card">
        <h2>Publishing</h2>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as 'DRAFT' | 'PUBLISHED' }))
              }
            >
              <option value="DRAFT">Draft — not on the site</option>
              <option value="PUBLISHED">Published — live on /careers</option>
            </select>
          </div>

          <div className="form-field full">
            <label htmlFor="seoTitle">SEO title (optional)</label>
            <input
              id="seoTitle"
              value={form.seoTitle}
              onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))}
              maxLength={200}
              placeholder={form.title ? `${form.title} — Careers at Onsys` : ''}
            />
          </div>

          <div className="form-field full">
            <label htmlFor="seoDescription">Meta description (optional)</label>
            <textarea
              id="seoDescription"
              rows={2}
              value={form.seoDescription}
              onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))}
              maxLength={320}
              placeholder={form.summary}
            />
          </div>
        </div>
      </section>
    </form>
  );
}
