import { randomBytes } from 'node:crypto';
import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import type {
  AvailabilityDay,
  AvailabilityResponse,
  AvailabilitySlot,
  BookingInput,
} from '@onsys/shared';
import { booking as cfg, bookingConfigured, env } from '../lib/env';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import {
  formatInZone,
  graphLocalDateTime,
  zonedDateKey,
  zonedIsoWeekday,
  zonedTimeToUtc,
} from '../lib/timezone';

/**
 * Self-service consultation booking against one Microsoft 365 mailbox.
 *
 * Free/busy is read with `calendar/getSchedule` and the meeting is written with
 * `POST /events` carrying `isOnlineMeeting`, which makes Exchange mint the Teams
 * join link for us. Both are app-only calls, so no user ever signs in.
 *
 * The visitor is deliberately NOT added as a Graph attendee. Doing so would make
 * Exchange send the invitation from the consultant's mailbox, which publishes an
 * address the site is required to keep private. Instead we send our own branded
 * confirmation from the generic sender, carrying the join link and an .ics the
 * visitor's client can import. The consultant's calendar entry holds the
 * visitor's real contact details in its body.
 */

let cachedClient: Client | null = null;

function getGraphClient(): Client {
  if (cachedClient) return cachedClient;
  const credential = new ClientSecretCredential(
    env.GRAPH_TENANT_ID!,
    env.GRAPH_CLIENT_ID!,
    env.GRAPH_CLIENT_SECRET!,
  );
  cachedClient = Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const token = await credential.getToken('https://graph.microsoft.com/.default');
        if (!token) throw new Error('Failed to acquire Microsoft Graph access token');
        return token.token;
      },
    },
  });
  return cachedClient;
}

const MINUTE = 60_000;

/** Anything other than these means the consultant is unavailable. */
const NON_BLOCKING_GRAPH_STATUS = new Set(['free', 'workingElsewhere', 'unknown']);

interface Interval {
  start: number;
  end: number;
}

const overlaps = (a: Interval, b: Interval): boolean => a.start < b.end && b.start < a.end;

const parseHm = (value: string): { hour: number; minute: number } => {
  const [hour, minute] = value.split(':').map((n) => Number.parseInt(n, 10));
  return { hour, minute };
};

/** Add `n` days to a YYYY-MM-DD key without touching timezones. */
function addDays(dateKey: string, n: number): string {
  const [y, m, d] = dateKey.split('-').map((v) => Number.parseInt(v, 10));
  const shifted = new Date(Date.UTC(y, m - 1, d + n));
  return shifted.toISOString().slice(0, 10);
}

/**
 * Every slot the schedule permits in the given local-date range, before any
 * free/busy filtering. Slots are generated from wall-clock bounds so they stay
 * at 9:00–17:00 local across a DST changeover.
 */
export function generateCandidateSlots(fromKey: string, dayCount: number): AvailabilitySlot[] {
  const { hour: startHour, minute: startMinute } = parseHm(cfg.dayStart);
  const { hour: endHour, minute: endMinute } = parseHm(cfg.dayEnd);
  const slots: AvailabilitySlot[] = [];

  for (let i = 0; i < dayCount; i++) {
    const dateKey = addDays(fromKey, i);
    const [y, m, d] = dateKey.split('-').map((v) => Number.parseInt(v, 10));

    const dayOpens = zonedTimeToUtc(y, m, d, startHour, startMinute, cfg.timezone);
    const dayCloses = zonedTimeToUtc(y, m, d, endHour, endMinute, cfg.timezone);

    // Weekday is resolved from the instant the day opens, not from the date
    // key, so it is evaluated in the booking timezone rather than the server's.
    if (!cfg.workDays.includes(zonedIsoWeekday(dayOpens, cfg.timezone))) continue;

    for (
      let t = dayOpens.getTime();
      t + cfg.slotMinutes * MINUTE <= dayCloses.getTime();
      t += cfg.slotMinutes * MINUTE
    ) {
      const start = new Date(t);
      const end = new Date(t + cfg.slotMinutes * MINUTE);
      slots.push({
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        label: formatInZone(start, cfg.timezone, { hour: 'numeric', minute: '2-digit' }),
      });
    }
  }
  return slots;
}

/** Busy blocks on the consultant's calendar, widened by the configured buffer. */
async function fetchBusyIntervals(from: Date, to: Date): Promise<Interval[]> {
  const response = await getGraphClient()
    .api(`/users/${cfg.calendarUpn}/calendar/getSchedule`)
    // Without this, Graph echoes times in the mailbox's own zone and the
    // response would have to be re-interpreted. Pinning it to UTC makes the
    // parse below unambiguous.
    .header('Prefer', 'outlook.timezone="UTC"')
    .post({
      schedules: [cfg.calendarUpn],
      startTime: { dateTime: graphLocalDateTime(from, 'UTC'), timeZone: 'UTC' },
      endTime: { dateTime: graphLocalDateTime(to, 'UTC'), timeZone: 'UTC' },
      availabilityViewInterval: Math.min(cfg.slotMinutes, 60),
    });

  const schedule = response?.value?.[0];
  if (schedule?.error) {
    // A mailbox the app cannot see returns an error *inside* a 200 response.
    throw new Error(`getSchedule failed for the booking mailbox: ${schedule.error.message}`);
  }

  const items: Array<Record<string, any>> = schedule?.scheduleItems ?? [];
  const buffer = cfg.bufferMinutes * MINUTE;

  return items
    .filter((item) => !NON_BLOCKING_GRAPH_STATUS.has(String(item.status ?? 'busy')))
    .map((item) => ({
      // Graph omits the trailing Z even when the payload is UTC.
      start: Date.parse(`${item.start.dateTime.replace(/Z$/, '')}Z`) - buffer,
      end: Date.parse(`${item.end.dateTime.replace(/Z$/, '')}Z`) + buffer,
    }))
    .filter((i) => Number.isFinite(i.start) && Number.isFinite(i.end));
}

/** Slots already taken through this site, which Graph may not have caught up on. */
async function fetchBookedIntervals(from: Date, to: Date): Promise<Interval[]> {
  const rows = await prisma.booking.findMany({
    where: {
      status: { in: ['PENDING', 'CONFIRMED'] },
      startsAt: { gte: from, lt: to },
    },
    select: { startsAt: true, endsAt: true },
  });
  return rows.map((r) => ({ start: r.startsAt.getTime(), end: r.endsAt.getTime() }));
}

export async function getAvailability(fromKey?: string, days = 14): Promise<AvailabilityResponse> {
  const base: Omit<AvailabilityResponse, 'days'> = {
    enabled: bookingConfigured,
    timezone: cfg.timezone,
    slotMinutes: cfg.slotMinutes,
    consultantName: cfg.consultantName,
  };
  if (!bookingConfigured) return { ...base, days: [] };

  const now = new Date();
  const todayKey = zonedDateKey(now, cfg.timezone);
  // Never start before today, and never look past the booking horizon.
  const startKey = fromKey && fromKey > todayKey ? fromKey : todayKey;
  const horizonKey = addDays(todayKey, cfg.maxDaysAhead);
  if (startKey > horizonKey) return { ...base, days: [] };

  const candidates = generateCandidateSlots(startKey, days);
  if (candidates.length === 0) return { ...base, days: [] };

  const earliest = now.getTime() + cfg.minNoticeHours * 60 * MINUTE;
  // Midnight local at the start of the day after the horizon — an exclusive
  // upper bound, so the horizon day itself remains fully bookable.
  const [hy, hm, hd] = addDays(horizonKey, 1).split('-').map((v) => Number.parseInt(v, 10));
  const latest = zonedTimeToUtc(hy, hm, hd, 0, 0, cfg.timezone).getTime();

  const bookable = candidates.filter((s) => {
    const t = Date.parse(s.startsAt);
    return t >= earliest && t < latest;
  });
  if (bookable.length === 0) return { ...base, days: [] };

  const rangeFrom = new Date(Date.parse(bookable[0].startsAt));
  const rangeTo = new Date(Date.parse(bookable[bookable.length - 1].endsAt));

  const [busy, booked] = await Promise.all([
    fetchBusyIntervals(rangeFrom, rangeTo),
    fetchBookedIntervals(rangeFrom, rangeTo),
  ]);
  const blocking = [...busy, ...booked];

  const free = bookable.filter((slot) => {
    const window = { start: Date.parse(slot.startsAt), end: Date.parse(slot.endsAt) };
    return !blocking.some((b) => overlaps(window, b));
  });

  // Group into days, dropping any that ended up with nothing left.
  const byDate = new Map<string, AvailabilitySlot[]>();
  for (const slot of free) {
    const key = zonedDateKey(new Date(Date.parse(slot.startsAt)), cfg.timezone);
    const list = byDate.get(key);
    if (list) list.push(slot);
    else byDate.set(key, [slot]);
  }

  const result: AvailabilityDay[] = [...byDate.entries()].map(([date, slots]) => ({
    date,
    label: formatInZone(new Date(Date.parse(slots[0].startsAt)), cfg.timezone, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }),
    slots,
  }));

  return { ...base, days: result };
}

/** Crockford-ish alphabet: no I, L, O, U, so a reference reads unambiguously. */
const REF_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function makeReference(): string {
  const bytes = randomBytes(6);
  let out = '';
  for (const b of bytes) out += REF_ALPHABET[b % REF_ALPHABET.length];
  return `ONS-${out}`;
}

export class SlotUnavailableError extends Error {
  constructor(message = 'That time has just been taken. Please choose another.') {
    super(message);
    this.name = 'SlotUnavailableError';
  }
}

export class BookingDisabledError extends Error {
  constructor(message = 'Online booking is not available right now.') {
    super(message);
    this.name = 'BookingDisabledError';
  }
}

export interface BookingRequestMeta {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
}

/**
 * Reserve a slot: verify it is still genuinely free, hold it in Postgres, then
 * write the calendar event. The hold happens *before* the Graph write so two
 * simultaneous requests for one slot cannot both reach Graph — the partial
 * unique index on active bookings is what actually decides the winner.
 */
export async function createBooking(input: BookingInput, meta: BookingRequestMeta = {}) {
  if (!bookingConfigured) throw new BookingDisabledError();

  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) throw new SlotUnavailableError('That time is not valid.');
  const endsAt = new Date(startsAt.getTime() + cfg.slotMinutes * MINUTE);

  // Re-derive the day's legitimate slots rather than trusting the posted time:
  // a caller could otherwise book 03:00 on a Sunday, or a slot off the grid.
  const dateKey = zonedDateKey(startsAt, cfg.timezone);
  const legitimate = generateCandidateSlots(dateKey, 1).some((s) => s.startsAt === startsAt.toISOString());
  if (!legitimate) throw new SlotUnavailableError('That time is outside our booking hours.');

  const now = Date.now();
  if (startsAt.getTime() < now + cfg.minNoticeHours * 60 * MINUTE) {
    throw new SlotUnavailableError(
      `Please choose a time at least ${cfg.minNoticeHours} hours from now.`,
    );
  }
  if (startsAt.getTime() > now + cfg.maxDaysAhead * 24 * 60 * MINUTE) {
    throw new SlotUnavailableError(`We only take bookings ${cfg.maxDaysAhead} days ahead.`);
  }

  // Authoritative free/busy check for this one window. The grid the visitor is
  // looking at may be minutes old.
  const busy = await fetchBusyIntervals(startsAt, endsAt);
  const window = { start: startsAt.getTime(), end: endsAt.getTime() };
  if (busy.some((b) => overlaps(window, b))) throw new SlotUnavailableError();

  const reference = makeReference();
  const cancelToken = randomBytes(24).toString('base64url');

  let record;
  try {
    record = await prisma.booking.create({
      data: {
        reference,
        cancelToken,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        company: input.company?.trim() || null,
        phone: input.phone?.trim() || null,
        topic: input.topic?.trim() || null,
        message: input.message?.trim() || null,
        startsAt,
        endsAt,
        timezone: cfg.timezone,
        status: 'PENDING',
        utmSource: meta.utmSource || null,
        utmMedium: meta.utmMedium || null,
        utmCampaign: meta.utmCampaign || null,
        referrer: meta.referrer || null,
      },
    });
  } catch (error) {
    // P2002 on bookings_active_slot_key — someone else won the race.
    if ((error as { code?: string }).code === 'P2002') throw new SlotUnavailableError();
    throw error;
  }

  try {
    const event = await getGraphClient()
      .api(`/users/${cfg.calendarUpn}/events`)
      .post({
        subject: `Onsys consultation — ${input.name}${input.company ? ` (${input.company})` : ''}`,
        body: { contentType: 'HTML', content: buildEventBody(input, reference) },
        start: { dateTime: graphLocalDateTime(startsAt, cfg.timezone), timeZone: cfg.timezone },
        end: { dateTime: graphLocalDateTime(endsAt, cfg.timezone), timeZone: cfg.timezone },
        isOnlineMeeting: true,
        onlineMeetingProvider: 'teamsForBusiness',
        // See the note at the top of this file: adding the visitor here would
        // email them from the consultant's mailbox and expose that address.
        attendees: [],
        reminderMinutesBeforeStart: 15,
        // Idempotency key — a retried POST returns the original event instead
        // of creating a duplicate in the consultant's calendar.
        transactionId: record.id,
      });

    const joinUrl: string | null = event?.onlineMeeting?.joinUrl ?? null;
    if (!joinUrl) {
      logger.warn({ reference }, 'Calendar event created but Graph returned no Teams join URL');
    }

    return prisma.booking.update({
      where: { id: record.id },
      data: { status: 'CONFIRMED', graphEventId: event?.id ?? null, joinUrl },
    });
  } catch (error) {
    // Mark it FAILED rather than deleting: staff still need to see the request
    // and follow it up, and FAILED is excluded from the unique index so the
    // slot is released for someone else.
    logger.error({ err: error, reference }, 'Graph event creation failed for booking');
    await prisma.booking.update({ where: { id: record.id }, data: { status: 'FAILED' } });
    throw error;
  }
}

function buildEventBody(input: BookingInput, reference: string): string {
  const esc = (v: string) =>
    v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const row = (label: string, value?: string | null) =>
    value ? `<p style="margin:2px 0"><strong>${label}:</strong> ${esc(value)}</p>` : '';

  return [
    `<p><strong>Booked from the website</strong> — reference ${reference}</p>`,
    row('Name', input.name),
    row('Email', input.email),
    row('Company', input.company),
    row('Phone', input.phone),
    row('Topic', input.topic),
    input.message ? `<p style="margin-top:10px"><strong>What they said:</strong><br>${esc(input.message)}</p>` : '',
    `<p style="margin-top:10px;color:#667">The visitor was sent the Teams join link by email. They were not added as an attendee, so this invitation stays private to you.</p>`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Release a slot and remove the event from the consultant's calendar. */
export async function cancelBooking(token: string) {
  const record = await prisma.booking.findUnique({ where: { cancelToken: token } });
  if (!record) return null;
  if (record.status === 'CANCELLED') return record;

  if (record.graphEventId && bookingConfigured) {
    try {
      await getGraphClient()
        .api(`/users/${cfg.calendarUpn}/events/${record.graphEventId}`)
        .delete();
    } catch (error) {
      // Still cancel our side — a stale calendar entry is better than a booking
      // the visitor believes is cancelled but which our records still hold.
      logger.error({ err: error, reference: record.reference }, 'Graph event delete failed');
    }
  }

  return prisma.booking.update({
    where: { id: record.id },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  });
}

/** Human-readable slot description in the booking timezone. */
export function describeSlot(startsAt: Date): string {
  return formatInZone(startsAt, cfg.timezone, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
}
