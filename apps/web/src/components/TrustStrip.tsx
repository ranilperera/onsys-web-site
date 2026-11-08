import Link from 'next/link';

/**
 * Four headline facts under the home hero, each one a way into the page that
 * backs it up. Every figure here is already published elsewhere on the site
 * (plans, SLA, access policy); if one of those changes, change it here too.
 */
const ITEMS = [
  {
    icon: 't-pulse',
    value: '24/7/365',
    label: 'Monitoring and on-call senior DBAs',
    href: '/remote-database-support',
  },
  {
    icon: 't-gauge',
    value: '1–2 hr',
    label: 'Guaranteed response SLA, around the clock',
    href: '/pricing-and-plans#database-plans',
  },
  {
    icon: 't-lock',
    value: 'Onshore only',
    label: 'Only Australian-based DBAs access your data',
    href: '/who-can-access-your-database',
  },
  {
    icon: 't-chart',
    value: 'From $1,500',
    label: 'Published monthly plans, no lock-in',
    href: '/pricing-and-plans',
  },
];

export function TrustStrip() {
  return (
    <section className="trust-strip" aria-label="Why teams choose Onsys">
      <div className="wrap">
        <ul className="trust-grid">
          {ITEMS.map((item) => (
            <li key={item.value}>
              <Link className="trust-item" href={item.href}>
                <span className="trust-ic" aria-hidden="true">
                  <svg>
                    <use href={`#${item.icon}`} />
                  </svg>
                </span>
                <span className="trust-text">
                  <b>{item.value}</b>
                  <span>{item.label}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
