import { describe, expect, it } from 'vitest';
import {
  AU_STATES,
  ONCALL_INSTANCE_CHOICES,
  ONCALL_MAX_INSTANCES,
  ONCALL_MIN_INSTANCES,
  addressLabels,
  formatMoneyCents,
  formatPostalAddress,
  isWithinOnCallBand,
  onCallEnrolmentSchema,
  onCallMonthlyCents,
  onCallSignupHref,
  resolveCountryName,
} from '@onsys/shared';
import {
  renderOnCallEnrolmentAcknowledgement,
  renderOnCallEnrolmentNotification,
} from '../services/email.service';

/**
 * On-call enrolment: the band, the address rules, and what the two emails say.
 *
 * This is the one form on the site where submitting it means agreeing to be
 * billed every month, so the tests care about the figures as much as the
 * validation.
 */

const valid = {
  companyName: 'Example Logistics Pty Ltd',
  website: 'examplelogistics.com.au',
  country: 'AU' as const,
  countryOther: '',
  street: '12 Example Street',
  street2: '',
  locality: 'Carlton',
  region: 'VIC',
  postcode: '3053',
  contactName: 'Dana Example',
  workEmail: 'Dana@ExampleLogistics.com.au',
  phone: '+61 3 9000 0000',
  instances: 8,
};

describe('the self-serve band', () => {
  it('runs from four to ten, and offers every value in between', () => {
    expect(ONCALL_MIN_INSTANCES).toBe(4);
    expect(ONCALL_MAX_INSTANCES).toBe(10);
    expect([...ONCALL_INSTANCE_CHOICES]).toEqual([4, 5, 6, 7, 8, 9, 10]);
  });

  it('rejects below the minimum and above the maximum', () => {
    expect(isWithinOnCallBand(3)).toBe(false);
    expect(isWithinOnCallBand(4)).toBe(true);
    expect(isWithinOnCallBand(10)).toBe(true);
    expect(isWithinOnCallBand(11)).toBe(false);
    // Half an instance is not a thing anybody runs.
    expect(isWithinOnCallBand(6.5)).toBe(false);
  });

  it('points an estate above the band at the monthly plan rather than refusing', () => {
    const result = onCallEnrolmentSchema.safeParse({ ...valid, instances: 11 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join(' ');
      expect(message).toMatch(/monthly plan/i);
      expect(message).toMatch(/talk to us/i);
    }
  });

  it('multiplies to the price the customer is shown', () => {
    expect(onCallMonthlyCents(8, 10_000)).toBe(80_000);
    expect(formatMoneyCents(onCallMonthlyCents(8, 10_000))).toBe('$800');
    // No cents anywhere on this page: every figure is a round number.
    expect(formatMoneyCents(10_000)).toBe('$100');
  });
});

describe('the address', () => {
  it('accepts a complete Australian enrolment and normalises the email', () => {
    const parsed = onCallEnrolmentSchema.parse(valid);
    expect(parsed.workEmail).toBe('dana@examplelogistics.com.au');
    expect(parsed.instances).toBe(8);
  });

  it('requires a state and a four-digit postcode in Australia', () => {
    expect(onCallEnrolmentSchema.safeParse({ ...valid, region: '' }).success).toBe(false);
    expect(onCallEnrolmentSchema.safeParse({ ...valid, region: 'Victoria' }).success).toBe(false);
    expect(onCallEnrolmentSchema.safeParse({ ...valid, postcode: '30' }).success).toBe(false);
    for (const state of AU_STATES) {
      expect(onCallEnrolmentSchema.safeParse({ ...valid, region: state }).success).toBe(true);
    }
  });

  it('does not impose Australian rules on everybody else', () => {
    // A Fijian address has no four-digit postcode, and refusing one would turn
    // away exactly the Pacific customers this form was widened for.
    const overseas = {
      ...valid,
      country: 'FJ' as const,
      region: '',
      postcode: '',
      locality: 'Suva',
    };
    expect(onCallEnrolmentSchema.safeParse(overseas).success).toBe(true);
  });

  it('asks which country when the list does not have it', () => {
    const other = { ...valid, country: 'OTHER' as const, region: '', postcode: '' };
    expect(onCallEnrolmentSchema.safeParse(other).success).toBe(false);
    expect(
      onCallEnrolmentSchema.safeParse({ ...other, countryOther: 'Kiribati' }).success,
    ).toBe(true);
  });

  it('stores the country as a word, including one the customer typed', () => {
    expect(resolveCountryName('AU', '')).toBe('Australia');
    expect(resolveCountryName('NC', '')).toBe('New Caledonia');
    expect(resolveCountryName('OTHER', ' Kiribati ')).toBe('Kiribati');
  });

  it('labels the fields the way the customer would', () => {
    expect(addressLabels('AU').locality).toBe('Suburb');
    expect(addressLabels('US').locality).toBe('City');
    expect(addressLabels('US').postcode).toBe('ZIP code');
    expect(addressLabels('CA').region).toBe('Province');
    expect(addressLabels('FJ').postcode).toBe('Postal code');
  });

  it('writes one address line for an email, skipping what is missing', () => {
    expect(
      formatPostalAddress({
        street: '12 Example Street',
        street2: 'Level 3',
        locality: 'Carlton',
        region: 'VIC',
        postcode: '3053',
        country: 'Australia',
      }),
    ).toBe('12 Example Street, Level 3, Carlton VIC 3053, Australia');

    expect(
      formatPostalAddress({
        street: '1 Victoria Parade',
        locality: 'Suva',
        country: 'Fiji',
      }),
    ).toBe('1 Victoria Parade, Suva, Fiji');
  });
});

describe('the rest of the form', () => {
  it('requires the things an invoice needs', () => {
    for (const field of ['companyName', 'street', 'locality', 'contactName', 'phone'] as const) {
      expect(onCallEnrolmentSchema.safeParse({ ...valid, [field]: '' }).success).toBe(false);
    }
  });

  it('treats the website as optional but checks it looks like one', () => {
    expect(onCallEnrolmentSchema.safeParse({ ...valid, website: '' }).success).toBe(true);
    expect(onCallEnrolmentSchema.safeParse({ ...valid, website: 'not a website' }).success).toBe(
      false,
    );
    // A bare domain is what people type, and is accepted.
    expect(onCallEnrolmentSchema.safeParse({ ...valid, website: 'example.com.au' }).success).toBe(
      true,
    );
    expect(
      onCallEnrolmentSchema.safeParse({ ...valid, website: 'https://example.com.au' }).success,
    ).toBe(true);
  });

  it('keeps a real company website clear of the spam trap', () => {
    /*
     * A regression with a cost. The shared honeypot discards any submission
     * carrying a `website` field, and this form asks a company for its
     * website — so every enrolment that filled it in was answered "ok" and
     * thrown away, invisibly, because a discarded submission is designed to
     * look like a successful one. The trap on this route is `website_url`.
     */
    const parsed = onCallEnrolmentSchema.parse(valid);
    expect(parsed.website).toBe('examplelogistics.com.au');
    expect(Object.keys(parsed)).not.toContain('website_url');
  });
});

describe('the link to Onsys Support', () => {
  it('carries the plan and the count the customer chose', () => {
    expect(onCallSignupHref('https://support.onsys.com.au/signup', 5)).toBe(
      'https://support.onsys.com.au/signup?plan=oncall&instances=5',
    );
  });

  it('keeps a query the configured address already had', () => {
    // An operator who points ONCALL_SIGNUP_URL at a tracked link should not
    // have it broken by a second "?".
    expect(onCallSignupHref('https://support.onsys.com.au/signup?utm_source=site', 8)).toBe(
      'https://support.onsys.com.au/signup?utm_source=site&plan=oncall&instances=8',
    );
  });

  it('does not duplicate parameters when the base already names them', () => {
    expect(onCallSignupHref('https://support.onsys.com.au/signup?plan=oncall&instances=4', 9)).toBe(
      'https://support.onsys.com.au/signup?plan=oncall&instances=9',
    );
  });

  it('still produces a usable link from a hand-edited relative value', () => {
    expect(onCallSignupHref('/signup', 6)).toBe('/signup?plan=oncall&instances=6');
  });
});

describe('the enrolment emails', () => {
  const data = {
    id: 'enr_1',
    companyName: 'Example Logistics Pty Ltd',
    website: 'examplelogistics.com.au',
    contactName: 'Dana Example',
    workEmail: 'dana@examplelogistics.com.au',
    phone: '+61 3 9000 0000',
    address: '12 Example Street, Carlton VIC 3053, Australia',
    instanceCount: 8,
    unitPriceCents: 10_000,
    monthlyTotalCents: 80_000,
    hourlyRateCents: 15_000,
    currency: 'AUD',
    notes: 'Two of the eight are Azure SQL MI.',
  };

  it('tells Onsys everything needed to act within the promised day', () => {
    const html = renderOnCallEnrolmentNotification(data);
    expect(html).toMatch(/Example Logistics/);
    expect(html).toMatch(/8 SQL Server instances/);
    expect(html).toMatch(/\$800/);
    expect(html).toMatch(/12 Example Street/);
    expect(html).toMatch(/ONCALL-SQL/);
    expect(html).toMatch(/Azure SQL MI/);
  });

  it('tells the customer exactly what they agreed to', () => {
    const html = renderOnCallEnrolmentAcknowledgement(data);
    expect(html).toMatch(/Hi Dana/);
    expect(html).toMatch(/\$800 ex GST/);
    expect(html).toMatch(/\$150 per hour/);
    // The commitment is stated, and so is the thing it is not.
    expect(html).toMatch(/Nothing is invoiced until cover is live/);
    expect(html).toMatch(/does not include continuous monitoring/i);
    // The login is offered with the count already in it.
    expect(html).toMatch(/instances=8/);
  });

  it('escapes a company name rather than rendering it as markup', () => {
    const html = renderOnCallEnrolmentNotification({
      ...data,
      companyName: '<script>alert(1)</script>',
    });
    expect(html).not.toMatch(/<script>/);
    expect(html).toMatch(/&lt;script&gt;/);
  });
});
