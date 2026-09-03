'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { siteConfig } from '@/lib/config';

export interface HealthCheckBookingProps {
  eyebrow?: string;
  heading: string;
  body?: string;
  note?: string;
}

/**
 * Free health check request.
 *
 * The SQL Server version is a required field because it changes what the check
 * finds — which DMVs exist, whether the build is past end of support, what the
 * edition limits. "Not sure" is offered as an answer on purpose: someone who
 * cannot name their version is exactly who most needs this, and making the
 * field a wall would lose that lead.
 */
const SQL_VERSIONS = [
  'SQL Server 2022',
  'SQL Server 2019',
  'SQL Server 2017',
  'SQL Server 2016',
  'SQL Server 2014',
  'SQL Server 2012 or older',
  'Azure SQL Managed Instance',
  'Azure SQL Database',
  'Amazon RDS for SQL Server',
  'A mix of versions',
  'Not sure',
];

export function HealthCheckBooking({ eyebrow, heading, body, note }: HealthCheckBookingProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string; earliest: string } | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const name = String(form.get('name') ?? '');

    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/health-check/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          company: form.get('company'),
          email: form.get('email'),
          phone: form.get('phone'),
          sqlVersion: form.get('sqlVersion'),
          instanceCount: form.get('instanceCount') || undefined,
          notes: form.get('notes') || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? `Something went wrong. Please call ${siteConfig.phone}.`);
        return;
      }
      setDone({ name, earliest: data.earliest });
    } catch {
      setError(`We could not send that just now. Please call ${siteConfig.phone}.`);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <section className="section" id="request-health-check">
        <div className="wrap emergency-result paid">
          <span className="eyebrow">Request received</span>
          <h2>Thanks {done.name} — now read the scripts</h2>
          <p>
            A senior DBA will be in touch to confirm a time, and a confirmation is on its way to
            your inbox. The most useful thing you can do next is review the queries we will run.
          </p>
          <a className="btn btn-primary btn-lg" href="/onsys-sql-server-health-check.html">
            Open the script bundle
          </a>
          <p className="emergency-alt">
            Earliest session:{' '}
            <strong>
              {new Date(done.earliest).toLocaleDateString('en-AU', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </strong>
            . If production is down right now, call{' '}
            <a href={`tel:${siteConfig.phoneE164}`}>{siteConfig.phone}</a> instead of waiting.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="section" id="request-health-check">
      <div className="wrap">
        <div className="section-head">
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h2>{heading}</h2>
          {body && <p className="section-lede">{body}</p>}
        </div>

        <div className="emergency-grid">
          <form className="emergency-form" onSubmit={submit}>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="hc-name">Your name *</label>
                <input id="hc-name" name="name" required maxLength={120} autoComplete="name" />
              </div>
              <div className="form-field">
                <label htmlFor="hc-company">Company *</label>
                <input
                  id="hc-company"
                  name="company"
                  required
                  maxLength={160}
                  autoComplete="organization"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="hc-email">Work email *</label>
                <input
                  id="hc-email"
                  name="email"
                  type="email"
                  required
                  maxLength={200}
                  autoComplete="email"
                />
              </div>
              <div className="form-field">
                <label htmlFor="hc-phone">Phone *</label>
                <input
                  id="hc-phone"
                  name="phone"
                  type="tel"
                  required
                  maxLength={40}
                  autoComplete="tel"
                  placeholder="03 xxxx xxxx"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="hc-version">SQL Server version *</label>
                <select id="hc-version" name="sqlVersion" required defaultValue="">
                  <option value="" disabled>
                    Select a version…
                  </option>
                  {SQL_VERSIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="hc-instances">How many instances?</label>
                <input
                  id="hc-instances"
                  name="instanceCount"
                  maxLength={40}
                  placeholder="e.g. 4, or not sure"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field full">
                <label htmlFor="hc-notes">Anything we should know? (optional)</label>
                <textarea
                  id="hc-notes"
                  name="notes"
                  rows={3}
                  maxLength={2000}
                  placeholder="Which instance you want reviewed, any change-approval process we should plan around."
                />
              </div>
            </div>

            {error && (
              <div className="form-status error" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Sending…' : 'Request my free health check'}
            </button>

            <p className="emergency-fineprint">
              No charge and no obligation. We never ask for a login to your instance — you run the
              scripts, or we run them together on a screen share while you watch.
            </p>
          </form>

          <aside className="emergency-aside">
            <div className="emergency-summary">
              <h3>What happens next</h3>
              <dl>
                <div>
                  <dt>1. You get the scripts</dt>
                  <dd>Immediately</dd>
                </div>
                <div>
                  <dt>2. Teams session</dt>
                  <dd>About a week out</dd>
                </div>
                <div>
                  <dt>3. Collection</dt>
                  <dd>~20 minutes</dd>
                </div>
                <div>
                  <dt>4. Written report</dt>
                  <dd>3 business days</dd>
                </div>
              </dl>
              {note && <p className="emergency-note">{note}</p>}
            </div>

            <ol className="emergency-steps">
              <li>
                <div className="emergency-step-text">
                  <strong>Read before you run</strong>
                  <span>
                    Every query is published up front.{' '}
                    <Link href="/onsys-sql-server-health-check.html">Open the bundle</Link> and
                    review it with whoever signs off on change.
                  </span>
                </div>
              </li>
              <li>
                <div className="emergency-step-text">
                  <strong>Read-only, always</strong>
                  <span>
                    Nothing writes, nothing changes configuration, and nothing reads your business
                    data — only system views and DMVs.
                  </span>
                </div>
              </li>
              <li>
                <div className="emergency-step-text">
                  <strong>Yours either way</strong>
                  <span>
                    You keep the report and the scripts whether or not you engage us for any of the
                    remediation.
                  </span>
                </div>
              </li>
            </ol>
          </aside>
        </div>
      </div>
    </section>
  );
}
