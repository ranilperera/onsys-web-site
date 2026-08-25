import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

/**
 * The .env lives at the monorepo root, but npm runs workspace scripts with the
 * cwd set to apps/api — so a bare dotenv.config() finds nothing and every var
 * reads as missing. Walk up from this file instead (works from src/ under tsx
 * and from dist/ after a build). Containers inject real env vars and have no
 * file, which is fine: dotenv never overwrites what is already set.
 */
function loadDotenv(): void {
  let dir = __dirname;
  for (;;) {
    const candidate = path.join(dir, '.env');
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      return;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}

loadDotenv();

/**
 * Placeholder keys in .env are left as `TEAMS_WEBHOOK_URL=` rather than deleted.
 * An empty string is "not configured", not "configured with a bad value", so
 * drop blanks before validation or every optional url/email field fails.
 */
const rawEnv = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== undefined && value !== ''),
);

/**
 * Fail fast on misconfiguration. A missing Graph secret should stop the process
 * at boot, not silently swallow contact-form emails in production.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Public site origin — used for CORS, canonicals and links inside emails.
  SITE_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:4000'),

  // --- Microsoft Graph (transactional email) ---
  // App registration with Application permission Mail.Send, admin-consented.
  GRAPH_TENANT_ID: z.string().optional(),
  GRAPH_CLIENT_ID: z.string().optional(),
  GRAPH_CLIENT_SECRET: z.string().optional(),
  /// Mailbox the notifications are sent *from* (must exist in the tenant).
  GRAPH_SENDER_UPN: z.string().email().optional(),
  /// Where new enquiries land.
  LEAD_NOTIFY_TO: z.string().default('sales@onsys.com.au'),

  // --- Microsoft Teams (chat escalation) ---
  /// Simplest path: an Incoming Webhook URL on the target channel.
  TEAMS_WEBHOOK_URL: z.string().url().optional(),
  /// Richer path: Graph channel post + reply polling.
  TEAMS_TEAM_ID: z.string().optional(),
  TEAMS_CHANNEL_ID: z.string().optional(),
  /// Shared secret validating inbound replies from a Teams bot/Power Automate flow.
  TEAMS_INBOUND_SECRET: z.string().optional(),

  // --- Booking / appointments ---
  // Free/busy is read from, and the meeting is written to, this one mailbox.
  // Requires Application permission Calendars.ReadWrite, admin-consented, and
  // ideally an Application Access Policy scoping the app to just this mailbox.
  BOOKING_CALENDAR_UPN: z.string().email().optional(),
  /// Public-facing identity of whoever takes the call. The requirement is that
  /// a visitor never sees the consultant's real mailbox address.
  BOOKING_CONSULTANT_NAME: z.string().default('Onsys Consultant'),
  /// IANA zone the published slots are expressed in.
  BOOKING_TIMEZONE: z.string().default('Australia/Melbourne'),
  BOOKING_SLOT_MINUTES: z.coerce.number().int().min(15).max(120).default(30),
  /// Local wall-clock bounds of a bookable day, HH:mm.
  BOOKING_DAY_START: z.string().regex(/^\d{2}:\d{2}$/).default('09:00'),
  BOOKING_DAY_END: z.string().regex(/^\d{2}:\d{2}$/).default('17:00'),
  /// ISO weekdays that accept bookings — 1 = Monday.
  BOOKING_WORK_DAYS: z.string().default('1,2,3,4,5'),
  /// Nobody can book a slot starting sooner than this.
  BOOKING_MIN_NOTICE_HOURS: z.coerce.number().int().min(0).max(168).default(4),
  BOOKING_MAX_DAYS_AHEAD: z.coerce.number().int().min(1).max(120).default(21),
  /// Keeps a slot clear of an adjacent meeting by this many minutes.
  BOOKING_BUFFER_MINUTES: z.coerce.number().int().min(0).max(60).default(10),

  // --- Chatbot ---
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_CHAT_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  /// Below this cosine similarity we treat retrieval as "no good answer".
  RAG_MIN_SCORE: z.coerce.number().default(0.28),

  // --- Organisation details ---
  // Authored once in .env and consumed by emails, seeded page copy and schema.
  ORG_NAME: z.string().default('Onsys Technologies'),
  ORG_LEGAL_NAME: z.string().default('Onsys Technologies Pty Ltd'),
  ORG_ABN: z.string().default('49 602 081 005'),
  ORG_ACN: z.string().default('602 081 005'),
  ORG_EMAIL: z.string().default('sales@onsys.com.au'),
  ORG_PHONE: z.string().default('1800 431 416'),
  ORG_PHONE_E164: z.string().default('+611800431416'),
  ORG_STREET: z.string().default('Level 1, 530 Little Collins Street'),
  ORG_LOCALITY: z.string().default('Melbourne'),
  ORG_REGION: z.string().default('VIC'),
  ORG_POSTCODE: z.string().default('3000'),
  ORG_COUNTRY: z.string().default('AU'),
  ORG_BOOKING_URL: z.string().default('/book'),

  // --- Security ---
  SESSION_SECRET: z.string().min(16).default('change-me-in-production-please!!'),
  TURNSTILE_SECRET: z.string().optional(),
  ADMIN_ORIGIN: z.string().optional(),
});

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === 'production';

/** Graph email is only wired up when every required credential is present. */
export const graphConfigured = Boolean(
  env.GRAPH_TENANT_ID && env.GRAPH_CLIENT_ID && env.GRAPH_CLIENT_SECRET && env.GRAPH_SENDER_UPN,
);

export const teamsConfigured = Boolean(env.TEAMS_WEBHOOK_URL || (env.TEAMS_TEAM_ID && env.TEAMS_CHANNEL_ID));

/**
 * Booking needs the same app registration as Graph email plus a target
 * mailbox. Without it the API still answers, but reports itself as disabled so
 * the web app can fall back to the contact form instead of showing dead slots.
 */
export const bookingConfigured = Boolean(
  env.GRAPH_TENANT_ID && env.GRAPH_CLIENT_ID && env.GRAPH_CLIENT_SECRET && env.BOOKING_CALENDAR_UPN,
);

export const booking = {
  calendarUpn: env.BOOKING_CALENDAR_UPN,
  consultantName: env.BOOKING_CONSULTANT_NAME,
  timezone: env.BOOKING_TIMEZONE,
  slotMinutes: env.BOOKING_SLOT_MINUTES,
  dayStart: env.BOOKING_DAY_START,
  dayEnd: env.BOOKING_DAY_END,
  workDays: env.BOOKING_WORK_DAYS.split(',')
    .map((d) => Number.parseInt(d.trim(), 10))
    .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7),
  minNoticeHours: env.BOOKING_MIN_NOTICE_HOURS,
  maxDaysAhead: env.BOOKING_MAX_DAYS_AHEAD,
  bufferMinutes: env.BOOKING_BUFFER_MINUTES,
} as const;

export const aiConfigured = Boolean(env.OPENAI_API_KEY);

/**
 * Organisation details in one shape, so page copy, emails and chat replies can
 * interpolate them instead of hardcoding. Change the values in .env.
 */
export const org = {
  name: env.ORG_NAME,
  legalName: env.ORG_LEGAL_NAME,
  abn: env.ORG_ABN,
  acn: env.ORG_ACN,
  email: env.ORG_EMAIL,
  phone: env.ORG_PHONE,
  phoneE164: env.ORG_PHONE_E164,
  bookingUrl: env.ORG_BOOKING_URL,
  address: {
    street: env.ORG_STREET,
    locality: env.ORG_LOCALITY,
    region: env.ORG_REGION,
    postalCode: env.ORG_POSTCODE,
    country: env.ORG_COUNTRY,
  },
  /** "Level 1, 530 Little Collins Street, Melbourne VIC 3000" */
  get postalAddress(): string {
    return `${env.ORG_STREET}, ${env.ORG_LOCALITY} ${env.ORG_REGION} ${env.ORG_POSTCODE}`;
  },
} as const;
