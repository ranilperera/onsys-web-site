import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';
import { JsonLd } from '@/components/JsonLd';
import { siteConfig } from '@/lib/config';
import { breadcrumbSchema, buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Client Portal Login | Onsys DBPulse',
  description:
    'Sign in to Onsys DBPulse, the client monitoring portal — database availability, backups, security posture and patch currency across your estate, in one place.',
  path: '/client-portal',
  // Unadvertised until the portal is live: nothing links here, so a search
  // result pointing at a sign-in for a service that is not running yet would
  // be the only way anyone found it.
  noindex: !siteConfig.portalEnabled,
});

export const dynamic = 'force-static';

/**
 * Sign-in signpost for Onsys DBPulse.
 *
 * Deliberately NOT a login form. Credentials are only ever entered on
 * dbpulse.onsys.com.au, for two reasons that both matter:
 *
 *  - It could not work. DBPulse issues an Auth.js session cookie scoped to its
 *    own origin, and a form here cannot set a cookie for another domain. Its
 *    sign-in is also a multi-step flow — email OTP or TOTP on every login, plus
 *    account lockout and optional Entra SSO — and duplicating that here would
 *    mean maintaining security-critical logic in two codebases that drift.
 *
 *  - It would teach clients the wrong habit. A business that is used to typing
 *    its monitoring credentials into the marketing site is a business that will
 *    type them into a convincing copy of it.
 */
export default function ClientPortalPage() {
  const portal = siteConfig.portalUrl;

  return (
    <>
      <JsonLd
        data={[breadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Client portal' }])]}
      />

      <section className="page-hero">
        <div className="wrap">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Client portal' }]} />
        </div>
      </section>

      <section className="portal-section">
        <div className="wrap portal-grid">
          <div className="portal-card">
            <Image
              src="/dbpulse-logo.png"
              alt=""
              width={64}
              height={64}
              className="portal-logo"
            />
            <h1>Sign in to Onsys DBPulse</h1>
            <p className="portal-lede">
              Your database estate at a glance — availability, backups, security posture and patch
              currency across every monitored instance.
            </p>

            <a className="btn btn-primary btn-block" href={`${portal}/login`}>
              Continue to DBPulse
            </a>

            <p className="portal-note">
              You&rsquo;ll sign in at <strong>{portal.replace(/^https?:\/\//, '')}</strong>. We never
              ask for your portal password anywhere on this website — if a page on onsys.com.au ever
              does, it isn&rsquo;t us.
            </p>

            <ul className="portal-links">
              <li>
                <a href={`${portal}/forgot-password`}>Forgotten your password?</a>
              </li>
              <li>
                <a href={`${portal}/accept-invitation`}>Have an invitation link?</a>
              </li>
              <li>
                <Link href="/contact">No account yet — talk to us</Link>
              </li>
            </ul>
          </div>

          <aside className="portal-aside">
            <h2>What DBPulse shows you</h2>
            <ul className="portal-features">
              <li>
                <strong>Availability</strong> — every monitored instance, with history rather than a
                single green tick.
              </li>
              <li>
                <strong>Backups</strong> — what ran, what succeeded, and what has never been
                restore-tested.
              </li>
              <li>
                <strong>Security posture</strong> — privileged access, encryption and configuration
                drift.
              </li>
              <li>
                <strong>Patch currency</strong> — which instances are behind, and how far past
                vendor support.
              </li>
            </ul>

            <p className="portal-privacy">
              DBPulse collects metadata and metrics only — never row data from your databases. The
              collector runs at your site and connects outbound only, so nothing is installed on your
              database servers and no inbound firewall rule is needed.
            </p>

            <div className="portal-help">
              <h3>Trouble signing in?</h3>
              <p>
                Call <a href={`tel:${siteConfig.phoneE164}`}>{siteConfig.phone}</a> or email{' '}
                <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>. Support is available
                24/7 for clients on a monthly plan.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
