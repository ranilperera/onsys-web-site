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
    'Melbourne-based database, cloud, managed IT and security specialists. Databases are handled by our Australian consultants; our Colombo delivery centre covers managed IT, software and security.',
  email: process.env.NEXT_PUBLIC_ORG_EMAIL || 'sales@onsys.com.au',
  /**
   * Where job applications go. Separate from the general address because a CV
   * is not a sales enquiry: it goes to whoever is hiring, and it carries
   * personal information that the sales inbox has no reason to hold.
   *
   * Falls back to the general address so a deployment that has not set it still
   * shows something reachable rather than an empty mailto.
   */
  careersEmail:
    process.env.NEXT_PUBLIC_ORG_CAREERS_EMAIL ||
    process.env.NEXT_PUBLIC_ORG_EMAIL ||
    'sales@onsys.com.au',
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
    instagram:
      process.env.NEXT_PUBLIC_ORG_INSTAGRAM || 'https://www.instagram.com/onsystechnologies',
    tiktok: process.env.NEXT_PUBLIC_ORG_TIKTOK || 'https://www.tiktok.com/@onsystechnologies',
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
  heroRotateSeconds: Number(process.env.NEXT_PUBLIC_HERO_ROTATE_SECONDS ?? '10') || 0,
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
export type MegaMenuKey = 'database' | 'technology';

export interface MainNavItem {
  label: string;
  href: string;
  /** Present only on items that open a mega menu. */
  menu?: MegaMenuKey;
}

export const navigation = {
  main: [
    { label: 'Home', href: '/' },
    /*
     * One database menu, one menu for everything else.
     *
     * The bar used to carry four service lines of equal weight — Database,
     * Infra & Cloud, App Data & AI, Cyber Security — which told a visitor this
     * is a general IT firm with a database department. It is the other way
     * round, and the navigation is the first place that has to say so.
     *
     * Case Studies and Our Expertise are promoted out of the footer. They are
     * what a buyer comparing providers opens before they open a service page,
     * and five consecutive SEO reports recorded the absence of visible proof
     * as this site's biggest gap.
     */
    { label: 'Database', href: '/sql-server-dba-services', menu: 'database' },
    { label: 'Cloud, IT & AI', href: '/other-services', menu: 'technology' },
    { label: 'Case Studies', href: '/case-studies' },
    { label: 'Our Expertise', href: '/expertise' },
    /*
     * Next to the other two proof links rather than out by Contact: a buyer
     * who opens case studies and expertise is doing the same thing a buyer who
     * opens the blog is doing — deciding whether we know what we are talking
     * about before they look at a price.
     *
     * Labelled "Blog", and the footer entry was renamed from "Insights" to
     * match. One URL under two names in two navigations is the inconsistency
     * the footer rework was meant to remove.
     */
    { label: 'Blog', href: '/blog' },
    { label: 'Pricing', href: '/pricing-and-plans' },
    { label: 'Contact', href: '/contact' },
  ] satisfies MainNavItem[],

  /**
   * Two menus: databases, and the technology around them.
   *
   * Database keeps three columns because it carries twelve links and they
   * divide cleanly — SQL Server, the platform-neutral services, and open
   * source, which is the only part of the menu that says this is not a SQL
   * Server-only shop.
   *
   * The technology menu is the six services database clients most often ask
   * for next. It is not the full list: system administration, networks,
   * virtualisation, mobile and the four security pages are no longer in the
   * bar at all. They keep their pages, their footer links and their place on
   * /other-services, which this menu links to — nothing is unpublished and no
   * indexed URL moves. What changes is that the top bar now argues for one
   * thing instead of four.
   */
  menus: {
    database: [
      {
        title: 'SQL Server',
        links: [
          { label: 'SQL Server DBA Services', href: '/sql-server-dba-services', sub: 'The hub: what a DBA actually does' },
          { label: 'Remote On-Call DBA', href: '/on-call-dba-services', sub: 'Standby cover from $100/instance' },
          { label: 'SQL Server Projects', href: '/sql-server-migration-and-upgrade-services', sub: 'Migrations, upgrades, Always On, Azure' },
          { label: 'Free SQL Server Health Check', href: '/free-20-point-sql-server-health-check', sub: '20 points, one instance, no charge' },
          { label: 'SQL Server 2016 End of Support', href: '/sql-server-2016-end-of-support', sub: 'Support ended 15 July 2026' },
          { label: 'SQL Server 2017 End of Support', href: '/sql-server-2017-end-of-support', sub: 'Support ends 12 October 2027' },
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
      {
        /**
         * A column of its own rather than two more rows under "Database
         * services", which already carried five. Someone scanning for
         * PostgreSQL is not reading a Microsoft list to find it, and burying
         * the two pages at the bottom of the longest column would waste the
         * only part of the menu that says we are not a SQL Server shop.
         */
        title: 'Open source',
        links: [
          { label: 'PostgreSQL Consulting', href: '/postgresql-consulting-services', sub: 'Builds, HA & migrations, fixed price' },
          { label: 'MySQL Consulting', href: '/mysql-consulting-services', sub: 'Clustering, 5.7 upgrades & cloud moves' },
        ],
      },
      {
        /**
         * Market pages, in the navigation rather than only in the sitemap.
         *
         * A link from the header appears on every page of the site, which is
         * the strongest internal signal available — and these pages start with
         * no external authority at all. Every SEO review since August has made
         * the same point: the site says "Australia" everywhere, so a New
         * Zealand or Pacific searcher is given no reason to click and Google is
         * given no reason to rank it.
         */
        title: 'New Zealand & Pacific',
        links: [
          { label: 'Database Support New Zealand', href: '/database-support-new-zealand', sub: 'Your business day, from Australia' },
          { label: 'Pacific Islands', href: '/database-support-pacific-islands', sub: 'Fiji, PNG, Vanuatu, Solomons & more' },
          { label: 'Fiji', href: '/database-support-fiji', sub: 'Telco, banking & government' },
          { label: 'Papua New Guinea', href: '/database-support-papua-new-guinea', sub: 'Same time zone as Brisbane' },
          { label: 'Vanuatu', href: '/database-support-vanuatu', sub: 'DR you have actually tested' },
          { label: 'Solomon Islands', href: '/database-support-solomon-islands', sub: 'Escalation that answers' },
        ],
      },
    ],
    technology: [
      {
        title: 'Cloud & managed IT',
        links: [
          { label: 'Managed IT Services', href: '/managed-it-services', sub: 'Outsourced IT from $4,500/month' },
          { label: 'Cloud Consultancy & Support', href: '/cloud-consultancy', sub: 'Strategy, architecture & FinOps' },
          { label: 'Cloud Migrations', href: '/cloud-migrations', sub: 'Azure, AWS & Oracle Cloud (OCI)' },
        ],
      },
      {
        title: 'Software, data & AI',
        links: [
          { label: 'Software Development', href: '/custom-software-development', sub: 'Projects, fixed price' },
          { label: 'Integration Services', href: '/integration-services', sub: 'ETL & automated data pipelines' },
          { label: 'AI Development & Solutions', href: '/artificial-intelligence-solutions', sub: 'Applied AI & automation' },
        ],
      },
    ],
  },

  /**
   * The footer mirrors the top navigation: the same two service groupings under
   * the same names, then Company and Support.
   *
   * Two columns rather than one "Services" list, because the header now argues
   * that this is a database firm with technology services around it, and a
   * footer that mixes "Remote Database Support" and "Cloud Migrations" into one
   * undifferentiated list quietly argues the opposite.
   *
   * Legal is rendered beside the copyright instead of as a fifth column — the
   * grid carries four, and privacy and terms belong on the bottom line anyway.
   *
   * This is the fallback used when the API is unreachable. The live footer is
   * admin-managed in nav_links and seeded by seed-nav.ts; all three must agree.
   */
  footer: {
    Database: [
      { label: 'SQL Server DBA Services', href: '/sql-server-dba-services' },
      { label: 'Managed SQL Server Support', href: '/managed-sql-server-support' },
      { label: 'Remote Database Support', href: '/remote-database-support' },
      { label: 'Remote On-Call DBA', href: '/on-call-dba-services' },
      { label: 'SQL Server Projects', href: '/sql-server-migration-and-upgrade-services' },
      { label: 'Emergency Database Support', href: '/emergency-database-support' },
      { label: 'PostgreSQL Consulting', href: '/postgresql-consulting-services' },
      { label: 'MySQL Consulting', href: '/mysql-consulting-services' },
      // A city page is a search landing page rather than something a visitor
      // navigates to from the header, so it sits here and not in the menu.
      { label: 'SQL Server DBA Melbourne', href: '/sql-server-dba-melbourne' },
      // The market hubs. The individual country pages are linked from the
      // header and from the Pacific hub; putting all six here as well would
      // make this column twice the length of any other.
      { label: 'Database Support New Zealand', href: '/database-support-new-zealand' },
      { label: 'Pacific Islands Database Support', href: '/database-support-pacific-islands' },
    ],
    'Cloud, IT & AI': [
      { label: 'Managed IT Services', href: '/managed-it-services' },
      { label: 'Cloud Consultancy & Support', href: '/cloud-consultancy' },
      { label: 'Cloud Migrations', href: '/cloud-migrations' },
      { label: 'Software Development', href: '/custom-software-development' },
      { label: 'Integration Services', href: '/integration-services' },
      { label: 'AI Development & Solutions', href: '/artificial-intelligence-solutions' },
      // The index for everything not in the menu — security, networks,
      // virtualisation and mobile. Without it those pages have no route here.
      { label: 'All Other Services', href: '/other-services' },
    ],
    Company: [
      { label: 'About Us', href: '/about' },
      { label: 'Our Expertise', href: '/expertise' },
      { label: 'Case Studies', href: '/case-studies' },
      { label: 'Clients', href: '/clients' },
      { label: 'Certifications', href: '/certifications' },
      { label: 'Products', href: '/products' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/careers' },
    ],
    Support: [
      { label: 'Free SQL Server Health Check', href: '/free-20-point-sql-server-health-check' },
      { label: 'Pricing & Plans', href: '/pricing-and-plans' },
      { label: 'Book a Consultation', href: '/book' },
      { label: 'Contact Us', href: '/contact' },
      // Not a legal page — it is the answer to the objection every
      // offshore-capable provider gets, so it sits where buyers will see it.
      { label: 'Who Can Access Your Database', href: '/who-can-access-your-database' },
    ],
    Legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Use', href: '/terms' },
      { label: 'Disclaimer', href: '/disclaimer' },
    ],
  },
} as const;
