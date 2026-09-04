/**
 * Single source of truth for site-wide constants used across SEO + UI.
 *
 * Organisation details live as ORG_* in the monorepo root .env and are
 * re-exported as NEXT_PUBLIC_ORG_* by next.config.mjs so browser code gets them
 * too. The literals here are only fallbacks for an unset value — edit .env.
 *
 * Each variable MUST be read as a literal `process.env.NEXT_PUBLIC_ORG_X`.
 * Next substitutes these at build time by matching the exact member expression,
 * so a computed lookup such as process.env[`NEXT_PUBLIC_ORG_${key}`] is never
 * replaced and silently falls back.
 */
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_ORG_NAME || 'Onsys Technologies',
  /// Brand close for <title>. Titles must stay under ~60 characters to
  /// survive SERP truncation, and the full legal-style name eats 21 of them.
  shortName: process.env.NEXT_PUBLIC_ORG_SHORT_NAME || 'Onsys',
  /// The registered entity is "Onsys Pty Ltd", not the trading name with
  /// "Pty Ltd" appended. Used in legal copy and schema.org markup.
  legalName: process.env.NEXT_PUBLIC_ORG_LEGAL_NAME || 'Onsys Pty Ltd',
  abn: process.env.NEXT_PUBLIC_ORG_ABN || '49 602 081 005',
  acn: process.env.NEXT_PUBLIC_ORG_ACN || '602 081 005',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.onsys.com.au',
  /// Origin only — every caller appends its own `/api/...` path.
  ///
  /// A trailing `/api` is stripped rather than rejected. Setting this to
  /// `https://host/api` is the obvious reading, and it produced
  /// `/api/api/leads` on every browser request: a silent 404 that broke the
  /// contact form, booking and chat while server-rendered pages kept working,
  /// because those go through INTERNAL_API_URL instead. Accepting both spellings
  /// costs one regex.
  apiUrl: (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000')
    .replace(/\/+$/, '')
    .replace(/\/api$/, ''),
  description:
    process.env.NEXT_PUBLIC_ORG_DESCRIPTION ||
    'Australian managed IT service provider delivering 24/7 remote DBA support, managed IT, cloud consultancy, cyber security, AI and custom software. Senior, certified specialists across SQL Server, Oracle, PostgreSQL, EDB, MySQL, Azure, AWS and OCI.',
  /** Short line under the logo in the footer. */
  tagline:
    process.env.NEXT_PUBLIC_ORG_TAGLINE ||
    'Melbourne-based database, cloud, managed IT and security specialists — with a delivery centre in Colombo for round-the-clock coverage.',
  email: process.env.NEXT_PUBLIC_ORG_EMAIL || 'sales@onsys.com.au',
  phone: process.env.NEXT_PUBLIC_ORG_PHONE || '1800 431 416',
  phoneE164: process.env.NEXT_PUBLIC_ORG_PHONE_E164 || '+611800431416',
  bookingUrl: process.env.NEXT_PUBLIC_ORG_BOOKING_URL || '/book',
  logo: process.env.NEXT_PUBLIC_ORG_LOGO || '/logo.png',
  /**
   * Header wordmark, separate from `logo` because the two slots want
   * different shapes: the header is a 64px-tall strip that suits a wide
   * lockup, while the footer has room for the taller near-square mark.
   * Falls back to `logo` so an unset value degrades to the old behaviour.
   */
  logoHeader:
    process.env.NEXT_PUBLIC_ORG_LOGO_HEADER ||
    process.env.NEXT_PUBLIC_ORG_LOGO ||
    '/vertical-light.png',
  address: {
    street: process.env.NEXT_PUBLIC_ORG_STREET || 'Level 1, 530 Little Collins Street',
    locality: process.env.NEXT_PUBLIC_ORG_LOCALITY || 'Melbourne',
    region: process.env.NEXT_PUBLIC_ORG_REGION || 'VIC',
    postalCode: process.env.NEXT_PUBLIC_ORG_POSTCODE || '3000',
    country: process.env.NEXT_PUBLIC_ORG_COUNTRY || 'AU',
  },
  // A blank or '#' value hides the icon rather than rendering a dead link.
  social: {
    linkedin: process.env.NEXT_PUBLIC_ORG_LINKEDIN || 'https://au.linkedin.com/company/onsys-technologies',
    facebook: process.env.NEXT_PUBLIC_ORG_FACEBOOK || '#',
    twitter: process.env.NEXT_PUBLIC_ORG_TWITTER || '#',
    youtube: process.env.NEXT_PUBLIC_ORG_YOUTUBE || '#',
  },
  /// Cloudflare Turnstile site key. Empty means no widget renders and the API
  /// does not enforce a captcha — the two halves are gated together on
  /// purpose, see verifyCaptcha in the API.
  turnstileSiteKey: (() => {
    const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
    // Cloudflare site keys are 24 characters and secret keys are 35, and both
    // begin 0x4AAAAAAA. Putting the secret here publishes it in the client
    // bundle and breaks the widget with a 4000xx code. Refusing to use an
    // over-long value turns a leaked credential into a disabled captcha.
    if (key.length > 30) {
      // eslint-disable-next-line no-console -- visible at build and at runtime
      console.error(
        `[turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY is ${key.length} characters. ` +
          'That is the length of a SECRET key, not a site key (24). Refusing to ' +
          'use it — check the two values have not been transposed.',
      );
      return '';
    }
    return key;
  })(),
  /// Seconds between homepage hero variants. 0 disables rotation entirely,
  /// as does prefers-reduced-motion at runtime.
  heroRotateSeconds: Number(process.env.NEXT_PUBLIC_HERO_ROTATE_SECONDS ?? '8') || 0,
  /// Whether to advertise the client portal at all. Off until DBPulse is
  /// live — the /client-portal page still resolves for anyone holding the
  /// link, but nothing on the site points at it and it stays out of the
  /// sitemap and the index. Set NEXT_PUBLIC_PORTAL_ENABLED=true to launch it.
  portalEnabled: process.env.NEXT_PUBLIC_PORTAL_ENABLED === 'true',
  /// Onsys DBPulse — the client monitoring portal. Its own origin, with its
  /// own sessions and sign-in; this site only ever links to it.
  portalUrl: (process.env.NEXT_PUBLIC_PORTAL_URL || 'https://dbpulse.onsys.com.au').replace(/\/+$/, ''),
  locale: 'en_AU',
} as const;

/** Keys of the mega menus below. A nav item carrying one opens that panel. */
export type MegaMenuKey = 'database' | 'infra' | 'data' | 'security';

export interface MainNavItem {
  label: string;
  href: string;
  /** Present only on items that open a mega menu. */
  menu?: MegaMenuKey;
}

export const navigation = {
  main: [
    { label: 'Home', href: '/' },
    // Products and Expertise live in the footer's Company column instead. The
    // top bar is for the four service lines someone is choosing between; the
    // footer is where you look for a company you have already decided to read
    // about, and duplicating both was crowding the choice that matters.
    { label: 'Database', href: '/sql-server-dba-services', menu: 'database' },
    { label: 'Infra & Cloud', href: '/managed-it-services', menu: 'infra' },
    { label: 'App, Data & AI', href: '/artificial-intelligence-solutions', menu: 'data' },
    { label: 'Cyber Security', href: '/managed-security-services', menu: 'security' },
    { label: 'Pricing', href: '/pricing-and-plans' },
    { label: 'Contact', href: '/contact' },
  ] satisfies MainNavItem[],

  /**
   * One menu per service line, rather than everything behind "Services".
   *
   * "Services" told a visitor nothing — it is the word every competitor uses
   * for the same undifferentiated list, and it buried the four things Onsys
   * actually sells one level deeper than they needed to be. Naming the lines
   * in the bar means someone scanning for cyber security finds the word
   * "Cyber Security" rather than guessing which menu hides it.
   *
   * Database keeps two columns because it carries eleven links. The other
   * three are single-column dropdowns of four to six, where a column heading
   * would only repeat the trigger label directly above it — so their `title`
   * is omitted and the header is not rendered.
   */
  menus: {
    database: [
      {
        title: 'SQL Server',
        links: [
          { label: 'SQL Server DBA Services', href: '/sql-server-dba-services', sub: 'The hub: what a DBA actually does' },
          { label: 'Remote On-Call DBA', href: '/on-call-dba-services', sub: 'Standby cover from $100/instance' },
          { label: 'Free SQL Server Health Check', href: '/free-20-point-sql-server-health-check', sub: '20 points, one instance, no charge' },
          { label: 'SQL Server 2016 End of Support', href: '/sql-server-2016-end-of-support', sub: 'Support ended 15 July 2026' },
        ],
      },
      {
        title: 'Database services',
        links: [
          { label: 'Remote Database Support', href: '/remote-database-support', sub: '24/7 cover from $1,500/month' },
          { label: 'Managed Database Services', href: '/managed-database-services', sub: '24/7 monitoring & ITIL support' },
          { label: 'Emergency Database Support', href: '/emergency-database-support', sub: 'Outage response, answered 24/7' },
          { label: 'Database Consultancy', href: '/database-consultancy', sub: 'Advisory, tuning & health checks' },
          { label: 'Upgrades, Migrations & DR', href: '/database-upgrades-migrations-dr', sub: 'Version moves, clustering & failover' },
        ],
      },
    ],
    infra: [
      {
        links: [
          { label: 'Managed IT Services', href: '/managed-it-services', sub: 'Outsourced IT from $4,500/month' },
          { label: 'Cloud Consultancy & Support', href: '/cloud-consultancy', sub: 'Strategy, architecture & FinOps' },
          { label: 'Cloud Migrations', href: '/cloud-migrations', sub: 'Azure, AWS & Oracle Cloud (OCI)' },
          { label: 'System Administration', href: '/system-administration', sub: 'Windows, Linux, M365 & identity' },
          { label: 'Network & Firewalls', href: '/network-and-firewalls', sub: 'Cisco, Fortinet, Palo Alto' },
          { label: 'Virtualization & Storage', href: '/virtualization-and-storage', sub: 'VMware, NetApp, Dell EMC' },
        ],
      },
    ],
    data: [
      {
        links: [
          { label: 'AI Development & Solutions', href: '/artificial-intelligence-solutions', sub: 'Applied AI & automation' },
          { label: 'Integration Services', href: '/integration-services', sub: 'ETL & automated data pipelines' },
          { label: 'Software Development', href: '/custom-software-development', sub: 'Offshore & augmented teams' },
          { label: 'Mobile App Development', href: '/mobile-app-development', sub: 'iOS, Android, Flutter' },
        ],
      },
    ],
    security: [
      {
        links: [
          { label: 'Managed Security Services', href: '/managed-security-services', sub: '24/7 SOC, SIEM & threat hunting' },
          { label: 'Managed EDR', href: '/managed-endpoint-detection-and-response', sub: 'SentinelOne, with ransomware rollback' },
          { label: 'Data & Application Security', href: '/data-and-application-security', sub: 'Classification, DLP & secure code' },
          { label: 'GRC & Compliance', href: '/grc-and-compliance', sub: 'ISO 27001, Essential Eight, SOC 2' },
        ],
      },
    ],
  },

  footer: {
    Services: [
      { label: 'Managed SQL Server Support', href: '/managed-sql-server-support' },
      // Moved down from the Database menu: a city page is a search landing
      // page, not something a visitor navigates to from the header.
      { label: 'SQL Server DBA Melbourne', href: '/sql-server-dba-melbourne' },
      { label: 'Remote Database Support', href: '/remote-database-support' },
      { label: 'Managed IT Services', href: '/managed-it-services' },
      { label: 'Cloud Migrations', href: '/cloud-migrations' },
      // Was listed as "Software Development" — same page, renamed to match the
      // header rather than added twice under two labels.
      { label: 'Software Development', href: '/custom-software-development' },
      { label: 'AI Development & Solutions', href: '/artificial-intelligence-solutions' },
    ],
    Company: [
      { label: 'About Us', href: '/about' },
      { label: 'Our Expertise', href: '/expertise' },
      { label: 'Certifications', href: '/expertise#certifications' },
      { label: 'Products', href: '/products' },
      { label: 'Insights', href: '/blog' },
      { label: 'Careers', href: '/contact' },
    ],
    Support: [
      { label: 'Free SQL Server Health Check', href: '/free-20-point-sql-server-health-check' },
      { label: 'Book a Consultation', href: '/book' },
      { label: 'Emergency Database Support', href: '/emergency-database-support' },
      { label: 'Pricing & Plans', href: '/pricing-and-plans' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Blog', href: '/blog' },
    ],
    Legal: [
      { label: 'Who Can Access Your Database', href: '/who-can-access-your-database' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Use', href: '/terms' },
      { label: 'Disclaimer', href: '/disclaimer' },
    ],
  },
} as const;
