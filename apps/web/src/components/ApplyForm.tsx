'use client';

import { useState, type FormEvent } from 'react';
import {
  CV_ACCEPT_ATTRIBUTE,
  applicationInputSchema,
  describeCvProblem,
} from '@onsys/shared';
import { siteConfig } from '@/lib/config';
import { getAttribution } from '@/lib/attribution';
import { Turnstile } from './Turnstile';

/**
 * Apply for a job.
 *
 * The form that replaced "email us a CV". Three things shape it:
 *
 *  - It is short. Every field costs completed applications, and the CV already
 *    holds the employment history — so this asks only what we need in order to
 *    reply, to rank, or to arrange a call.
 *  - It validates the file in the browser before uploading. Nothing is more
 *    discouraging than filling in a form, waiting through a 9 MB upload on a
 *    phone connection, and being told the format was wrong.
 *  - It never loses what was typed. A failed submit leaves every field exactly
 *    as it was, because the alternative is a candidate who does not try again.
 */

type FieldErrors = Partial<Record<string, string>>;

export function ApplyForm({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [captchaToken, setCaptchaToken] = useState('');
  // Bumping this asks the widget for a fresh token: they are single-use, so a
  // resubmit after a validation error would otherwise be rejected.
  const [captchaNonce, setCaptchaNonce] = useState(0);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  /** Named so the file input can show what is attached after a failed submit. */
  const [cvName, setCvName] = useState('');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    // Captured before any await: React nulls `currentTarget` once the handler
    // yields, and reading it after the fetch throws a TypeError that the catch
    // below would report as a network failure — telling a candidate their
    // application failed when it had in fact been stored.
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const cv = form.get('cv');
    const file = cv instanceof File && cv.size > 0 ? cv : null;

    const attribution = getAttribution();
    const payload = {
      jobId,
      fullName: String(form.get('fullName') ?? ''),
      email: String(form.get('email') ?? ''),
      phone: String(form.get('phone') ?? ''),
      location: String(form.get('location') ?? ''),
      noticePeriod: String(form.get('noticePeriod') ?? ''),
      expectedSalary: String(form.get('expectedSalary') ?? ''),
      linkedinUrl: String(form.get('linkedinUrl') ?? ''),
      coverNote: String(form.get('coverNote') ?? ''),
      consent: form.get('consent') === 'on',
      referrer: attribution.referrer ?? '',
      landingPath: attribution.landingPath ?? '',
    };

    // The same schema the API parses, so the two cannot drift apart.
    const parsed = applicationInputSchema.safeParse(payload);
    const fieldErrors: FieldErrors = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
    }

    // The file is checked here rather than in the schema: a File object does
    // not exist on the server, and the server has the bytes to inspect while
    // the browser only has the name and size.
    const cvProblem = file
      ? describeCvProblem({ filename: file.name, mimeType: file.type, size: file.size })
      : 'Attach your CV as a PDF or Word document.';
    if (cvProblem) fieldErrors.cv = cvProblem;

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      setState('error');
      setMessage('Please check the highlighted fields.');
      return;
    }

    setState('submitting');

    // multipart, not JSON: a base64-encoded 10 MB file is a 13 MB request body
    // and gives up streaming for nothing.
    const body = new FormData();
    for (const [key, value] of Object.entries(parsed.success ? parsed.data : payload)) {
      body.append(key, String(value));
    }
    body.append('cv', file as File);
    body.append('captchaToken', captchaToken);
    body.append('website', String(form.get('website') ?? '')); // honeypot

    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/applications`, {
        method: 'POST',
        // No Content-Type header: the browser sets it with the multipart
        // boundary, and setting it by hand produces a body nothing can parse.
        body,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setState('error');
        setMessage(data.error ?? 'Something went wrong. Please try again.');
        // A used captcha token cannot be replayed, so the next attempt needs a
        // fresh one — without this, every retry fails for a new reason.
        setCaptchaNonce((n) => n + 1);
        return;
      }

      setState('success');
      setMessage(data.message ?? "Thanks — your application is in.");
      formEl.reset();
      setCvName('');
    } catch {
      setState('error');
      setMessage(
        'We could not send that just now — your connection may have dropped mid-upload. Nothing has been lost; please try again.',
      );
      setCaptchaNonce((n) => n + 1);
    }
  }

  const err = (field: string) =>
    errors[field] ? (
      <span className="field-error" id={`${field}-error`} role="alert">
        {errors[field]}
      </span>
    ) : null;

  if (state === 'success') {
    return (
      <div className="form-card">
        <div className="form-status success" role="status">
          {message}
        </div>
        <p style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--gray)', margin: '16px 0 0' }}>
          We have emailed you a confirmation. If your experience lines up with what the role needs,
          someone will contact you directly — you do not need to send anything else.
        </p>
      </div>
    );
  }

  return (
    <div className="form-card">
      {state === 'error' && message && (
        <div className="form-status error" role="alert">
          {message}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="fullName">Full name *</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              autoComplete="name"
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? 'fullName-error' : undefined}
            />
            {err('fullName')}
          </div>
          <div className="form-field">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {err('email')}
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="phone">Phone *</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              placeholder="+61 4xx xxx xxx"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'phone-error' : undefined}
            />
            {err('phone')}
          </div>
          <div className="form-field">
            <label htmlFor="location">Where are you based? *</label>
            <input
              id="location"
              name="location"
              type="text"
              required
              placeholder="Melbourne, Australia"
              aria-invalid={Boolean(errors.location)}
              aria-describedby={errors.location ? 'location-error' : undefined}
            />
            {err('location')}
          </div>
        </div>

        <div className="form-row">
          <div className="form-field full">
            <label htmlFor="cv">Your CV *</label>
            <input
              id="cv"
              name="cv"
              type="file"
              required
              accept={CV_ACCEPT_ATTRIBUTE}
              onChange={(e) => {
                const picked = e.target.files?.[0];
                setCvName(picked?.name ?? '');
                // Clear a stale complaint the moment a different file is
                // chosen, rather than leaving it under the input until submit.
                setErrors((prev) => ({ ...prev, cv: undefined }));
              }}
              aria-invalid={Boolean(errors.cv)}
              aria-describedby={errors.cv ? 'cv-error' : 'cv-help'}
            />
            {err('cv')}
            <p id="cv-help" style={{ fontSize: 12.5, color: 'var(--gray)', margin: '6px 0 0' }}>
              PDF or Word, up to 10 MB. {cvName ? `Attached: ${cvName}` : ''}
            </p>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="noticePeriod">Notice period</label>
            <input id="noticePeriod" name="noticePeriod" type="text" placeholder="4 weeks" />
          </div>
          <div className="form-field">
            <label htmlFor="expectedSalary">Salary expectation</label>
            <input id="expectedSalary" name="expectedSalary" type="text" placeholder="Optional" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field full">
            <label htmlFor="linkedinUrl">LinkedIn profile</label>
            <input
              id="linkedinUrl"
              name="linkedinUrl"
              type="url"
              placeholder="https://www.linkedin.com/in/…"
              aria-invalid={Boolean(errors.linkedinUrl)}
              aria-describedby={errors.linkedinUrl ? 'linkedinUrl-error' : undefined}
            />
            {err('linkedinUrl')}
          </div>
        </div>

        <div className="form-row">
          <div className="form-field full">
            <label htmlFor="coverNote">Anything you want us to know</label>
            <textarea
              id="coverNote"
              name="coverNote"
              rows={5}
              placeholder={`Why this role, and what you have done that is closest to it. A few sentences is plenty.`}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field full">
            <label htmlFor="consent" className="checkbox-label">
              <input
                id="consent"
                name="consent"
                type="checkbox"
                required
                aria-invalid={Boolean(errors.consent)}
                aria-describedby={errors.consent ? 'consent-error' : undefined}
              />
              <span>
                I agree that Onsys may store my CV and contact details to assess this application
                and to consider me for similar roles. I can ask for them to be deleted at any time.
              </span>
            </label>
            {err('consent')}
          </div>
        </div>

        {/* Honeypot — hidden from humans and assistive tech, catnip for bots. */}
        <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
          <label htmlFor="website">Leave this field empty</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <Turnstile onToken={setCaptchaToken} resetKey={captchaNonce} />

        <button className="btn btn-primary btn-block" type="submit" disabled={state === 'submitting'}>
          {state === 'submitting' ? 'Sending your application…' : `Apply for ${jobTitle}`}
        </button>
      </form>
    </div>
  );
}
