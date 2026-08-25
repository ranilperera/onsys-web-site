/**
 * Minimal IANA-timezone arithmetic built on Intl.
 *
 * Booking slots are defined in wall-clock terms ("09:00 Melbourne") but have to
 * be stored and compared as UTC instants. Melbourne observes DST, so the offset
 * is not a constant and cannot be hardcoded — on the changeover days a naive
 * fixed-offset conversion silently produces slots an hour out.
 *
 * The project has no date library, and these four functions are all that the
 * booking service needs, so they live here rather than pulling one in.
 */

const partsOf = (date: Date, timeZone: string): Record<string, number> => {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const out: Record<string, number> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== 'literal') out[part.type] = Number.parseInt(part.value, 10);
  }
  // 'en-US' with hour12:false renders midnight as hour 24 in some ICU builds.
  if (out.hour === 24) out.hour = 0;
  return out;
};

/** Milliseconds the zone is ahead of UTC at the given instant. */
export function zoneOffsetMs(date: Date, timeZone: string): number {
  const p = partsOf(date, timeZone);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asIfUtc - date.getTime();
}

/**
 * Resolve a wall-clock time in `timeZone` to the UTC instant it denotes.
 *
 * The offset depends on the instant we are trying to find, so this guesses,
 * measures the offset at the guess, corrects, then measures again. The second
 * pass is what makes a DST boundary come out right.
 */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const firstPass = new Date(guess - zoneOffsetMs(new Date(guess), timeZone));
  return new Date(guess - zoneOffsetMs(firstPass, timeZone));
}

/** Local calendar date in `timeZone` for an instant, as YYYY-MM-DD. */
export function zonedDateKey(date: Date, timeZone: string): string {
  const p = partsOf(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** ISO weekday in `timeZone`, 1 = Monday … 7 = Sunday. */
export function zonedIsoWeekday(date: Date, timeZone: string): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date);
  const index = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(name);
  return index + 1;
}

/** Format an instant for display in `timeZone`, e.g. "Tue 26 Aug" / "9:30 am". */
export function formatInZone(
  date: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat('en-AU', { timeZone, ...options })
    .format(date)
    // en-AU renders "9:30 am" as "9:30 am" on Node but "9:30 AM" on some ICU
    // builds; normalise so the UI is stable wherever the API happens to run.
    .replace(/\b(AM|PM)\b/g, (m) => m.toLowerCase());
}

/** The `YYYY-MM-DDTHH:mm:ss` shape Graph wants alongside an explicit timeZone. */
export function graphLocalDateTime(date: Date, timeZone: string): string {
  const p = partsOf(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
}
