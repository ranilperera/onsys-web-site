import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SvgSprite } from '@/components/SvgSprite';
import { ChatWidget } from '@/components/ChatWidget';
import { AttributionCapture } from '@/components/AttributionCapture';
import { JsonLd } from '@/components/JsonLd';
import { siteConfig } from '@/lib/config';
import { organizationSchema, localBusinessSchema, websiteSchema } from '@/lib/seo';

/**
 * Plus Jakarta Sans (headings) and DM Sans (body), both SIL Open Font License
 * 1.1 — free to use and redistribute commercially, so shipping the files in
 * this repository is exactly what the licence is for.
 *
 * Served from ./fonts rather than fetched from Google during the build.
 * Visitors saw no difference either way — next/font self-hosts, which our CSP
 * (`font-src 'self' data:`) requires — but the build did: `next/font/google`
 * asks fonts.googleapis.com for CSS and parses it with regexes, and Google
 * varies that CSS by User-Agent. A recognised Chrome is sent woff2 with
 * per-subset blocks; anything else is sent legacy TTF with no subset comments
 * at all, which the parser reads as null and reports as
 * "Cannot read properties of null (reading '1')". That is what failed the
 * production build on the VM, where something in the egress path does not
 * present the loader's User-Agent unchanged. The same request from two
 * slightly different agents here returned two different formats, so the fetch
 * was never a dependable step in a deploy.
 *
 * Both files are the variable versions: one file per family covering every
 * weight, 64KB for the pair, which is why the `weight` below is a range rather
 * than a list.
 */
const headingFont = localFont({
  src: [{ path: './fonts/plus-jakarta-sans-variable.woff2', weight: '500 800', style: 'normal' }],
  variable: '--font-heading',
  display: 'swap',
  // The stack a browser uses for the moment before the file lands, and for
  // ever if it fails to.
  fallback: ['system-ui', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
});

const bodyFont = localFont({
  src: [{ path: './fonts/dm-sans-variable.woff2', weight: '400 700', style: 'normal' }],
  variable: '--font-body',
  display: 'swap',
  fallback: ['system-ui', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | Managed Database, Cloud & IT Services Australia`,
    template: `%s | ${siteConfig.shortName}`,
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
        <AttributionCapture />

        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <>
            <script
              defer
              data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
              src="https://plausible.io/js/script.js"
            />
            {/* Queue stub, required before any custom event can be sent.
                script.js is deferred, so a visitor who submits a form quickly
                would otherwise call window.plausible before it exists and the
                conversion would be lost. The stub collects those calls and the
                script replays them once it loads. Straight from Plausible's own
                documentation; 'unsafe-inline' in the CSP already covers it. */}
            <script
              dangerouslySetInnerHTML={{
                __html:
                  'window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}',
              }}
            />
          </>
        )}
      </body>
    </html>
  );
}
