/**
 * First-touch marketing attribution, held for the length of the session.
 *
 * The two forms that already captured UTMs read them from
 * window.location.search at the moment of submit, which loses the campaign in
 * the ordinary case: somebody lands on /blog/sql-server-dba-support-cost-australia
 * from an ad, reads it, clicks through to /contact and submits. By then the
 * query string is gone and the lead records no source at all. `document.referrer`
 * at submit time is worse than nothing — after an internal navigation it reports
 * our own blog page, so a Google ad click gets filed as a referral from
 * onsys.com.au.
 *
 * So attribution is captured once on landing, stored for the session, and read
 * back at submit. First touch wins: the campaign that earned the visit is the
 * one that gets the credit, not the last page the visitor happened to be on.
 */

const KEY = 'onsys.attribution.v1';

/** Field widths match the zod schemas, so a long URL cannot fail validation. */
const MAX_TAG = 120;
const MAX_REFERRER = 500;

export interface Attribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
  /**
   * IANA zone, e.g. 'Australia/Melbourne'. The API derives a country from it:
   * with no geo-IP at the edge, this is the best available signal for whether a
   * lead is Australian, and the business question behind all of this is how many
   * AU and NZ leads arrive, not how many leads arrive.
   */
  timezone?: string;
  /** BCP 47 tag, e.g. 'en-AU'. Second opinion for the country derivation. */
  locale?: string;
}

const clip = (value: string | null | undefined, max: number): string | undefined => {
  const trimmed = (value ?? '').trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
};

/**
 * Was this referrer somebody else's site?
 *
 * An internal referrer is noise — it records where the visitor was a moment
 * ago, not how they found Onsys. An unparseable one is dropped rather than
 * guessed at.
 */
export function isExternalReferrer(referrer: string, currentHost: string): boolean {
  if (!referrer) return false;
  try {
    const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, '');
    const self = currentHost.toLowerCase().replace(/^www\./, '');
    return Boolean(host) && host !== self;
  } catch {
    return false;
  }
}

/**
 * Read attribution out of a landing URL.
 *
 * Google Ads and Microsoft Ads auto-tagging send gclid or msclkid and no UTMs
 * at all, so a campaign tagged only by the ad platform would otherwise look
 * like direct traffic. Those click ids are translated into the source and
 * medium they imply; an explicit utm_source still wins, because that is the
 * marketer stating the answer rather than this code inferring it.
 */
export function readAttribution(
  url: string,
  referrer = '',
  env: { timezone?: string; locale?: string } = {},
): Attribution {
  let params: URLSearchParams;
  let host = '';
  try {
    const parsed = new URL(url);
    params = parsed.searchParams;
    host = parsed.hostname;
  } catch {
    params = new URLSearchParams();
  }

  const source = clip(params.get('utm_source'), MAX_TAG);
  const medium = clip(params.get('utm_medium'), MAX_TAG);
  const paidClick = params.has('gclid') ? 'google' : params.has('msclkid') ? 'bing' : undefined;

  const out: Attribution = {
    utmSource: source ?? paidClick,
    utmMedium: medium ?? (paidClick ? 'cpc' : undefined),
    utmCampaign: clip(params.get('utm_campaign'), MAX_TAG),
    referrer: isExternalReferrer(referrer, host) ? clip(referrer, MAX_REFERRER) : undefined,
    timezone: clip(env.timezone, MAX_TAG),
    locale: clip(env.locale, MAX_TAG),
  };

  // Drop empty keys so a stored record is only ever written over by something
  // that actually carries information.
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v)) as Attribution;
}

/** True when a record names where the visit came from, rather than only how the browser is set up. */
const hasSource = (a: Attribution): boolean => Boolean(a.utmSource || a.referrer);

function read(): Attribution {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Attribution) : {};
  } catch {
    // Private browsing, blocked storage, or malformed JSON. Attribution is a
    // nice-to-have on a lead; it must never be the reason a form fails.
    return {};
  }
}

/**
 * Merge a freshly-read landing record into what the session already holds.
 *
 * Kept pure and exported so the precedence rules are testable: an existing
 * source is never overwritten, a session that began without one can still pick
 * one up later in the same visit, and the browser environment is always
 * refreshed because it describes the device rather than the campaign.
 */
export function mergeAttribution(stored: Attribution, incoming: Attribution): Attribution {
  const campaign = hasSource(stored) ? stored : { ...stored, ...incoming };
  return {
    ...campaign,
    timezone: incoming.timezone ?? stored.timezone,
    locale: incoming.locale ?? stored.locale,
  };
}

/**
 * Record attribution for this session. Call once per page load, on landing.
 */
export function captureAttribution(): void {
  if (typeof window === 'undefined') return;
  const incoming = readAttribution(window.location.href, document.referrer, {
    timezone: resolvedTimeZone(),
    locale: navigator.language,
  });
  const merged = mergeAttribution(read(), incoming);
  try {
    sessionStorage.setItem(KEY, JSON.stringify(merged));
  } catch {
    // See read(): storage is best-effort.
  }
}

/** What to merge into a lead, booking or health-check payload at submit time. */
export function getAttribution(): Attribution {
  if (typeof window === 'undefined') return {};
  const stored = read();
  // A visitor who lands and submits on the same page never triggers a second
  // capture, and a blocked sessionStorage returns {} every time — so the
  // current URL is read again here rather than trusted to have been stored.
  return mergeAttribution(
    stored,
    readAttribution(window.location.href, document.referrer, {
      timezone: resolvedTimeZone(),
      locale: navigator.language,
    }),
  );
}

function resolvedTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}
