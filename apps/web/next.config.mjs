import { parse as parseEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Organisation details are authored once as ORG_* in the monorepo root .env,
 * which Next does not read — it only looks in its own project directory.
 *
 * The file is parsed rather than loaded into process.env on purpose: the root
 * .env also holds deployment values such as NEXT_PUBLIC_API_URL pointing at
 * production, and adopting those wholesale would make local dev fetch content
 * from the live site. Only ORG_* keys are taken, and only when not already set
 * in the environment.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(here, '../../.env');
const rootEnv = fs.existsSync(rootEnvPath) ? parseEnv(fs.readFileSync(rootEnvPath)) : {};

const ORG_KEYS = [
  'NAME', 'SHORT_NAME', 'LEGAL_NAME', 'ABN', 'ACN', 'EMAIL', 'PHONE', 'PHONE_E164',
  'STREET', 'LOCALITY', 'REGION', 'POSTCODE', 'COUNTRY', 'BOOKING_URL',
  'DESCRIPTION', 'TAGLINE', 'LOGO', 'LOGO_HEADER', 'LINKEDIN', 'FACEBOOK', 'TWITTER', 'YOUTUBE',
];
const orgEnv = Object.fromEntries(
  ORG_KEYS
    .map((k) => [k, process.env[`ORG_${k}`] ?? rootEnv[`ORG_${k}`]])
    .filter(([, v]) => v)
    .map(([k, v]) => [`NEXT_PUBLIC_ORG_${k}`, v]),
);

/**
 * Shared secret for /api/revalidate, taken from the root .env for local dev.
 *
 * Set on process.env rather than through `env` below: `env` values are inlined
 * into the build output, and a secret does not belong there. In Docker this is
 * supplied by the compose `environment:` block instead, because a standalone
 * build loads a serialised config and does not re-run this file at runtime.
 */
if (!process.env.REVALIDATE_SECRET && rootEnv.REVALIDATE_SECRET) {
  process.env.REVALIDATE_SECRET = rootEnv.REVALIDATE_SECRET;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: orgEnv,
  // Traces the exact files the server needs into .next/standalone, which is
  // what makes the container image a few hundred megabytes instead of well over
  // a gigabyte of hoisted workspace dependencies. Harmless outside Docker: the
  // dev server and `next start` ignore it.
  output: 'standalone',
  // Without this, tracing stops at apps/web and misses @onsys/shared, which is
  // a workspace sibling rather than a published package.
  outputFileTracingRoot: path.resolve(here, '../..'),
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'www.onsys.com.au' },
      { protocol: 'https', hostname: 'onsys.com.au' },
    ],
  },
  /**
   * llms.txt is served from two paths.
   *
   * llmstxt.org puts it at the site root, but crawlers increasingly look under
   * /.well-known/ (RFC 8615) as the conventional home for machine-readable
   * metadata. A rewrite rather than a second route handler, so there is one
   * implementation and the two can never drift — and a rewrite, not a redirect,
   * so a client that finds it under /.well-known gets the content rather than a
   * 301 it may not follow.
   */
  async rewrites() {
    return [{ source: '/.well-known/llms.txt', destination: '/llms.txt' }];
  },

  async headers() {
    /**
     * `next dev` runs React Fast Refresh and the webpack HMR client, both of
     * which evaluate strings. Without 'unsafe-eval' the client bundle throws on
     * load and NOTHING hydrates — every interactive component silently dies
     * while the server-rendered markup still looks fine.
     *
     * The relaxations below are development-only; the production policy is
     * unchanged and stays strict.
     */
    const isDev = process.env.NODE_ENV !== 'production';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    const csp = [
      "default-src 'self'",
      // Next.js injects inline bootstrap scripts; 'unsafe-inline' is required for them.
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://plausible.io https://challenges.cloudflare.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "frame-src https://www.youtube-nocookie.com https://www.youtube.com https://challenges.cloudflare.com",
      // HMR needs the dev websocket; the local API is plain http.
      // challenges.cloudflare.com needs all three of script-src, frame-src and
      // connect-src: the widget loads a script, renders an iframe, and the script
      // then calls back to Cloudflare. Allowing only the first two lets the script
      // load and then fail, which surfaces as "the spam check could not load".
      `connect-src 'self' https://plausible.io https://challenges.cloudflare.com ${apiUrl}${isDev ? ' ws: wss: http://localhost:* http://127.0.0.1:*' : ''}`,
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      // Would rewrite every local http:// call to https:// and break the dev API.
      ...(isDev ? [] : ['upgrade-insecure-requests']),
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

export default nextConfig;
