import { describe, expect, it } from 'vitest';
import { generateCandidateSlots } from '../services/booking.service';
import { formatInZone, zonedDateKey, zonedIsoWeekday, zonedTimeToUtc } from '../lib/timezone';

const TZ = 'Australia/Melbourne';
const localTime = (iso: string) =>
  formatInZone(new Date(iso), TZ, { hour: '2-digit', minute: '2-digit', hour12: false });

describe('timezone helpers', () => {
  it('resolves wall-clock time to UTC across both DST offsets', () => {
    // Winter: AEST, UTC+10.
    expect(zonedTimeToUtc(2026, 6, 15, 9, 0, TZ).toISOString()).toBe('2026-06-14T23:00:00.000Z');
    // Summer: AEDT, UTC+11.
    expect(zonedTimeToUtc(2026, 12, 15, 9, 0, TZ).toISOString()).toBe('2026-12-14T22:00:00.000Z');
  });

  it('spans the spring-forward gap by one UTC hour, not two', () => {
    // 01:30 and 03:30 are two wall-clock hours apart on the changeover day, but
    // 02:00-03:00 never happens, so they are only one real hour apart.
    const before = zonedTimeToUtc(2026, 10, 4, 1, 30, TZ).getTime();
    const after = zonedTimeToUtc(2026, 10, 4, 3, 30, TZ).getTime();
    expect(after - before).toBe(60 * 60 * 1000);
  });

  it('reports the weekday in the booking zone, not the server zone', () => {
    // 20:00Z Sunday is already Monday in Melbourne.
    expect(zonedIsoWeekday(new Date('2026-08-23T20:00:00Z'), TZ)).toBe(1);
  });
});

describe('slot generation', () => {
  it('skips weekends', () => {
    // Sat 29 and Sun 30 August 2026.
    expect(generateCandidateSlots('2026-08-29', 2)).toHaveLength(0);
  });

  it('fills a working day between the configured bounds', () => {
    const slots = generateCandidateSlots('2026-08-25', 1); // Tuesday
    // 09:00-17:00 in 30-minute steps.
    expect(slots).toHaveLength(16);
    expect(localTime(slots[0].startsAt)).toBe('09:00');
    expect(localTime(slots[slots.length - 1].startsAt)).toBe('16:30');
    // The last slot must finish by close, never run past it.
    expect(localTime(slots[slots.length - 1].endsAt)).toBe('17:00');
  });

  it('keeps the day starting at 09:00 local through a DST changeover', () => {
    // Mon 5 Oct 2026 — the day after Melbourne moves to AEDT.
    const slots = generateCandidateSlots('2026-10-05', 1);
    expect(localTime(slots[0].startsAt)).toBe('09:00');
    // Which is a different UTC instant from a winter 09:00.
    expect(slots[0].startsAt).toBe('2026-10-04T22:00:00.000Z');
  });

  it('never emits a slot that crosses the end of the day', () => {
    const slots = generateCandidateSlots('2026-08-24', 5); // Mon-Fri
    expect(slots).toHaveLength(80);
    for (const s of slots) {
      // The Melbourne calendar date, not the UTC one — a 09:00 local slot falls
      // on the previous UTC day, so slicing the ISO string picks the wrong day.
      const [y, m, d] = zonedDateKey(new Date(s.startsAt), TZ).split('-').map(Number);
      expect(Date.parse(s.endsAt)).toBeLessThanOrEqual(zonedTimeToUtc(y, m, d, 17, 0, TZ).getTime());
    }
  });
});
