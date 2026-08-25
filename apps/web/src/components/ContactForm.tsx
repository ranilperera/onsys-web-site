'use client';

import { useState, type FormEvent } from 'react';
import { leadInputSchema } from '@onsys/shared';
import { siteConfig } from '@/lib/config';

const SERVICES = [
  'Managed Database Services',
  'On-Call / Ad-hoc DBA Support',
  'Database Consultancy',
  'High Availability & DR',
  'Cloud Migration & Consultancy',
  'Software Development',
  'Cyber Security Services',
  'Other / not sure yet',
];

type FieldErrors = Partial<Record<string, string>>;

export function ContactForm({ heading, body }: { heading?: string; body?: string }) {
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      company: String(form.get('company') ?? ''),
      phone: String(form.get('phone') ?? ''),
      service: String(form.get('service') ?? ''),
      message: String(form.get('message') ?? ''),
      website: String(form.get('website') ?? ''), // honeypot
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      utmSource: new URLSearchParams(window.location.search).get('utm_source') ?? undefined,
      utmMedium: new URLSearchParams(window.location.search).get('utm_medium') ?? undefined,
      utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') ?? undefined,
    };

    // Validate client-side against the same schema the API uses.
    const parsed = leadInputSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      setState('error');
      setMessage('Please check the highlighted fields.');
      return;
    }

    setState('submitting');

    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const data = await res.json();

      if (!res.ok) {
        setState('error');
        setMessage(data.error ?? 'Something went wrong. Please try again or call us.');
        return;
      }

      setState('success');
      setMessage(data.message ?? "Thanks — we've received your enquiry.");
      e.currentTarget.reset();
    } catch {
      setState('error');
      setMessage(
        `We couldn't send that just now. Please email ${siteConfig.email} or call ${siteConfig.phone}.`,
      );
    }
  }

  const err = (field: string) =>
    errors[field] ? (
      <span className="field-error" id={`${field}-error`} role="alert">
        {errors[field]}
      </span>
    ) : null;

  return (
    <div className="contact-grid">
      <div className="form-card">
        {heading && <h2 style={{ marginBottom: 6, fontSize: 22 }}>{heading}</h2>}
        {body && <p style={{ color: 'var(--gray)', fontSize: 13.5, marginBottom: 22 }}>{body}</p>}

        {state === 'success' ? (
          <div className="form-status success" role="status">
            {message}
          </div>
        ) : (
          <>
            {state === 'error' && message && (
              <div className="form-status error" role="alert">
                {message}
              </div>
            )}

            <form onSubmit={onSubmit} noValidate>
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="name">Full name *</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Jane Smith"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'name-error' : undefined}
                  />
                  {err('name')}
                </div>
                <div className="form-field">
                  <label htmlFor="email">Email *</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="jane@company.com.au"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                  />
                  {err('email')}
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="company">Company</label>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    autoComplete="organization"
                    placeholder="Company Pty Ltd"
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="phone">Phone</label>
                  <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="04xx xxx xxx" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field full">
                  <label htmlFor="service">Service of interest</label>
                  <select id="service" name="service" defaultValue={SERVICES[0]}>
                    {SERVICES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-field full">
                  <label htmlFor="message">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    placeholder="Tell us a bit about your environment and what you need help with"
                  />
                </div>
              </div>

              {/* Honeypot — hidden from humans and assistive tech, catnip for bots. */}
              <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
                <label htmlFor="website">Leave this field empty</label>
                <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>

              <button className="btn btn-primary btn-block" type="submit" disabled={state === 'submitting'}>
                {state === 'submitting' ? 'Sending…' : 'Send message'}
              </button>
            </form>
          </>
        )}
      </div>

      <div>
        <div className="contact-info-card">
          <div className="ic">
            <svg style={{ width: 20, height: 20, color: 'var(--navy)' }} aria-hidden="true">
              <use href="#i-pin" />
            </svg>
          </div>
          <div>
            <h3 style={{ fontSize: 14.5, marginBottom: 4 }}>Melbourne office</h3>
            <p>
              {siteConfig.address.street}, {siteConfig.address.locality}, Australia
            </p>
          </div>
        </div>

        <div className="contact-info-card">
          <div className="ic">
            <svg style={{ width: 20, height: 20, color: 'var(--navy)' }} aria-hidden="true">
              <use href="#i-mail" />
            </svg>
          </div>
          <div>
            <h3 style={{ fontSize: 14.5, marginBottom: 4 }}>Email</h3>
            <p>
              <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
            </p>
          </div>
        </div>

        <div className="contact-info-card">
          <div className="ic">
            <svg style={{ width: 20, height: 20, color: 'var(--navy)' }} aria-hidden="true">
              <use href="#i-phone" />
            </svg>
          </div>
          <div>
            <h3 style={{ fontSize: 14.5, marginBottom: 4 }}>Phone</h3>
            <p>
              <a href={`tel:${siteConfig.phoneE164}`}>{siteConfig.phone}</a>
            </p>
          </div>
        </div>

        <div className="contact-info-card">
          <div className="ic">
            <svg style={{ width: 20, height: 20, color: 'var(--navy)' }} aria-hidden="true">
              <use href="#i-clock" />
            </svg>
          </div>
          <div>
            <h3 style={{ fontSize: 14.5, marginBottom: 4 }}>Business hours</h3>
            <p>Mon–Fri, 9am–5pm AEST (24/7 for managed service clients)</p>
          </div>
        </div>

        <a className="btn btn-outline btn-block" href={siteConfig.bookingUrl}>
          Book a Call Instead
        </a>
      </div>
    </div>
  );
}
