import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/config';

/**
 * Web app manifest. Organisation details come from siteConfig so the installed
 * name tracks ORG_NAME in .env rather than being hardcoded here.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0E336A',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      // `maskable` lets Android crop to its adaptive-icon shape without the
      // mark being clipped, since the source has margin around the ring.
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
