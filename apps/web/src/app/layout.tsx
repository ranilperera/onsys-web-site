import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, DM_Sans } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SvgSprite } from '@/components/SvgSprite';
import { ChatWidget } from '@/components/ChatWidget';
import { JsonLd } from '@/components/JsonLd';
import { siteConfig } from '@/lib/config';
import { organizationSchema, localBusinessSchema, websiteSchema } from '@/lib/seo';

/**
 * Plus Jakarta Sans (headings) and DM Sans (body), both SIL Open Font License
 * 1.1 — free to use and redistribute commercially, so there is no font
 * licensing exposure in shipping them.
 *
 * next/font self-hosts the woff2 files at build time. That matters here beyond
 * performance: our CSP is `font-src 'self' data:`, so a request to Google's CDN
 * would be blocked outright. Self-hosting also means no third-party request per
 * visitor, which keeps the privacy policy honest.
 */
const headingFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-heading',
  display: 'swap',
});

const bodyFont = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | Managed Database, Cloud & IT Services Australia`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.legalName, url: siteConfig.url }],
  creator: siteConfig.legalName,
  publisher: siteConfig.legalName,
  formatDetection: { telephone: true, address: true, email: true },
  icons: {
    // favicon.ico carries 16/32/48 with alpha for light and dark tab strips;
    // the PNG sizes are flattened to white because iOS and Android render a
    // transparent centre as black on the home screen.
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/manifest.webmanifest',
  alternates: { canonical: '/' },
  verification: {
    // Populate from Search Console / Bing Webmaster Tools when available.
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0E336A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body>
        {/* Site-wide entity graph — emitted once, referenced by @id elsewhere. */}
        <JsonLd data={[organizationSchema(), localBusinessSchema(), websiteSchema()]} />

        <a href="#main" className="skip-link">
          Skip to main content
        </a>

        <SvgSprite />
        <Header />

        <main id="main">{children}</main>

        <Footer />
        <ChatWidget />

        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <script
            defer
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
          />
        )}
      </body>
    </html>
  );
}
