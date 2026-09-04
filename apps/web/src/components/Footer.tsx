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
};

const socialLabels: Record<string, string> = {
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  twitter: 'X (formerly Twitter)',
  youtube: 'YouTube',
};

export async function Footer() {
  // Admin-managed; falls back to the built-in list if the API is unreachable.
  const footerGroups = await getFooterNav();

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

        <div className="foot-bottom">
          <span>
            © {new Date().getFullYear()} {siteConfig.legalName} · ABN {siteConfig.abn} · ACN{' '}
            {siteConfig.acn}
          </span>
          <span>
            <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a> ·{' '}
            <a href={`tel:${siteConfig.phoneE164}`}>{siteConfig.phone}</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
