/**
 * Which country a lead came from.
 *
 * There is no geo-IP anywhere in this stack: HAProxy forwards X-Forwarded-For
 * and nothing else, and adding an IP-location service would mean sending a
 * visitor's address to a third party to answer a reporting question. So the
 * country is derived from two signals the visit already carries — the browser's
 * IANA time zone, sent with the form, and the Accept-Language header.
 *
 * This is a hint, not a location. A VPN, a traveller, or a laptop still set to
 * the time zone of a previous posting will all be misread, and the function
 * returns null rather than guessing when the signals do not agree with anything
 * it knows. It is good enough for the question being asked — how many of these
 * leads are Australian and New Zealand — and should never be treated as fact
 * about an individual.
 */

/**
 * Zone prefixes that resolve a country on their own.
 *
 * Australia/* and Pacific/* are enumerated because they are the markets being
 * measured and the ones the reporting turns on. The rest of the list is the
 * countries the current traffic actually comes from, so that "not Australia"
 * can be reported as something more useful than "unknown".
 */
const ZONE_COUNTRY: Record<string, string> = {
  // Australia — every zone, including the ones nobody remembers.
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU',
  'Australia/Adelaide': 'AU',
  'Australia/Hobart': 'AU',
  'Australia/Darwin': 'AU',
  'Australia/Canberra': 'AU',
  'Australia/Broken_Hill': 'AU',
  'Australia/Lindeman': 'AU',
  'Australia/Lord_Howe': 'AU',
  'Australia/Eucla': 'AU',
  'Australia/Currie': 'AU',
  'Antarctica/Macquarie': 'AU',
  // New Zealand.
  'Pacific/Auckland': 'NZ',
  'Pacific/Chatham': 'NZ',
  // Pacific markets named in the growth plan.
  'Pacific/Fiji': 'FJ',
  'Pacific/Port_Moresby': 'PG',
  'Pacific/Bougainville': 'PG',
  'Pacific/Apia': 'WS',
  'Pacific/Tongatapu': 'TO',
  'Pacific/Efate': 'VU',
  'Pacific/Guadalcanal': 'SB',
  'Pacific/Noumea': 'NC',
  'Pacific/Tarawa': 'KI',
  'Pacific/Funafuti': 'TV',
  'Pacific/Nauru': 'NR',
  'Pacific/Palau': 'PW',
  'Pacific/Rarotonga': 'CK',
  'Pacific/Niue': 'NU',
  'Pacific/Norfolk': 'NF',
  // Where the blog traffic is coming from today.
  'Asia/Colombo': 'LK',
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Asia/Karachi': 'PK',
  'Asia/Dhaka': 'BD',
  'Asia/Kathmandu': 'NP',
  'Asia/Singapore': 'SG',
  'Asia/Manila': 'PH',
  'Asia/Dubai': 'AE',
  'Asia/Jakarta': 'ID',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Bangkok': 'TH',
  'Asia/Ho_Chi_Minh': 'VN',
  'Asia/Tokyo': 'JP',
  'Asia/Shanghai': 'CN',
  'Asia/Hong_Kong': 'HK',
  'Europe/London': 'GB',
  'Europe/Dublin': 'IE',
  'Africa/Johannesburg': 'ZA',
};

/** Regions we accept from a locale tag. Anything else is treated as unknown. */
const ISO_REGION = /^[A-Z]{2}$/;

/**
 * The region of a BCP 47 tag: 'en-AU' -> 'AU'.
 *
 * A bare 'en' carries no region, and a browser left on the default 'en-US' in
 * Melbourne is exactly why this is only ever a fallback behind the time zone.
 */
export function regionFromLocale(locale: string | null | undefined): string | null {
  if (!locale) return null;
  for (const part of locale.split('-').slice(1)) {
    const upper = part.toUpperCase();
    if (ISO_REGION.test(upper)) return upper;
  }
  return null;
}

/**
 * The first usable region in an Accept-Language header.
 *
 * Quality values are ignored: browsers list languages in preference order
 * already, and re-sorting by q-value adds a parser for no gain here.
 */
export function regionFromAcceptLanguage(header: string | null | undefined): string | null {
  if (!header) return null;
  for (const entry of header.split(',')) {
    const tag = entry.split(';')[0]?.trim();
    const region = regionFromLocale(tag);
    if (region) return region;
  }
  return null;
}

export interface CountrySignals {
  /** IANA zone from the browser, e.g. 'Australia/Melbourne'. */
  timezone?: string | null;
  /** BCP 47 tag from the browser, e.g. 'en-AU'. */
  locale?: string | null;
  /** The request's Accept-Language header. */
  acceptLanguage?: string | null;
}

/**
 * Best available ISO 3166-1 alpha-2 country code, or null.
 *
 * Time zone first: it describes where the machine is, which is the question.
 * Locale and Accept-Language describe how the browser is configured, which
 * correlates but is routinely wrong — hence the order, and hence null rather
 * than a guess when nothing matches.
 */
export function deriveCountry(signals: CountrySignals): string | null {
  const zone = signals.timezone?.trim();
  if (zone) {
    const exact = ZONE_COUNTRY[zone];
    if (exact) return exact;
    // An unrecognised Australia/* or Pacific/Auckland-like zone still tells us
    // the country when the region part is unambiguous.
    if (zone.startsWith('Australia/')) return 'AU';
  }
  return regionFromLocale(signals.locale) ?? regionFromAcceptLanguage(signals.acceptLanguage);
}
