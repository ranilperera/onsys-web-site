import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SvgSprite } from '@/components/SvgSprite';
import { ChatWidget } from '@/components/ChatWidget';
import { JsonLd } from '@/components/JsonLd';
import { siteConfig } from '@/lib/config';
import { organizationSchema, localBusinessSchema, websiteSchema } from '@/lib/seo';

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
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
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
    <html lang="en-AU">
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
