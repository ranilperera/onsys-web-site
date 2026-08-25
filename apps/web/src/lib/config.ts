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
  legalName: process.env.NEXT_PUBLIC_ORG_LEGAL_NAME || 'Onsys Technologies Pty Ltd',
  abn: process.env.NEXT_PUBLIC_ORG_ABN || '49 602 081 005',
  acn: process.env.NEXT_PUBLIC_ORG_ACN || '602 081 005',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.onsys.com.au',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
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
  bookingUrl: process.env.NEXT_PUBLIC_ORG_BOOKING_URL || 'https://onsys.com.au/appointment/',
  logo: process.env.NEXT_PUBLIC_ORG_LOGO || '/logo.png',
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
  locale: 'en_AU',
} as const;

export const navigation = {
  main: [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    { label: 'Services', href: '#', mega: true },
    { label: 'Expertise', href: '/expertise' },
    { label: 'Pricing', href: '/pricing-and-plans' },
    { label: 'Contact', href: '/contact' },
  ],
  /**
   * Services mega menu.
   *
   * Column titles mirror the four categories published on onsys.com.au, so the
   * navigation matches the language customers already associate with Onsys.
   * Items whose topic is a section of a larger page deep-link to that section's
   * anchor rather than dumping the visitor at the top of a shared page.
   */
  mega: [
    {
      title: 'Database',
      links: [
        { label: 'Managed Database Services', href: '/managed-database-services', sub: '24/7 monitoring & ITIL support' },
        { label: 'Remote On-Call DBA', href: '/on-call-dba-services', sub: 'Standby cover from $100/instance' },
        { label: 'Emergency Database Support', href: '/emergency-database-support', sub: 'Outage response, answered 24/7' },
        // Absorbs Performance Tuning and Database Health Checks — both pointed
        // at the same section of the same page. The terms live in the sub-label.
        { label: 'Database Consultancy', href: '/database-consultancy', sub: 'Advisory, tuning & health checks' },
        { label: 'Upgrades, Migrations & DR', href: '/database-upgrades-migrations-dr', sub: 'Version moves, clustering & failover' },
        { label: 'Fixed-Price Projects', href: '/pricing-and-plans', sub: 'Milestone-based delivery' },
      ],
    },
    {
      title: 'Infrastructure & Cloud',
      links: [
        { label: 'Managed IT Services', href: '/managed-it-services', sub: 'Outsourced IT from $4,500/month' },
        { label: 'Cloud Consultancy & Support', href: '/cloud-consultancy', sub: 'Strategy, architecture & FinOps' },
        // One entry rather than three identical links to /expertise.
        { label: 'Cloud Migrations', href: '/cloud-migrations', sub: 'Azure, AWS & Oracle Cloud (OCI)' },
        { label: 'System Administration', href: '/system-administration', sub: 'Windows, Linux, M365 & identity' },
        { label: 'Network & Firewalls', href: '/network-and-firewalls', sub: 'Cisco, Fortinet, Palo Alto' },
        { label: 'Virtualization & Storage', href: '/virtualization-and-storage', sub: 'VMware, NetApp, Dell EMC' },
      ],
    },
    {
      title: 'Software, Data & AI',
      links: [
        { label: 'Custom Software Development', href: '/custom-software-development', sub: 'Offshore & augmented teams' },
        { label: 'Mobile App Development', href: '/mobile-app-development', sub: 'iOS, Android, Flutter' },
        { label: 'Integration Services', href: '/integration-services', sub: 'ETL & automated data pipelines' },
        { label: 'AI Development & Solutions', href: '/artificial-intelligence-solutions', sub: 'Applied AI & automation' },
      ],
    },
    {
      // Ordered the way a buyer progresses: see what is happening, protect the
      // endpoint, protect the data and code, then prove it to an auditor.
      title: 'Cyber Security',
      links: [
        { label: 'Managed Security Services', href: '/managed-security-services', sub: '24/7 SOC, SIEM & threat hunting' },
        { label: 'Managed EDR', href: '/managed-endpoint-detection-and-response', sub: 'SentinelOne, with ransomware rollback' },
        { label: 'Data & Application Security', href: '/data-and-application-security', sub: 'Classification, DLP & secure code' },
        { label: 'GRC & Compliance', href: '/grc-and-compliance', sub: 'ISO 27001, Essential Eight, SOC 2' },
      ],
    },
  ],
  footer: {
    Services: [
      { label: 'Managed Services', href: '/managed-database-services' },
      { label: 'On-Call DBA Support', href: '/on-call-dba-services' },
      { label: 'Database Consultancy', href: '/database-consultancy' },
      { label: 'Upgrades, Migrations & DR', href: '/database-upgrades-migrations-dr' },
      { label: 'ETL & Integration', href: '/integration-services' },
      { label: 'Software Development', href: '/custom-software-development' },
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
      { label: 'Emergency Database Support', href: '/emergency-database-support' },
      { label: 'Pricing & Plans', href: '/pricing-and-plans' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Blog', href: '/blog' },
    ],
    Legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Use', href: '/terms' },
      { label: 'Disclaimer', href: '/disclaimer' },
    ],
  },
} as const;
