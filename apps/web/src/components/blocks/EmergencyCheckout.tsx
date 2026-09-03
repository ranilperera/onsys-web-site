'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { siteConfig } from '@/lib/config';

interface SummaryRow {
  label: string;
  value: string;
}

export interface EmergencyCheckoutProps {
  /**
   * 'contact' captures details and books a Teams session. 'payment' sends the
   * same details through Stripe first — wired and ready for prepaid hour
   * bundles, not used by the emergency page.
   */
  mode?: 'contact' | 'payment';
  eyebrow?: string;
  heading: string;
  body?: string;
  summary?: { title: string; rows: SummaryRow[]; note?: string };
  steps: Array<{ title: string; body: string }>;
}

type Phase = 'form' | 'redirecting' | 'confirming' | 'paid' | 'cancelled' | 'received';

/**
 * Prepaid emergency support: details, payment, then how to reach a consultant.
 *
 * The phone number stays visible at every step. Someone whose production
 * database is down should never be more than one tap from a person, including
 * when our own payment page is the thing failing them.
 */
export function EmergencyCheckout({
  mode = 'contact',
  eyebrow,
  heading,
  body,
  summary,
  steps,
}: EmergencyCheckoutProps) {
  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [paidName, setPaidName] = useState<string | null>(null);

  const checkStatus = useCallback(async (sessionId: string) => {
    // The webhook, not this redirect, is what marks a block paid — a customer
    // who closed the tab on Stripe has still paid. So the landing page polls
    // briefly rather than trusting the query string it was handed.
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        const res = await fetch(
          `${siteConfig.apiUrl}/api/emergency/status/${encodeURIComponent(sessionId)}`,
        );
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'PAID') {
            setPaidName(data.name ?? null);
            setPhase('paid');
            return;
          }
        }
      } catch {
        /* keep trying — the webhook may still be in flight */
      }
      await new Promise((r) => setTimeout(r, 1500));
    }

    // Payment probably succeeded and the webhook is lagging. Never tell someone
    // mid-outage that their payment failed on this evidence.
    setPhase('paid');
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('cancelled')) {
      setPhase('cancelled');
      return;
    }
    const sessionId = params.get('session_id');
    if (params.get('paid') && sessionId) {
      setPhase('confirming');
      void checkStatus(sessionId);
    }
  }, [checkStatus]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/emergency/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          company: form.get('company') || undefined,
          phone: form.get('phone'),
          email: form.get('email'),
          summary: form.get('summary') || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? `Something went wrong. Please call ${siteConfig.phone}.`);
        return;
      }

      setPaidName(String(form.get('name') || '') || null);

      if (mode === 'payment') {
        const checkout = await fetch(`${siteConfig.apiUrl}/api/emergency/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: data.requestId }),
        });
        const session = await checkout.json();
        if (!checkout.ok || !session.checkoutUrl) {
          setError(session.error ?? `Something went wrong. Please call ${siteConfig.phone}.`);
          return;
        }
        setPhase('redirecting');
        window.location.href = session.checkoutUrl;
        return;
      }

      setPhase('received');
    } catch {
      setError(`We could not send that just now. Please call ${siteConfig.phone}.`);
    } finally {
      setBusy(false);
    }
  }

  if (phase === 'received') {
    return (
      <section className="section" id="get-help-now">
        <div className="wrap emergency-result paid">
          <span className="eyebrow">Request received</span>
          <h2>{paidName ? `Thanks ${paidName} — we have your details` : 'Thanks — we have your details'}</h2>
          <p>
            A senior consultant has been alerted and will come back to you. If production is down
            right now, calling is faster than waiting for us — the line is answered 24/7.
          </p>
          <a className="btn btn-primary btn-lg" href={`tel:${siteConfig.phoneE164}`}>
            Call {siteConfig.phone}
          </a>
          <p className="emergency-alt">
            Or <a href="/book">book a Teams session</a> and you&rsquo;ll get a meeting link by
            email. Assignment is subject to a consultant being available.
          </p>
        </div>
      </section>
    );
  }

  if (phase === 'confirming') {
    return (
      <section className="section">
        <div className="wrap emergency-result">
          <h2>Confirming your payment…</h2>
          <p>This takes a few seconds. Please don&rsquo;t close this page.</p>
        </div>
      </section>
    );
  }

  if (phase === 'paid') {
    return (
      <section className="section">
        <div className="wrap emergency-result paid">
          <span className="eyebrow">Payment received</span>
          <h2>{paidName ? `Thanks ${paidName} — call us now` : 'Thanks — call us now'}</h2>
          <p>
            Your 4-hour block is active and a receipt is on its way to your inbox. The fastest thing
            you can do next is pick up the phone.
          </p>
          <a className="btn btn-primary btn-lg" href={`tel:${siteConfig.phoneE164}`}>
            Call {siteConfig.phone}
          </a>
          <p className="emergency-alt">
            Prefer a scheduled session with screen sharing?{' '}
            <a href="/book">Book a Teams appointment</a> and the invitation will arrive by email.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="section" id="get-help-now">
      <div className="wrap">
        <div className="section-head">
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h2>{heading}</h2>
          {body && <p className="section-lede">{body}</p>}
        </div>

        {phase === 'cancelled' && (
          <div className="form-status error" role="alert">
            Payment was cancelled, so nothing has been charged. If production is down right now, call{' '}
            <a href={`tel:${siteConfig.phoneE164}`}>{siteConfig.phone}</a> rather than waiting.
          </div>
        )}

        <div className="emergency-grid">
          <form className="emergency-form" onSubmit={submit}>
            <h3>1. Your details</h3>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="em-name">Name *</label>
                <input id="em-name" name="name" required maxLength={120} autoComplete="name" />
              </div>
              <div className="form-field">
                <label htmlFor="em-company">Company</label>
                <input
                  id="em-company"
                  name="company"
                  maxLength={160}
                  autoComplete="organization"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="em-phone">Phone *</label>
                <input
                  id="em-phone"
                  name="phone"
                  type="tel"
                  required
                  maxLength={40}
                  autoComplete="tel"
                  placeholder="04xx xxx xxx"
                />
              </div>
              <div className="form-field">
                <label htmlFor="em-email">Email *</label>
                <input
                  id="em-email"
                  name="email"
                  type="email"
                  required
                  maxLength={200}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field full">
                <label htmlFor="em-summary">What&rsquo;s happening? (optional)</label>
                <textarea
                  id="em-summary"
                  name="summary"
                  rows={3}
                  maxLength={2000}
                  placeholder="Instance name, the error, and when it started — anything you have."
                />
              </div>
            </div>

            {error && (
              <div className="form-status error" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {mode === 'payment'
                ? busy || phase === 'redirecting'
                  ? 'Opening secure checkout…'
                  : 'Continue to payment'
                : busy
                  ? 'Sending…'
                  : 'Request a consultant'}
            </button>

            <p className="emergency-fineprint">
              {mode === 'payment' ? (
                <>
                  Payment is handled by Stripe — we never see your card details. If you would rather
                  not pay online, call <a href={`tel:${siteConfig.phoneE164}`}>{siteConfig.phone}</a>{' '}
                  and we will arrange an invoice.
                </>
              ) : (
                <>
                  No payment now — we will confirm scope and cost before any work starts. If
                  production is down this second, call{' '}
                  <a href={`tel:${siteConfig.phoneE164}`}>{siteConfig.phone}</a> instead of waiting
                  on this form.
                </>
              )}
            </p>
          </form>

          <aside className="emergency-aside">
            {summary && (
              <div className={`emergency-summary${mode === 'payment' ? ' with-total' : ''}`}>
                <h3>{summary.title}</h3>
                <dl>
                  {summary.rows.map((r) => (
                    <div key={r.label}>
                      <dt>{r.label}</dt>
                      <dd>{r.value}</dd>
                    </div>
                  ))}
                </dl>
                {summary.note && <p className="emergency-note">{summary.note}</p>}
              </div>
            )}

            {steps.length > 0 && (
              <ol className="emergency-steps">
                {steps.map((s) => (
                  <li key={s.title}>
                    {/* Title and body share one grid cell. As separate children
                        they are separate grid items, and the body drops into
                        the next row's first column — the 32px counter track —
                        which wraps it to one word per line. */}
                    <div className="emergency-step-text">
                      <strong>{s.title}</strong>
                      <span>{s.body}</span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
