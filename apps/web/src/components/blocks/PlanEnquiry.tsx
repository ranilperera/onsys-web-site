'use client';

import { useState, type FormEvent } from 'react';
import { leadInputSchema } from '@onsys/shared';
import { siteConfig } from '@/lib/config';
import { getAttribution } from '@/lib/attribution';
import { GOALS, trackGoal } from '@/lib/analytics';
import { Turnstile } from '../Turnstile';

/**
 * Two fields on a plan card, instead of a link to the contact form.
 *
 * Every "Get Started" went to /contact, which asks for name, email, company,
 * phone, service and a message before anyone can find out what a plan would
 * cost them — and then records none of what they were looking at. This asks for
 * a work email and an instance count, and sends the plan name with it.
 *
 * It creates an ordinary Lead, so it inherits the honeypot, the rate limit, the
 * notification email and the Teams card. What it adds is the one thing the
 * contact form could never capture: which plan, and how big.
 */

/** The API requires a name; nobody is typing one into a two-field form. */
const IMPLIED_NAME = 'Plan enquiry';

export function PlanEnquiry({ plan }: { plan: string }) {
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  /*
   * /api/leads enforces the captcha when it is configured, so this form has to
   * supply a token like every other. It was built without one while the captcha
   * was inert, which would have turned every plan enquiry into a 400 the moment
   * the missing TURNSTILE_SITE_KEY was set.
   */
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaNonce, setCaptchaNonce] = useState(0);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Captured before the first await: React nulls currentTarget once the
    // handler yields, and reading it afterwards throws a TypeError that the
    // catch below would report as a network failure — telling someone their
    // enquiry failed when it was in fact created.
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const email = String(form.get('email') ?? '');
    const instanceCount = String(form.get('instanceCount') ?? '');

    const payload = {
      name: IMPLIED_NAME,
      email,
      service: plan,
      plan,
      instanceCount,
      message: `Plan enquiry from the pricing cards: ${plan}${
        instanceCount ? `, ${instanceCount} instance(s)` : ''
      }.`,
      website: String(form.get('website') ?? ''), // honeypot
      captchaToken,
      ...getAttribution(),
    };

    const parsed = leadInputSchema.safeParse(payload);
    if (!parsed.success) {
      setState('error');
      setMessage(parsed.error.issues[0]?.message ?? 'Please check the email address.');
      return;
    }

    setState('submitting');
    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setState('error');
        setCaptchaNonce((n) => n + 1);
        setMessage(data.error ?? `Something went wrong. Please call ${siteConfig.phone}.`);
        return;
      }

      setState('success');
      setMessage(data.message ?? '');
      trackGoal(GOALS.contact, { plan });
      formEl.reset();
    } catch {
      setState('error');
      setMessage(`We could not send that. Please call ${siteConfig.phone}.`);
    }
  }

  if (state === 'success') {
    return (
      <div className="plan-enquiry done" role="status">
        <p>
          <strong>Thanks — that is with us.</strong> A senior consultant will confirm the right
          plan for your instance count within one business day.
        </p>
        <a className="btn btn-outline btn-block btn-sm" href="/book">
          Book a 30-minute sizing call
        </a>
      </div>
    );
  }

  return (
    <form className="plan-enquiry" onSubmit={onSubmit} noValidate>
      <label htmlFor={`pe-email-${plan}`}>Work email</label>
      <input
        id={`pe-email-${plan}`}
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@company.com.au"
      />

      <label htmlFor={`pe-count-${plan}`}>How many instances?</label>
      <input
        id={`pe-count-${plan}`}
        name="instanceCount"
        inputMode="numeric"
        placeholder="e.g. 6"
      />

      {/* Anti-spam. Real visitors never see this field. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      <Turnstile onToken={setCaptchaToken} resetKey={captchaNonce} />

      <button className="btn btn-primary btn-block btn-sm" type="submit" disabled={state === 'submitting'}>
        {state === 'submitting' ? 'Sending…' : `Ask about ${plan}`}
      </button>

      {state === 'error' && (
        <p className="plan-enquiry-error" role="alert">
          {message}
        </p>
      )}
      <p className="plan-enquiry-note">
        Two fields. We reply with the plan that fits, or tell you a cheaper one does.
      </p>
    </form>
  );
}
