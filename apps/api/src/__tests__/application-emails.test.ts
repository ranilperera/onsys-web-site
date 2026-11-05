import { describe, expect, it } from 'vitest';
import {
  renderApplicationAcknowledgement,
  renderApplicationNotification,
  renderLeadAcknowledgement,
} from '../services/email.service';

/**
 * What goes out to a candidate, and what does not.
 *
 * The address-and-phone strip at the foot of every other transactional email
 * is wrong on an application acknowledgement: a candidate who reads the 1800
 * number will ring it to ask how their application is going, and it reaches
 * consultants who know nothing about hiring. The strip lives in a wrapper
 * shared by a dozen templates, so it is one careless edit from coming back —
 * hence a test rather than a comment.
 */

const ack = () =>
  renderApplicationAcknowledgement({
    fullName: 'Jane Smith',
    jobTitle: 'Database Engineering Intern',
  });

describe('the candidate acknowledgement', () => {
  it('carries no postal address, phone number or legal entity', () => {
    const html = ack();
    expect(html).not.toMatch(/Little Collins/i);
    expect(html).not.toMatch(/Melbourne VIC/i);
    expect(html).not.toMatch(/1800/);
    expect(html).not.toMatch(/Pty Ltd/i);
  });

  it('still says who it is from and what happens next', () => {
    const html = ack();
    expect(html).toMatch(/Jane/);
    expect(html).toMatch(/Database Engineering Intern/);
    expect(html).toMatch(/The Onsys team/);
    // The only route back is a reply, which reaches whoever is hiring.
    expect(html).toMatch(/reply to this email/i);
  });

  it('greets by first name without mangling a single-word name', () => {
    expect(
      renderApplicationAcknowledgement({ fullName: 'Prabhakaran', jobTitle: 'DBA' }),
    ).toMatch(/Hi Prabhakaran/);
  });

  it('escapes a name rather than rendering it as markup', () => {
    const html = renderApplicationAcknowledgement({
      fullName: '<script>alert(1)</script>',
      jobTitle: 'DBA',
    });
    expect(html).not.toMatch(/<script>/);
    expect(html).toMatch(/&lt;script&gt;/);
  });
});

describe('the internal notification', () => {
  const notification = () =>
    renderApplicationNotification({
      jobTitle: 'Database Engineering Intern',
      jobSlug: 'database-engineering-interns-sri-lanka',
      applicationId: 'app_123',
      fullName: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+94 77 000 0000',
      location: 'Colombo, Sri Lanka',
      noticePeriod: '2 weeks',
      expectedSalary: null,
      linkedinUrl: null,
      coverNote: 'I have run Postgres at home for two years.',
      cvOriginalName: 'Jane Smith CV.pdf',
      cvBytes: 248_000,
    });

  it('keeps the company footer — this one goes to us, not a candidate', () => {
    expect(notification()).toMatch(/1800/);
  });

  it('links to the application instead of attaching the CV', () => {
    const html = notification();
    expect(html).toMatch(/\/admin\/applications\/app_123/);
    expect(html).toMatch(/not attached/i);
    // 248,000 bytes is 242 KB, not 248: the sizes are binary, as every file
    // manager shows them.
    expect(html).toMatch(/242 KB/);
  });

  it('omits a field the candidate left blank rather than printing a label with nothing after it', () => {
    const html = notification();
    expect(html).toMatch(/Notice period/);
    expect(html).not.toMatch(/Expected salary/);
    expect(html).not.toMatch(/LinkedIn/);
  });
});

describe('every other template', () => {
  it('still carries the footer, because that number is for enquiries', () => {
    const html = renderLeadAcknowledgement({ name: 'Jane Smith', email: 'jane@example.com' });
    expect(html).toMatch(/1800/);
    expect(html).toMatch(/Little Collins/);
  });
});
