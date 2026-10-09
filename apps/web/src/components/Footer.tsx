import Link from 'next/link';
import Image from 'next/image';
import { siteConfig } from '@/lib/config';
import { getFooterNav } from '@/lib/api';

const socialIcons: Record<string, string> = {
  linkedin:
    'M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.15 1.45-2.15 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z',
  facebook:
    'M13.5 21v-7.5h2.5l.5-3H13.5V8.5c0-.9.25-1.5 1.53-1.5H16.5V4.35C16.2 4.3 15.2 4.2 14 4.2c-2.4 0-4 1.46-4 4.15V10.5H7.5v3H10V21h3.5z',
  twitter:
    'M18.9 3.5h3.1l-6.8 7.8L23 20.5h-6.3l-4.9-6.4-5.6 6.4H3l7.3-8.3L3.4 3.5h6.5l4.4 5.8 4.6-5.8zm-1.1 15.3h1.7L8.3 5.1H6.5l11.3 13.7z',
  youtube:
    'M22 12s0-3.2-.4-4.7c-.2-.9-.9-1.6-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.5c-.9.2-1.6.9-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.7c.2.9.9 1.6 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.5c.9-.2 1.6-.9 1.8-1.8.4-1.5.4-4.7.4-4.7zM10 15.3V8.7l5.8 3.3-5.8 3.3z',
  instagram:
    'M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8zm8.9 1.9a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4zM12 6.9a5.1 5.1 0 1 1 0 10.2 5.1 5.1 0 0 1 0-10.2zm0 2a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2z',
  tiktok:
    'M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.6c.26 0 .52.04.77.12V9.66a5.7 5.7 0 0 0-.77-.05 5.7 5.7 0 1 0 5.69 5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.3 4.3 0 0 1-3.25-1.48z',
};

const socialLabels: Record<string, string> = {
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  twitter: 'X (formerly Twitter)',
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
};

/**
 * The group rendered beside the copyright rather than as a column.
 *
 * The grid is a brand column plus four link columns, and the footer now mirrors
 * the top navigation — Database, Cloud IT & AI, Company, Support — which uses
 * all four. Privacy, terms and the disclaimer are the links every site puts on
 * the bottom line anyway, so they go there and the columns stay aligned with
 * the menu.
 */
const BOTTOM_BAR_GROUP = 'Legal';

export async function Footer() {
  // Admin-managed; falls back to the built-in list if the API is unreachable.
  const nav = await getFooterNav();
  const footerGroups = Object.fromEntries(
    Object.entries(nav).filter(([heading]) => heading !== BOTTOM_BAR_GROUP),
  );
  const legalLinks = nav[BOTTOM_BAR_GROUP] ?? [];

  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-logo">
            <Image src={siteConfig.logo} alt={siteConfig.name} width={220} height={64} />
            <p style={{ maxWidth: 280, color: '#605E5C' }}>
              {siteConfig.address.street}, {siteConfig.address.locality} {siteConfig.address.region}{' '}
              {siteConfig.address.postalCode}
              <br />
              {siteConfig.tagline}
            </p>
            <div className="foot-social">
              {/* '#' is the placeholder for an account that does not exist yet;
                  rendering it produces a link that goes nowhere. */}
              {Object.entries(siteConfig.social)
                .filter(([, href]) => href !== '#')
                .map(([key, href]) => (
                  <a
                    key={key}
                    href={href}
                    aria-label={socialLabels[key] ?? key}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d={socialIcons[key]} />
                    </svg>
                  </a>
                ))}
            </div>
          </div>

          {Object.entries(footerGroups).map(([heading, links]) => (
            <div key={heading}>
              <h4>{heading}</h4>
              <ul>
                {links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Trademark attribution for the partner marks and certification badges
            shown on the home page, /certifications and /expertise. It lives
            here rather than under each grid: it is the same statement in every
            case, it is a legal notice rather than a selling point, and the
            footer is on every page the marks can appear on. */}
        <p className="foot-legal">
          All product names, logos, badges and trademarks are the property of their respective
          owners. Partner and certification marks shown on this site indicate partnerships and
          credentials held by {siteConfig.legalName}, and do not imply endorsement by the vendors
          or certification bodies concerned.
        </p>

        <div className="foot-bottom">
          <span>
            © {new Date().getFullYear()} {siteConfig.legalName} · ABN {siteConfig.abn} · ACN{' '}
            {siteConfig.acn}
          </span>
          <span>
            <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a> ·{' '}
            <a href={`tel:${siteConfig.phoneE164}`}>{siteConfig.phone}</a>
          </span>
          {legalLinks.length > 0 && (
            <span className="foot-legal-links">
              {legalLinks.map((link, i) => (
                <span key={link.href}>
                  {i > 0 && ' · '}
                  <Link href={link.href}>{link.label}</Link>
                </span>
              ))}
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
