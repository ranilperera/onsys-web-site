'use client';

import { useState } from 'react';
import { GOALS, trackGoal } from '@/lib/analytics';
import { PlanEnquiry } from './PlanEnquiry';

/**
 * Choosing how much on-call cover to buy, then going and buying it.
 *
 * This is step one of a signup that finishes in Onsys Support. It collects
 * the single decision the marketing site is in a position to take — how many
 * SQL Server instances the cover is for — and hands that count over in the
 * link. Everything after it (company details, the emailed code, the
 * password, the address rules that differ by country) already exists in
 * Support, and a second copy here would be a second place for each of them
 * to be wrong.
 *
 * Outside the self-serve band the step turns into an enquiry rather than
 * refusing. A three-instance business is a lead, not an error message, and a
 * thirty-instance one should be talking to somebody about a managed plan.
 * The count they already chose is carried into that form so nobody is asked
 * the same question twice.
 */
export function OnCallSubscribe({
  eyebrow,
  heading,
  body,
  pricePerInstanceCents,
  hourlyRateCents,
  minInstances,
  maxInstances,
  signupUrl,
  includes,
  note,
}: {
  eyebrow?: string;
  heading: string;
  body?: string;
  pricePerInstanceCents: number;
  hourlyRateCents: number;
  minInstances: number;
  maxInstances: number;
  signupUrl: string;
  includes: string[];
  note?: string;
}) {
  const [instances, setInstances] = useState(minInstances);

  const money = (cents: number) =>
    (cents / 100).toLocaleString('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const inBand = instances >= minInstances && instances <= maxInstances;
  const monthly = money(instances * pricePerInstanceCents);
  const href = `${signupUrl}?plan=oncall&instances=${instances}`;

  return (
    <section id="start-on-call">
      <div className="wrap">
        <div className="oncall-buy">
          <div className="oncall-buy-main">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2>{heading}</h2>
            {body && <p className="lede">{body}</p>}

            <label className="oncall-count-label" htmlFor="oncall-instances">
              How many SQL Server instances need cover?
            </label>
            <div className="oncall-count">
              <input
                id="oncall-instances"
                type="range"
                min={1}
                /*
                 * The slider runs past the self-serve maximum on purpose, so
                 * a larger estate can say so rather than stopping at twelve
                 * and assuming that is the ceiling of what Onsys does.
                 */
                max={maxInstances + 8}
                step={1}
                value={instances}
                onChange={(e) => setInstances(Number(e.target.value))}
                aria-describedby="oncall-price"
              />
              <output className="oncall-count-value" htmlFor="oncall-instances">
                {instances}
                <span>{instances === 1 ? 'instance' : 'instances'}</span>
              </output>
            </div>

            <div className="oncall-price" id="oncall-price" aria-live="polite">
              {inBand ? (
                <>
                  <b>{monthly}</b>
                  <span className="unit">per month, excluding GST</span>
                  <p className="oncall-price-sub">
                    {money(pricePerInstanceCents)} per instance, per month. Support work{' '}
                    {money(hourlyRateCents)} per hour, only when you ask for it.
                  </p>
                </>
              ) : instances < minInstances ? (
                <p className="oncall-price-sub">
                  The subscription starts at {minInstances} instances. With fewer than that,
                  hourly consultancy is usually the cheaper answer — tell us what you run and
                  we will say which.
                </p>
              ) : (
                <p className="oncall-price-sub">
                  At {instances} instances a monthly plan with monitoring normally costs less
                  than on-call cover. Tell us what you run and we will price both.
                </p>
              )}
            </div>

            {inBand ? (
              <>
                <a
                  className="btn btn-primary"
                  href={href}
                  onClick={() => trackGoal(GOALS.onCallStart, { instances: String(instances) })}
                >
                  Start cover for {instances} {instances === 1 ? 'instance' : 'instances'}
                </a>
                <p className="oncall-buy-note">
                  You will create your Onsys Support account next, and confirm the price before
                  anything starts. No card is taken online — cover is invoiced monthly.
                </p>
              </>
            ) : (
              <div className="oncall-buy-enquiry">
                <PlanEnquiry plan="On-call DBA" defaultInstanceCount={instances} />
              </div>
            )}
          </div>

          {includes.length > 0 && (
            <aside className="oncall-buy-side">
              <h3>What the cover includes</h3>
              <ul>
                {includes.map((item) => (
                  <li key={item}>
                    <svg aria-hidden="true">
                      <use href="#s-check" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              {note && <p className="oncall-buy-caveat">{note}</p>}
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
