'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { bookingInputSchema, type AvailabilityResponse, type BookingConfirmation } from '@onsys/shared';
import { siteConfig } from '@/lib/config';

const TOPICS = [
  'Managed database services',
  'On-call / ad-hoc DBA support',
  'Database consultancy or health check',
  'Upgrade, migration or DR',
  'Managed IT services',
  'Cloud consultancy or migration',
  'Cyber security',
  'Software, integration or AI',
  'Something else',
];

type FieldErrors = Partial<Record<string, string>>;

/**
 * Two-step consultation booker: pick a slot, then give us your details.
 *
 * Availability is fetched fresh rather than cached, because a slot the visitor
 * is looking at can be taken by someone else — or filled by a meeting on the
 * consultant's own calendar — at any moment. The server re-checks the slot on
 * submit and answers 409 if it has gone, which is handled below by reloading
 * the grid rather than dropping the visitor's typed details.
 */
export function BookingWidget() {
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const [state, setState] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmed, setConfirmed] = useState<BookingConfirmation | null>(null);

  const stripRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  /** Track which ends of the date strip are reached, to disable the arrows. */
  const syncEdges = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 1,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    syncEdges();
    window.addEventListener('resize', syncEdges);
    return () => window.removeEventListener('resize', syncEdges);
  }, [syncEdges, availability]);

  // Page by whole tab-widths so a click always lands on a tab boundary.
  const scrollDays = (direction: 1 | -1) => {
    const el = stripRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.8, 160), behavior: 'smooth' });
  };

  const loadAvailability = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/bookings/availability?days=21`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('availability request failed');
      const data: AvailabilityResponse = await res.json();
      setAvailability(data);
      setActiveDate((current) =>
        current && data.days.some((d) => d.date === current) ? current : (data.days[0]?.date ?? null),
      );
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  const day = useMemo(
    () => availability?.days.find((d) => d.date === activeDate) ?? null,
    [availability, activeDate],
  );

  const selectedSlot = useMemo(() => {
    if (!selected || !availability) return null;
    for (const d of availability.days) {
      const hit = d.slots.find((s) => s.startsAt === selected);
      if (hit) return { day: d, slot: hit };
    }
    return null;
  }, [selected, availability]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    if (!selected) {
      setState('error');
      setMessage('Please choose a time first.');
      return;
    }

    const form = new FormData(e.currentTarget);
    const params = new URLSearchParams(window.location.search);
    const payload = {
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      company: String(form.get('company') ?? ''),
      phone: String(form.get('phone') ?? ''),
      topic: String(form.get('topic') ?? ''),
      message: String(form.get('message') ?? ''),
      startsAt: selected,
      website: String(form.get('website') ?? ''), // honeypot
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      utmSource: params.get('utm_source') ?? undefined,
      utmMedium: params.get('utm_medium') ?? undefined,
      utmCampaign: params.get('utm_campaign') ?? undefined,
    };

    // Same schema the API validates with, so the visitor sees errors instantly.
    const parsed = bookingInputSchema.safeParse(payload);
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
      const res = await fetch(`${siteConfig.apiUrl}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();

      if (res.status === 409) {
        // Someone took it between load and submit. Refresh the grid and let
        // them re-pick — their typed details stay in the form.
        setState('error');
        setMessage(data.error ?? 'That time has just been taken. Please choose another.');
        setSelected(null);
        void loadAvailability();
        return;
      }
      if (!res.ok) {
        setState('error');
        setMessage(data.error ?? 'Something went wrong. Please try again or call us.');
        return;
      }

      setConfirmed(data.booking as BookingConfirmation);
    } catch {
      setState('error');
      setMessage(`We could not reach the booking service. Please call ${siteConfig.phone}.`);
    }
  }

  // --- Confirmation -------------------------------------------------------
  if (confirmed) {
    return (
      <div className="booking-done">
        <div className="booking-done-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2>You&rsquo;re booked in</h2>
        <p className="booking-done-when">{confirmed.when}</p>
        <p className="booking-done-sub">
          {availability?.slotMinutes ?? 30} minutes with {confirmed.consultantName}. A confirmation
          with a calendar invitation is on its way to your inbox.
        </p>

        <dl className="booking-summary">
          <div>
            <dt>Reference</dt>
            <dd>{confirmed.reference}</dd>
          </div>
          <div>
            <dt>Timezone</dt>
            <dd>{confirmed.timezone.replace('_', ' ')}</dd>
          </div>
        </dl>

        {confirmed.joinUrl ? (
          <>
            <a className="btn btn-primary btn-block" href={confirmed.joinUrl} target="_blank" rel="noopener noreferrer">
              Join the Teams meeting
            </a>
            <p className="booking-note">
              Save this link — it is also in your confirmation email. You do not need a Teams
              account; it opens in a browser.
            </p>
          </>
        ) : (
          <p className="booking-note">
            We&rsquo;ll email your Microsoft Teams joining link shortly.
          </p>
        )}

        <p className="booking-note">
          Need to change it? <a href={confirmed.cancelUrl}>Cancel this booking</a> or call{' '}
          <a href={`tel:${siteConfig.phoneE164}`}>{siteConfig.phone}</a>.
        </p>
      </div>
    );
  }

  // --- Booking unavailable ------------------------------------------------
  if (!loading && (loadError || availability?.enabled === false)) {
    return (
      <div className="booking-fallback">
        <h2>Online booking is offline right now</h2>
        <p>
          Rather than leave you guessing, here are the direct routes: call{' '}
          <a href={`tel:${siteConfig.phoneE164}`}>{siteConfig.phone}</a>, email{' '}
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>, or send us the details and
          we&rsquo;ll come back with times that suit.
        </p>
        <a className="btn btn-primary" href="/contact">
          Use the contact form
        </a>
      </div>
    );
  }

  const noSlots = !loading && availability != null && availability.days.length === 0;

  return (
    <div className="booking">
      {/* Step 1 — choose a time */}
      <div className="booking-step">
        <div className="booking-step-head">
          <span className="booking-step-num">1</span>
          <div>
            <h2>Choose a time</h2>
            <p>
              {availability
                ? `${availability.slotMinutes} minutes, on Microsoft Teams. Times shown in ${availability.timezone.replace('_', ' ')}.`
                : 'Loading the next available times…'}
            </p>
          </div>
        </div>

        {loading && <div className="booking-loading">Checking the calendar…</div>}

        {noSlots && (
          <div className="booking-empty">
            <p>
              There are no open slots in the next few weeks. Call{' '}
              <a href={`tel:${siteConfig.phoneE164}`}>{siteConfig.phone}</a> and we&rsquo;ll find a
              time that works.
            </p>
          </div>
        )}

        {!loading && availability && availability.days.length > 0 && (
          <>
            <div className={`booking-days-wrap${edges.start ? ' at-start' : ''}${edges.end ? ' at-end' : ''}`}>
              <button
                type="button"
                className="booking-days-nav prev"
                onClick={() => scrollDays(-1)}
                disabled={edges.start}
                aria-label="Show earlier dates"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
              </button>

              <div
                className="booking-days"
                ref={stripRef}
                onScroll={syncEdges}
                role="tablist"
                aria-label="Available dates"
              >
                {availability.days.map((d) => (
                  <button
                    key={d.date}
                    type="button"
                    role="tab"
                    aria-selected={d.date === activeDate}
                    className={`booking-day${d.date === activeDate ? ' is-active' : ''}`}
                    onClick={() => setActiveDate(d.date)}
                  >
                    <span className="booking-day-label">{d.label}</span>
                    <span className="booking-day-count">
                      {d.slots.length} {d.slots.length === 1 ? 'slot' : 'slots'}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="booking-days-nav next"
                onClick={() => scrollDays(1)}
                disabled={edges.end}
                aria-label="Show later dates"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </div>

            {day && (
              <div className="booking-slots" role="group" aria-label={`Times on ${day.label}`}>
                {day.slots.map((slot) => (
                  <button
                    key={slot.startsAt}
                    type="button"
                    aria-pressed={slot.startsAt === selected}
                    className={`booking-slot${slot.startsAt === selected ? ' is-selected' : ''}`}
                    onClick={() => {
                      setSelected(slot.startsAt);
                      if (state === 'error') setState('idle');
                      // Stacked layout only — on desktop the form is already beside the grid.
                      if (window.matchMedia('(max-width: 900px)').matches) {
                        detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Step 2 — details */}
      <div className={`booking-step${selected ? '' : ' is-disabled'}`} ref={detailsRef}>
        <div className="booking-step-head">
          <span className="booking-step-num">2</span>
          <div>
            <h2>Your details</h2>
            <p>
              {selectedSlot
                ? `Holding ${selectedSlot.day.label} at ${selectedSlot.slot.label}.`
                : 'Pick a time above to continue.'}
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} noValidate>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="b-name">Full name *</label>
              <input id="b-name" name="name" autoComplete="name" placeholder="Jane Smith" required />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>
            <div className="form-field">
              <label htmlFor="b-email">Email *</label>
              <input
                id="b-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="jane@company.com.au"
                required
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="b-company">Company</label>
              <input id="b-company" name="company" autoComplete="organization" placeholder="Company Pty Ltd" />
            </div>
            <div className="form-field">
              <label htmlFor="b-phone">Phone</label>
              <input id="b-phone" name="phone" type="tel" autoComplete="tel" placeholder="04xx xxx xxx" />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="b-topic">What would you like to talk about?</label>
            <select id="b-topic" name="topic" defaultValue={TOPICS[0]}>
              {TOPICS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="b-message">Anything we should know first?</label>
            <textarea
              id="b-message"
              name="message"
              rows={4}
              placeholder="Platforms and versions, what is going wrong, deadlines — the more context, the more useful the call."
            />
          </div>

          {/* Honeypot — off-screen, never focusable. Real users leave it empty.
              Matches the pattern ContactForm already uses. */}
          <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
            <label htmlFor="b-website">Leave this field empty</label>
            <input id="b-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          {state === 'error' && (
            <p className="form-status error" role="alert">
              {message}
            </p>
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={state === 'submitting' || !selected}>
            {state === 'submitting' ? 'Confirming…' : 'Confirm booking'}
          </button>

          <p className="booking-note">
            No charge and no obligation. We&rsquo;ll send a Microsoft Teams link and a calendar
            invitation by email.
          </p>
        </form>
      </div>
    </div>
  );
}
