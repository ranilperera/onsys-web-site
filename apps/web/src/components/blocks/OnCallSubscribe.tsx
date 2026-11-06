'use client';

import { useState, type FormEvent } from 'react';
import {
  AU_STATES,
  ONCALL_COUNTRIES,
  ONCALL_INSTANCE_CHOICES,
  addressLabels,
  formatMoneyCents,
  onCallEnrolmentSchema,
  onCallMonthlyCents,
} from '@onsys/shared';
import { siteConfig } from '@/lib/config';
import { getAttribution } from '@/lib/attribution';
import { GOALS, trackGoal } from '@/lib/analytics';
import { Turnstile } from '../Turnstile';

/**
 * On-call cover: what it costs, how much of it you want, and starting it.
 *
 * One section, because it used to be three. The price was in a pair of cards,
 * what the cover included was in one of them, and the instance selector sat
 * somewhere above with a link off to another site — so working out whether
 * this suited you meant scrolling between three places, and acting on it
 * meant leaving. Everything a buyer needs to decide, and the form that takes
 * the decision, now sit in the same place.
 *
 * The form collects what an invoice needs rather than what an enquiry needs,
 * because this is the moment a company agrees to a monthly fee. Creating a
 * login is still Onsys Support's job and is offered afterwards: cover starts
 * either way, and nobody should have to make an account before they can buy.
 */

type FieldErrors = Partial<Record<string, string>>;

interface Confirmation {
  instances: number;
  monthlyTotalCents: number;
  message: string;
}

export function OnCallSubscribe({
  anchor,
  eyebrow,
  heading,
  body,
  pricePerInstanceCents,
  hourlyRateCents,
  minInstances,
  maxInstances,
  signupUrl,
  includes,
  callsTitle,
  callsIncludes,
  monthlyPlanHref,
  monthlyPlanLabel,
  priceNote,
  fitsTitle,
  fits,
  note,
}: {
  anchor?: string;
  eyebrow?: string;
  heading: string;
  body?: string;
  pricePerInstanceCents: number;
  hourlyRateCents: number;
  minInstances: number;
  maxInstances: number;
  signupUrl: string;
  includes: string[];
  callsTitle?: string;
  callsIncludes: string[];
  monthlyPlanHref: string;
  monthlyPlanLabel: string;
  priceNote?: string;
  fitsTitle?: string;
  fits: string[];
  note?: string;
}) {
  const choices = ONCALL_INSTANCE_CHOICES.filter(
    (n) => n >= minInstances && n <= maxInstances,
  );

  const [instances, setInstances] = useState(choices[0] ?? minInstances);
  /**
   * "More than ten" is a selection, not a number.
   *
   * Picked deliberately rather than inferred from a count above the band, so
   * the page can answer it properly: an estate that size is better served by
   * a monthly plan, and saying so is more use than refusing the form.
   */
  const [tooMany, setTooMany] = useState(false);
  const [country, setCountry] = useState('AU');
  const [state, setState] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [captchaToken, setCaptchaToken] = useState('');
  // Single-use tokens: a retry after a validation error needs a fresh one.
  const [captchaNonce, setCaptchaNonce] = useState(0);
  const [confirmed, setConfirmed] = useState<Confirmation | null>(null);

  const labels = addressLabels(country);
  const isAU = country === 'AU';
  const monthly = onCallMonthlyCents(instances, pricePerInstanceCents);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    // Captured before the first await: React nulls currentTarget once the
    // handler yields, and reading it after the fetch throws a TypeError that
    // the catch below would report as a network failure — telling somebody
    // their enrolment failed when it had in fact been recorded.
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const attribution = getAttribution();

    const payload = {
      companyName: String(form.get('companyName') ?? ''),
      website: String(form.get('website') ?? ''),
      country,
      countryOther: String(form.get('countryOther') ?? ''),
      street: String(form.get('street') ?? ''),
      street2: String(form.get('street2') ?? ''),
      locality: String(form.get('locality') ?? ''),
      region: String(form.get('region') ?? ''),
      postcode: String(form.get('postcode') ?? ''),
      contactName: String(form.get('contactName') ?? ''),
      workEmail: String(form.get('workEmail') ?? ''),
      phone: String(form.get('phone') ?? ''),
      instances,
      notes: String(form.get('notes') ?? ''),
      referrer: attribution.referrer ?? '',
      landingPath: attribution.landingPath ?? '',
    };

    // The same schema the API parses, so the two cannot drift apart.
    const parsed = onCallEnrolmentSchema.safeParse(payload);
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
      const res = await fetch(`${siteConfig.apiUrl}/api/on-call/enrolments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...parsed.data,
          captchaToken,
          website_url: String(form.get('website_url') ?? ''), // honeypot
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setState('error');
        setMessage(data.error ?? 'Something went wrong. Please try again or call us.');
        setCaptchaNonce((n) => n + 1);
        return;
      }

      setState('idle');
      setConfirmed({
        instances: data.instances ?? instances,
        monthlyTotalCents: data.monthlyTotalCents ?? monthly,
        message: data.message ?? 'Thanks — we have your enrolment.',
      });
      trackGoal(GOALS.onCallStart);
    } catch {
      setState('error');
      setMessage(
        `We couldn't send that just now. Please call ${siteConfig.phone} and we will set the cover up over the phone.`,
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

  return (
    <section id={anchor ?? 'on-call-pricing'} className="section">
      <div className="wrap">
        <div className="section-head oncall-head">
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h2>{heading}</h2>
        </div>

        <div className="oncall-grid">
          {/* What you are buying. Two lists, because they are two different
              charges and a buyer has to be able to tell them apart.

              The lede belongs to this column rather than to the section head:
              in the head it ran the width of the page and started a paragraph
              above the panel beside it, so the two columns began at different
              heights. */}
          <div className="oncall-what">
            {body && <p className="oncall-lede">{body}</p>}
            <div className="oncall-price-head">
              <span className="oncall-price">{formatMoneyCents(pricePerInstanceCents)}</span>
              <span className="oncall-price-unit">per SQL Server instance, per month</span>
            </div>
            <ul className="oncall-list">
              {includes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <div className="oncall-price-head oncall-price-head-sub">
              <span className="oncall-price">{formatMoneyCents(hourlyRateCents)}</span>
              <span className="oncall-price-unit">per hour, only when you call</span>
            </div>
            <h3 className="oncall-sub-heading">{callsTitle ?? 'How calls are billed'}</h3>
            <ul className="oncall-list">
              {callsIncludes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            {note && <p className="oncall-caveat">{note}</p>}
            {priceNote && <p className="oncall-note">{priceNote}</p>}

            {/* Why people buy it, kept beside the form rather than in a
                section below it: the reasons are what make the form worth
                filling in, and they are no use to a reader who has already
                scrolled past it. */}
            {fits.length > 0 && (
              <div className="oncall-fits">
                <h3 className="oncall-sub-heading">{fitsTitle ?? 'When on-call fits'}</h3>
                <ul className="oncall-list oncall-list-tight">
                  {fits.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Choosing, and starting. */}
          <div className="oncall-buy" id="start-on-call">
            {confirmed ? (
              <div className="oncall-done">
                <h3>Cover requested</h3>
                <div className="form-status success" role="status">
                  {confirmed.message}
                </div>
                <dl className="oncall-summary">
                  <div>
                    <dt>Instances covered</dt>
                    <dd>{confirmed.instances}</dd>
                  </div>
                  <div>
                    <dt>Monthly subscription</dt>
                    <dd>{formatMoneyCents(confirmed.monthlyTotalCents)} ex GST</dd>
                  </div>
                  <div>
                    <dt>Support calls</dt>
                    <dd>{formatMoneyCents(hourlyRateCents)} per hour</dd>
                  </div>
                </dl>
                <p>
                  We have emailed you a copy. A consultant will confirm your versions and platforms,
                  agree escalation paths and set up secure access — nothing is invoiced until cover
                  is live.
                </p>
                <a className="btn btn-primary" href={`${signupUrl}?plan=oncall&instances=${confirmed.instances}`}>
                  Create your Onsys Support login
                </a>
                <p className="oncall-note">
                  Optional, and you can do it later. It is where you raise tickets and see invoices.
                </p>
              </div>
            ) : (
              <>
                <h3>Start your cover</h3>

                <fieldset className="oncall-count">
                  <legend>How many SQL Server instances?</legend>
                  <div className="oncall-count-options">
                    {choices.map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={!tooMany && n === instances ? 'oncall-chip active' : 'oncall-chip'}
                        aria-pressed={!tooMany && n === instances}
                        onClick={() => {
                          setInstances(n);
                          setTooMany(false);
                        }}
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={tooMany ? 'oncall-chip active' : 'oncall-chip'}
                      aria-pressed={tooMany}
                      onClick={() => setTooMany(true)}
                    >
                      More than {maxInstances}
                    </button>
                  </div>
                </fieldset>

                {tooMany ? (
                  /* Not an error. Above the band a monthly plan costs less per
                     instance and covers more, so the honest answer is to send
                     them there rather than sell them the wrong product. */
                  <div className="oncall-upsell">
                    <p>
                      Above {maxInstances} instances, a monthly 24/7 DBA plan works out cheaper per
                      instance and adds continuous monitoring, included service hours and
                      health-check reporting — rather than cover that waits for you to call.
                    </p>
                    <div className="oncall-actions">
                      <a className="btn btn-primary" href={monthlyPlanHref}>
                        {monthlyPlanLabel}
                      </a>
                      <a className="btn btn-outline" href="/contact">
                        Talk to a consultant
                      </a>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="oncall-total" aria-live="polite">
                      <span className="oncall-total-amount">{formatMoneyCents(monthly)}</span>
                      <span className="oncall-total-unit">
                        per month ex GST — {instances} × {formatMoneyCents(pricePerInstanceCents)}
                      </span>
                    </div>

                    {state === 'error' && message && (
                      <div className="form-status error" role="alert">
                        {message}
                      </div>
                    )}

                    <form onSubmit={onSubmit} noValidate>
                      <p className="oncall-form-legend">Company</p>

                      <div className="form-row">
                        <div className="form-field full">
                          <label htmlFor="companyName">Company name *</label>
                          <input
                            id="companyName"
                            name="companyName"
                            required
                            aria-invalid={Boolean(errors.companyName)}
                            aria-describedby={errors.companyName ? 'companyName-error' : undefined}
                          />
                          {err('companyName')}
                        </div>

                        <div className="form-field full">
                          <label htmlFor="website">
                            Website <span className="optional">Optional</span>
                          </label>
                          <input id="website" name="website" placeholder="example.com.au" />
                          {err('website')}
                        </div>

                        <div className="form-field full">
                          <label htmlFor="country">Country *</label>
                          <select
                            id="country"
                            name="country"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                          >
                            {ONCALL_COUNTRIES.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {country === 'OTHER' && (
                          <div className="form-field full">
                            <label htmlFor="countryOther">Which country? *</label>
                            <input
                              id="countryOther"
                              name="countryOther"
                              aria-invalid={Boolean(errors.countryOther)}
                            />
                            {err('countryOther')}
                          </div>
                        )}

                        <div className="form-field full">
                          <label htmlFor="street">Street address *</label>
                          <input
                            id="street"
                            name="street"
                            autoComplete="address-line1"
                            required
                            aria-invalid={Boolean(errors.street)}
                          />
                          {err('street')}
                        </div>

                        <div className="form-field full">
                          <label htmlFor="street2">
                            Address line 2 <span className="optional">Optional</span>
                          </label>
                          <input id="street2" name="street2" autoComplete="address-line2" />
                        </div>

                        <div className="form-field">
                          <label htmlFor="locality">{labels.locality} *</label>
                          <input
                            id="locality"
                            name="locality"
                            autoComplete="address-level2"
                            required
                            aria-invalid={Boolean(errors.locality)}
                          />
                          {err('locality')}
                        </div>

                        <div className="form-field">
                          <label htmlFor="region">
                            {labels.region}
                            {isAU ? ' *' : ''}
                          </label>
                          {isAU ? (
                            <select id="region" name="region" defaultValue="" aria-invalid={Boolean(errors.region)}>
                              <option value="" disabled>
                                Select…
                              </option>
                              {AU_STATES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input id="region" name="region" autoComplete="address-level1" />
                          )}
                          {err('region')}
                        </div>

                        <div className="form-field">
                          <label htmlFor="postcode">
                            {labels.postcode}
                            {isAU ? ' *' : ''}
                          </label>
                          <input
                            id="postcode"
                            name="postcode"
                            inputMode={isAU ? 'numeric' : 'text'}
                            autoComplete="postal-code"
                            aria-invalid={Boolean(errors.postcode)}
                          />
                          {err('postcode')}
                        </div>
                      </div>

                      <p className="oncall-form-legend">You</p>

                      <div className="form-row">
                        <div className="form-field full">
                          <label htmlFor="contactName">Your name *</label>
                          <input
                            id="contactName"
                            name="contactName"
                            autoComplete="name"
                            required
                            aria-invalid={Boolean(errors.contactName)}
                          />
                          {err('contactName')}
                        </div>

                        <div className="form-field full">
                          <label htmlFor="workEmail">
                            Work email * <span className="optional">We will send your confirmation here</span>
                          </label>
                          <input
                            id="workEmail"
                            name="workEmail"
                            type="email"
                            autoComplete="email"
                            required
                            aria-invalid={Boolean(errors.workEmail)}
                          />
                          {err('workEmail')}
                        </div>

                        <div className="form-field full">
                          <label htmlFor="phone">Phone *</label>
                          <input
                            id="phone"
                            name="phone"
                            type="tel"
                            autoComplete="tel"
                            required
                            aria-invalid={Boolean(errors.phone)}
                          />
                          {err('phone')}
                        </div>

                        <div className="form-field full">
                          <label htmlFor="notes">
                            Anything we should know <span className="optional">Optional</span>
                          </label>
                          <textarea
                            id="notes"
                            name="notes"
                            rows={3}
                            placeholder="Versions, hosting, or when you need cover to start"
                          />
                        </div>
                      </div>

                      {/* Honeypot — hidden from humans and assistive tech. Not
                          named "website": this form has a real website field. */}
                      <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
                        <label htmlFor="website_url">Leave this field empty</label>
                        <input id="website_url" name="website_url" tabIndex={-1} autoComplete="off" />
                      </div>

                      <Turnstile onToken={setCaptchaToken} resetKey={captchaNonce} />

                      <button
                        className="btn btn-primary btn-block"
                        type="submit"
                        disabled={state === 'submitting'}
                      >
                        {state === 'submitting'
                          ? 'Starting your cover…'
                          : `Enrol — ${formatMoneyCents(monthly)} per month`}
                      </button>

                      <p className="oncall-note">
                        Nothing is invoiced until cover is live. We confirm your estate first.
                      </p>
                    </form>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
