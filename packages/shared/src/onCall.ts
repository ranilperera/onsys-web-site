import { z } from 'zod';

/**
 * On-call cover: the band, the price arithmetic, and the enrolment form.
 *
 * Shared because three things must agree about what a valid enrolment is —
 * the browser that validates as somebody types, the API that refuses what
 * reaches it, and the figures printed beside the button. A copy of any of
 * these rules in only two of those places is a bug waiting for its first
 * customer.
 */

// ---------------------------------------------------------------
// The band
// ---------------------------------------------------------------

/**
 * The self-serve band, in SQL Server instances.
 *
 * Four is the commercial minimum: below it the subscription costs more to
 * administer than it earns, and hourly consultancy serves the customer
 * better. Ten is where reactive cover stops being the right product — an
 * estate that size wants continuous monitoring, included hours and a
 * reporting cycle, which is the monthly plan. Neither edge is a dead end:
 * the page turns into "talk to us" and carries the number they chose, because
 * somebody with three instances is a lead and somebody with thirty is a
 * bigger one.
 */
export const ONCALL_MIN_INSTANCES = 4;
export const ONCALL_MAX_INSTANCES = 10;

/** Every value the selector offers. Small enough to be a list of buttons. */
export const ONCALL_INSTANCE_CHOICES: readonly number[] = Array.from(
  { length: ONCALL_MAX_INSTANCES - ONCALL_MIN_INSTANCES + 1 },
  (_, i) => ONCALL_MIN_INSTANCES + i,
);

export function isWithinOnCallBand(instances: number): boolean {
  return (
    Number.isInteger(instances) &&
    instances >= ONCALL_MIN_INSTANCES &&
    instances <= ONCALL_MAX_INSTANCES
  );
}

/** Monthly subscription, excluding GST. Integer cents throughout. */
export function onCallMonthlyCents(instances: number, unitPriceCents: number): number {
  return instances * unitPriceCents;
}

/** "$800" — whole dollars, because every figure on this page is a round one. */
export function formatMoneyCents(cents: number, currency = 'AUD'): string {
  return (cents / 100).toLocaleString('en-AU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// ---------------------------------------------------------------
// Where the customer is
// ---------------------------------------------------------------

/**
 * The markets Onsys sells into, Australia first and the Pacific next.
 *
 * Not the full ISO list. A select of two hundred entries is worse to use and
 * invites a precision this form does not need — what the address is for is an
 * invoice and a conversation. `OTHER` exists so a country that is not on the
 * list is a free-text field rather than a customer who cannot enrol, which is
 * the failure a short list would otherwise cause.
 */
export const ONCALL_COUNTRIES = [
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'NC', name: 'New Caledonia' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'SB', name: 'Solomon Islands' },
  { code: 'WS', name: 'Samoa' },
  { code: 'TO', name: 'Tonga' },
  { code: 'CK', name: 'Cook Islands' },
  { code: 'PF', name: 'French Polynesia' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'SG', name: 'Singapore' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'IN', name: 'India' },
  { code: 'PH', name: 'Philippines' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'HK', name: 'Hong Kong SAR' },
  { code: 'JP', name: 'Japan' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IE', name: 'Ireland' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'OTHER', name: 'Somewhere else' },
] as const;

export type OnCallCountryCode = (typeof ONCALL_COUNTRIES)[number]['code'];

export const ONCALL_COUNTRY_CODES = ONCALL_COUNTRIES.map((c) => c.code) as [
  OnCallCountryCode,
  ...OnCallCountryCode[],
];

/** States and territories. Required for an Australian address, and only there. */
export const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'] as const;
export type AuState = (typeof AU_STATES)[number];

/**
 * What the second address line is called where the customer lives.
 *
 * "Suburb" and "postcode" are Australian words. A New Zealander writes a
 * "suburb" too, but an American writes a "city" and a "ZIP code", and a form
 * that asks a Californian for their suburb reads as a form built for somebody
 * else. The labels change; the fields do not.
 */
export function addressLabels(country: string): {
  locality: string;
  region: string;
  postcode: string;
} {
  switch (country) {
    case 'AU':
      return { locality: 'Suburb', region: 'State', postcode: 'Postcode' };
    case 'NZ':
      return { locality: 'Suburb', region: 'Region', postcode: 'Postcode' };
    case 'US':
      return { locality: 'City', region: 'State', postcode: 'ZIP code' };
    case 'CA':
      return { locality: 'City', region: 'Province', postcode: 'Postal code' };
    case 'GB':
    case 'IE':
      return { locality: 'Town or city', region: 'County', postcode: 'Postcode' };
    default:
      return { locality: 'City or town', region: 'State or province', postcode: 'Postal code' };
  }
}

// ---------------------------------------------------------------
// The enrolment
// ---------------------------------------------------------------

const required = (label: string, max: number) =>
  z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`).max(max);

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(''))
    .transform((v) => v || '');

/**
 * What enrolling in on-call cover asks for.
 *
 * Longer than the enquiry it replaces, and deliberately so: this is the point
 * where a company commits to a monthly fee, so it collects what an invoice
 * needs. Everything that is not on an invoice is optional.
 */
export const onCallEnrolmentSchema = z
  .object({
    /** The company that will be invoiced. */
    companyName: required('Company name', 200),
    website: optional(300),

    country: z.enum(ONCALL_COUNTRY_CODES, {
      errorMap: () => ({ message: 'Choose where the company is based' }),
    }),
    /** Free text when the country is not on the list. */
    countryOther: optional(120),

    street: required('Street address', 300),
    street2: optional(300),
    locality: required('Suburb or city', 160),
    region: optional(120),
    postcode: optional(24),

    /** Who we talk to. */
    contactName: required('Your name', 200),
    workEmail: z
      .string({ required_error: 'Work email is required' })
      .trim()
      .toLowerCase()
      .email('Enter an email address we can reply to')
      .max(200),
    phone: required('Phone', 40).min(5, 'Enter a phone number with your country code'),

    instances: z.coerce
      .number({ invalid_type_error: 'Choose how many instances to cover' })
      .int()
      .min(ONCALL_MIN_INSTANCES, `On-call cover starts at ${ONCALL_MIN_INSTANCES} instances`)
      .max(
        ONCALL_MAX_INSTANCES,
        `Above ${ONCALL_MAX_INSTANCES} instances a monthly plan costs less and covers more — talk to us`,
      ),

    notes: optional(2000),

    /** Attribution, carried the way every other form on the site carries it. */
    referrer: optional(500),
    landingPath: optional(300),
  })
  .superRefine((value, ctx) => {
    // Australia is where most of these land and the one place we can check an
    // address properly, so it is checked properly. Elsewhere the formats vary
    // too much to validate without turning away real customers.
    if (value.country === 'AU') {
      if (!value.region || !AU_STATES.includes(value.region as AuState)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['region'], message: 'Choose a state' });
      }
      if (!/^\d{4}$/.test(value.postcode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['postcode'],
          message: 'An Australian postcode is four digits',
        });
      }
    }

    if (value.country === 'OTHER' && !value.countryOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['countryOther'],
        message: 'Tell us which country',
      });
    }

    if (value.website && !/^([a-z]+:\/\/)?[^\s.]+\.[^\s]{2,}$/i.test(value.website)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['website'],
        message: 'That does not look like a web address',
      });
    }
  });

export type OnCallEnrolmentInput = z.infer<typeof onCallEnrolmentSchema>;

/**
 * The country as it should be stored and read back.
 *
 * "OTHER" is a value for a select, not an answer, so what gets stored is what
 * the customer typed. Everywhere else the country's own name is stored rather
 * than its code: an invoice, an email and an admin screen all want the word.
 */
export function resolveCountryName(country: string, countryOther: string): string {
  if (country === 'OTHER') return countryOther.trim();
  return ONCALL_COUNTRIES.find((c) => c.code === country)?.name ?? country;
}

/**
 * The link to Onsys Support's signup, carrying what the customer already told
 * us.
 *
 * The plan and the instance count travel in the query string because the
 * signup page reads them: with them it shows the on-call offer priced for that
 * estate, and without them it falls back to an ordinary account signup. So the
 * parameters are not decoration — dropping them means somebody who just
 * enrolled in cover for five instances creates a plain account instead.
 *
 * Built through URL rather than string concatenation so a configured address
 * that already carries a query (a tracking parameter, say) keeps it instead of
 * being broken by a second "?".
 */
export function onCallSignupHref(base: string, instances: number): string {
  try {
    const url = new URL(base);
    url.searchParams.set('plan', 'oncall');
    url.searchParams.set('instances', String(instances));
    return url.toString();
  } catch {
    // A relative or malformed value configured by hand. Better a link that
    // goes somewhere than a crash on a confirmation screen.
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}plan=oncall&instances=${instances}`;
  }
}

/** One line, for an email or a list: "12 Example St, Carlton VIC 3053, Australia". */
export function formatPostalAddress(parts: {
  street: string;
  street2?: string | null;
  locality: string;
  region?: string | null;
  postcode?: string | null;
  country: string;
}): string {
  const lines = [parts.street, parts.street2 || '']
    .filter(Boolean)
    .concat([[parts.locality, parts.region || '', parts.postcode || ''].filter(Boolean).join(' ')])
    .concat([parts.country]);
  return lines.filter(Boolean).join(', ');
}
