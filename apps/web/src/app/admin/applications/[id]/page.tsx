'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABEL,
  isApplicationOpen,
  type ApplicationRecord,
  type ApplicationStatusValue,
  type ApplicationSummary,
} from '@onsys/shared';
import { siteConfig } from '@/lib/config';
import { CvInsightPanel } from '@/components/admin/CvInsightPanel';
import {
  DEFAULT_QUEUE,
  queueApiQuery,
  queueHref,
  readQueue,
  type QueueParams,
} from '@/lib/applicationQueue';

/**
 * One application.
 *
 * Everything needed to decide on a candidate, on one screen: who they are, how
 * to reach them, what they said, their CV, and the shared note that stops two
 * people duplicating the same phone call.
 */

/** Reads the CSRF cookie set at login so mutations pass the double-submit check. */
function csrfToken(): string {
  return document.cookie.match(/(?:^|;\s*)onsys_csrf=([^;]+)/)?.[1] ?? '';
}

const dateTimeFmt = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * One labelled value.
 *
 * An empty field renders as "Not supplied" rather than disappearing. A field
 * that vanishes when blank is indistinguishable from a field the page forgot
 * to render, which is exactly the doubt this screen must not create: a
 * reviewer has to be able to tell "the candidate left this blank" from "the
 * console is not showing me everything".
 */
function Field({
  label,
  children,
  empty = 'Not supplied',
}: {
  label: string;
  children: React.ReactNode;
  empty?: string;
}) {
  const isEmpty = children === null || children === undefined || children === '';
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', color: '#605E5C' }}>
        {label}
      </div>
      <div style={{ fontSize: 14.5, marginTop: 3, color: isEmpty ? '#9A9A9A' : undefined }}>
        {isEmpty ? empty : children}
      </div>
    </div>
  );
}

export default function ApplicationPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [application, setApplication] = useState<ApplicationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  /*
   * The queue this candidate was opened from, carried in the URL by the list.
   *
   * It is what makes a hundred applications workable: Back returns to the
   * same filtered, sorted list rather than the default view, and Previous and
   * Next walk that list without going through it at all.
   */
  const router = useRouter();
  const [queue, setQueue] = useState<QueueParams>(DEFAULT_QUEUE);
  const [neighbours, setNeighbours] = useState<ApplicationSummary[] | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setQueue(readQueue(new URLSearchParams(window.location.search)));
  }, []);

  // The same list the queue screen shows, asked for the same way, so the
  // position and the neighbours match what the reviewer just came from.
  useEffect(() => {
    let cancelled = false;
    fetch(`${siteConfig.apiUrl}/api/admin/applications?${queueApiQuery(queue)}`, {
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.applications) return;
        const rows: ApplicationSummary[] = queue.openOnly
          ? d.applications.filter((a: ApplicationSummary) => isApplicationOpen(a.status))
          : d.applications;
        setNeighbours(rows);
      })
      // Silent: queue navigation is a convenience on top of a screen that
      // works without it, and an error banner about it would be noise over
      // the candidate's actual details.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [queue]);

  const position = neighbours?.findIndex((a) => a.id === id) ?? -1;
  const previous = position > 0 ? neighbours?.[position - 1] : undefined;
  const next =
    position >= 0 && neighbours && position < neighbours.length - 1
      ? neighbours[position + 1]
      : undefined;

  const go = useCallback(
    (target: ApplicationSummary | undefined) => {
      if (target) router.push(queueHref(queue, target.id));
    },
    [router, queue],
  );

  /*
   * Keyboard, for the reviewer working straight down a backlog.
   *
   * Guarded on the focused element: these are plain letters, and firing them
   * while somebody is halfway through typing an internal note would navigate
   * away and lose it.
   */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      const tag = el?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if ((el as HTMLElement | null)?.isContentEditable) return;
      if (e.key === 'j') go(next);
      if (e.key === 'k') go(previous);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, next, previous]);

  useEffect(() => {
    let cancelled = false;

    fetch(`${siteConfig.apiUrl}/api/admin/applications/${id}`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 401) {
          window.location.href = '/admin/login';
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (cancelled || !d?.application) return;
        setApplication(d.application);
        setNotes(d.application.notes ?? '');
      })
      .catch(() => setError('Could not reach the server.'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function changeStatus(status: ApplicationStatusValue) {
    if (!application) return;
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/admin/applications/${id}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Could not change that status.');
        return;
      }
      setApplication({ ...application, status });
      setNotice(`Moved to "${APPLICATION_STATUS_LABEL[status]}".`);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setSaving(false);
    }
  }

  async function saveNotes() {
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/admin/applications/${id}/notes`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Could not save that note.');
        return;
      }
      setNotice('Note saved.');
    } catch {
      setError('Could not reach the server.');
    } finally {
      setSaving(false);
    }
  }

  /**
   * Erase the candidate's record and their CV.
   *
   * Two confirmations, naming the person: this is the one control in the
   * console that destroys someone else's personal information, and it is
   * irreversible. It exists because a candidate who asks for their CV to be
   * deleted is entitled to have it deleted.
   */
  async function deleteApplication() {
    if (!application) return;
    if (
      !window.confirm(
        `Permanently delete ${application.fullName}'s application and CV? This cannot be undone.`,
      )
    ) {
      return;
    }
    if (!window.confirm('Last check — the CV file will be erased from storage. Continue?')) return;

    setSaving(true);
    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/admin/applications/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'x-csrf-token': csrfToken() },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Could not delete that application.');
        return;
      }
      window.location.href = queueHref(queue);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading…</p>;
  if (!application) {
    return (
      <section className="admin-card">
        <p>That application could not be found. It may have been deleted.</p>
        <Link className="btn btn-outline btn-sm" href={queueHref(queue)}>
          Back to applications
        </Link>
      </section>
    );
  }

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 style={{ fontSize: 26, margin: 0 }}>{application.fullName}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--gray)' }}>
            Applied for{' '}
            <Link href={`/careers/${application.job.slug}`}>{application.job.title}</Link> ·{' '}
            {dateTimeFmt.format(new Date(application.submittedAt))}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Link className="btn btn-outline btn-sm" href={queueHref(queue)}>
            Back to the queue
          </Link>

          {/*
            Walking the queue without returning to it. The position is shown
            because "next" with no sense of how many are left is a treadmill —
            somebody working a backlog needs to see it shrinking.
          */}
          {position >= 0 && neighbours && neighbours.length > 1 && (
            <>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={!previous}
                onClick={() => go(previous)}
                title={previous ? `Previous: ${previous.fullName} (k)` : 'This is the first one'}
              >
                ‹ Previous
              </button>
              <span style={{ fontSize: 13, color: 'var(--gray)', whiteSpace: 'nowrap' }}>
                {position + 1} of {neighbours.length}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={!next}
                onClick={() => go(next)}
                title={next ? `Next: ${next.fullName} (j)` : 'This is the last one'}
              >
                Next ›
              </button>
            </>
          )}
          <a
            className="btn btn-primary btn-sm"
            href={`${siteConfig.apiUrl}/api/admin/applications/${application.id}/cv`}
            target="_blank"
            rel="noreferrer"
          >
            Download CV
          </a>
        </div>
      </div>

      {error && (
        <div className="form-status error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="form-status success" role="status">
          {notice}
        </div>
      )}

      {/*
        Above the form fields on purpose. The first question anybody has about
        an application is whether the person can do the job, and until now the
        only way to find out was to download a file. Everything below this —
        notice period, salary, provenance — matters after that question, not
        before it.
      */}
      <CvInsightPanel applicationId={application.id} jobTitle={application.job.title} />

      <section className="admin-card">
        <h2>Where this is up to</h2>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={application.status}
              disabled={saving}
              onChange={(e) => changeStatus(e.target.value as ApplicationStatusValue)}
            >
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {APPLICATION_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            {application.statusChangedAt && (
              <p style={{ fontSize: 12.5, color: 'var(--gray)', margin: '6px 0 0' }}>
                Last changed {dateTimeFmt.format(new Date(application.statusChangedAt))}
                {application.statusChangedBy ? ` by ${application.statusChangedBy.name}` : ''}.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="admin-card">
        <h2>Everything they submitted</h2>
        <p style={{ fontSize: 13, color: 'var(--gray)', margin: '0 0 14px' }}>
          Every field from the application form. The CV is read above as text; download it for the
          document itself. Either way, reading it is recorded against your account.
        </p>
        <div className="form-row">
          <div className="form-field">
            <Field label="Email">
              <a href={`mailto:${application.email}?subject=${encodeURIComponent(`Your application — ${application.job.title}`)}`}>
                {application.email}
              </a>
            </Field>
            <Field label="Phone">
              <a href={`tel:${application.phone.replace(/[^\d+]/g, '')}`}>{application.phone}</a>
            </Field>
            <Field label="Based in">{application.location}</Field>
          </div>
          <div className="form-field">
            <Field label="Notice period">{application.noticePeriod}</Field>
            <Field label="Salary expectation">{application.expectedSalary}</Field>
            <Field label="LinkedIn">
              {application.linkedinUrl ? (
                <a href={application.linkedinUrl} target="_blank" rel="noreferrer nofollow">
                  {application.linkedinUrl}
                </a>
              ) : null}
            </Field>
          </div>
        </div>

        <Field label="CV">
          {application.cvOriginalName} · {fileSize(application.cvBytes)}
        </Field>

        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', color: '#605E5C', marginBottom: 6 }}>
            What they wrote
          </div>
          {application.coverNote ? (
            <div
              style={{
                background: '#F8FAFC',
                borderLeft: '3px solid var(--orange)',
                padding: '14px 16px',
                fontSize: 14.5,
                lineHeight: 1.65,
                // The candidate typed paragraphs; they are preserved rather
                // than collapsed into one block of text.
                whiteSpace: 'pre-wrap',
              }}
            >
              {application.coverNote}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: '#9A9A9A', margin: 0 }}>
              They did not write a note — the field is optional.
            </p>
          )}
        </div>
      </section>

      <section className="admin-card">
        <h2>Internal note</h2>
        <p style={{ fontSize: 13, color: 'var(--gray)', margin: '0 0 10px' }}>
          Shared with everyone who can see this screen, and never with the candidate. Write what the
          next person needs to know — who has called, what was agreed.
        </p>
        <div className="form-row">
          <div className="form-field full">
            <label htmlFor="notes" className="sr-only">
              Internal note
            </label>
            <textarea
              id="notes"
              rows={6}
              value={notes}
              maxLength={8000}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <button className="btn btn-primary btn-sm" type="button" onClick={saveNotes} disabled={saving}>
          {saving ? 'Saving…' : 'Save note'}
        </button>
      </section>

      <section className="admin-card">
        <h2>Record</h2>
        <div className="form-row">
          <div className="form-field">
            <Field label="Consent given">
              {dateTimeFmt.format(new Date(application.consentAt))}
            </Field>
            <Field label="Confirmation emailed">
              {application.acknowledgedAt
                ? dateTimeFmt.format(new Date(application.acknowledgedAt))
                : 'Not sent — the candidate has had no acknowledgement'}
            </Field>
          </div>
          <div className="form-field">
            <Field label="Landed on">{application.landingPath}</Field>
            <Field label="Came from">{application.referrer}</Field>
            <Field label="IP address">{application.ip}</Field>
          </div>
        </div>
      </section>

      <section className="admin-card" style={{ borderColor: '#E8C4C4' }}>
        <h2>Delete</h2>
        <p style={{ fontSize: 13.5, color: 'var(--gray)', margin: '0 0 12px' }}>
          Erases this application and the CV file. Use it when a candidate asks us to remove their
          details — it is the only way to honour that request, and it cannot be undone.
        </p>
        <button className="btn btn-outline btn-sm" type="button" onClick={deleteApplication} disabled={saving}>
          Delete this application and CV
        </button>
      </section>
    </>
  );
}
