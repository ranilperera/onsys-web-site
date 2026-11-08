'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { leadInputSchema } from '@onsys/shared';
import { siteConfig } from '@/lib/config';
import { getAttribution } from '@/lib/attribution';
import { GOALS, trackGoal } from '@/lib/analytics';
import { Turnstile } from './Turnstile';

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

const EMERGENCY_PATH = '/emergency-database-support';

export function ContactForm({ heading, body }: { heading?: string; body?: string }) {
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [captchaToken, setCaptchaToken] = useState('');
  // Bumping this asks the widget for a fresh token: they are single-use, so a
  // resubmit after a validation error would otherwise be rejected.
  const [captchaNonce, setCaptchaNonce] = useState(0);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    // Capture the element before any await. React nulls `currentTarget` once
    // the handler yields, so touching it after the fetch throws a TypeError
    // that the catch below reports as a network failure — telling the visitor
    // the submission failed when the lead was in fact created.
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const payload = {
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      company: String(form.get('company') ?? ''),
      phone: String(form.get('phone') ?? ''),
      service: String(form.get('service') ?? ''),
      message: String(form.get('message') ?? ''),
      website: String(form.get('website') ?? ''), // honeypot
      captchaToken,
      // First-touch attribution, captured on landing. Reading the current URL
      // here instead lost the campaign for anyone who arrived on one page and
      // submitted from another, which is most of them.
      ...getAttribution(),
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
      trackGoal(GOALS.contact);
      formEl.reset();
    } catch {
      setState('error');
      setMessage(
        `We couldn't send that just now. Please email ${siteConfig.email} or call ${siteConfig.phone}.`,
      );
    }
  }

  const pathname = usePathname();

  const err = (field: string) =>
    errors[field] ? (
      <span className="field-error" id={`${field}-error`} role="alert">
        {errors[field]}
      </span>
    ) : null;

  return (
    <div className="contact-grid">
      <div className="form-card">
        {heading && <h2 className="form-card-title">{heading}</h2>}
        {body && <p className="form-card-body">{body}</p>}

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

              <Turnstile onToken={setCaptchaToken} resetKey={captchaNonce} />

              <button className="btn btn-primary btn-block" type="submit" disabled={state === 'submitting'}>
                {state === 'submitting' ? 'Sending…' : 'Send message'}
              </button>
              <p className="form-note">
                <svg aria-hidden="true">
                  <use href="#i-clock" />
                </svg>
                A senior consultant reads every enquiry and replies within one business day.
              </p>
            </form>
          </>
        )}
      </div>

      <aside className="contact-side">
        <div className="contact-panel">
          <p className="contact-panel-eyebrow">Prefer to talk?</p>
          <a className="contact-panel-phone" href={`tel:${siteConfig.phoneE164}`}>
            <svg aria-hidden="true">
              <use href="#i-phone" />
            </svg>
            {siteConfig.phone}
          </a>
          <ul className="contact-panel-list">
            <li>
              <svg aria-hidden="true">
                <use href="#i-mail" />
              </svg>
              <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
            </li>
            <li>
              <svg aria-hidden="true">
                <use href="#i-pin" />
              </svg>
              <span>
                {siteConfig.address.street}, {siteConfig.address.locality}
              </span>
            </li>
            <li>
              <svg aria-hidden="true">
                <use href="#i-clock" />
              </svg>
              <span>Mon–Fri, 9am–5pm AEST · 24/7 for managed service clients</span>
            </li>
          </ul>
          <a className="btn btn-primary btn-block" href={siteConfig.bookingUrl}>
            <svg aria-hidden="true">
              <use href="#i-calendar" />
            </svg>
            Book a free 30-minute call
          </a>
        </div>

        {/* Someone whose production is down should not be filling in a form. */}
        <div className="contact-urgent">
          <span className="contact-urgent-ic" aria-hidden="true">
            <svg>
              <use href="#s-emergency" />
            </svg>
          </span>
          <div>
            <p className="contact-urgent-title">Production down?</p>
            <p>
              Don&rsquo;t wait on email. Call <a href={`tel:${siteConfig.phoneE164}`}>{siteConfig.phone}</a> and
              triage starts on the phone.
            </p>
            {pathname !== EMERGENCY_PATH && (
              <Link className="contact-urgent-link" href={EMERGENCY_PATH}>
                Emergency support ›
              </Link>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
