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
  const [done, setDone] = useState<{
    name: string;
    collectorUrl: string;
    collectorExpiryDays: number;
    submitTo: string;
    alreadyClaimed: boolean;
  } | null>(null);

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
      setDone({
        name,
        // No default for the URL any more: it carries a one-off token, and a
        // hard-coded fallback would be a dead link rather than a helpful one.
        collectorUrl: data.collectorUrl,
        collectorExpiryDays: data.collectorExpiryDays ?? 30,
        submitTo: data.submitTo ?? siteConfig.email,
        alreadyClaimed: Boolean(data.alreadyClaimed),
      });
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
          <h2>Thanks {done.name} — here is the collector</h2>
          <p>
            Download the script, run it against one SQL Server instance, and send us the zip it
            produces. It is read-only: it queries dynamic management views and catalog views
            only, and writes nothing to your instance.
          </p>

          <ol className="hc-next">
            <li>
              <strong>Download</strong> the collector and, if you would rather read before you
              run, the <a href="/onsys-sql-server-health-check.html">full text of all 20 queries</a>.
            </li>
            <li>
              <strong>Run</strong> it on the database server:{' '}
              <code>.\Invoke-OnsysHealthCheck.ps1 -ServerInstance YOURINSTANCE</code>. It takes
              about 20 minutes and needs Windows PowerShell, which is already there.
            </li>
            <li>
              <strong>Send</strong> the zip to{' '}
              <a href={`mailto:${done.submitTo}`}>{done.submitTo}</a>, quoting your company name.
            </li>
            <li>
              <strong>We analyse it</strong> and book a free call to present the report.
            </li>
          </ol>

          <a className="btn btn-primary btn-lg" href={done.collectorUrl} download>
            Download the collector
          </a>{' '}
          <a className="btn btn-outline btn-lg" href="/onsys-sql-server-health-check.html">
            Read the queries first
          </a>
          <p style={{ fontSize: 13, color: 'var(--gray)', marginTop: 12 }}>
            This download link is yours and stays live for {done.collectorExpiryDays} days. We have
            emailed it to you as well, so you do not have to keep this page open.
          </p>

          {done.alreadyClaimed ? (
            // Said plainly rather than hidden: the free check is one instance per
            // customer, and someone should hear that now rather than after they
            // have spent twenty minutes collecting.
            <p className="emergency-alt">
              Our records show the free check has already been used by someone at your
              organisation. We will still look at what you send, but a second review is a paid
              engagement — a consultant will come back to you with what that involves.
            </p>
          ) : (
            <p className="emergency-alt">
              Once your results reach us we send the written report within{' '}
              <strong>7 business days</strong>, and book a Teams walkthrough within{' '}
              <strong>2 weeks</strong>. The call is free and there is no obligation. If
              production is down right now, call{' '}
              <a href={`tel:${siteConfig.phoneE164}`}>{siteConfig.phone}</a> instead of waiting.
            </p>
          )}
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
                  <dt>1. You get the collector</dt>
                  <dd>Immediately</dd>
                </div>
                <div>
                  <dt>2. You collect</dt>
                  <dd>~20 minutes</dd>
                </div>
                <div>
                  <dt>3. Written report</dt>
                  <dd>Within 7 business days</dd>
                </div>
                <div>
                  <dt>4. Teams walkthrough</dt>
                  <dd>Within 2 weeks</dd>
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
