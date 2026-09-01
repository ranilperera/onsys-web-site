import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { env, graphConfigured, org } from '../lib/env';
import { logger } from '../lib/logger';

/**
 * Transactional email via Microsoft Graph (application permissions).
 *
 * Azure setup required:
 *   1. App registration → API permissions → Microsoft Graph → Application → Mail.Send
 *   2. Grant admin consent
 *   3. Client secret → GRAPH_CLIENT_SECRET
 *   4. GRAPH_SENDER_UPN must be a real, licensed mailbox in the tenant
 *
 * Recommended hardening: scope the app to a single mailbox with an
 * ApplicationAccessPolicy in Exchange Online, so a leaked secret cannot send
 * as arbitrary users:
 *   New-ApplicationAccessPolicy -AppId <id> -PolicyScopeGroupId <mail-enabled-group> \
 *     -AccessRight RestrictAccess
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

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  cc?: string[];
  /// Optional file attachments, e.g. the .ics for a confirmed booking.
  attachments?: Array<{ name: string; contentType: string; content: string }>;
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ sent: boolean; reason?: string }> {
  if (!graphConfigured) {
    // In dev we log instead of throwing so the contact form still works end-to-end.
    logger.warn(
      { to: opts.to, subject: opts.subject },
      'Graph not configured — email not sent. Set GRAPH_* env vars to enable.',
    );
    return { sent: false, reason: 'graph_not_configured' };
  }

  const recipients = (Array.isArray(opts.to) ? opts.to : [opts.to]).map((address) => ({
    emailAddress: { address },
  }));

  const message: Record<string, unknown> = {
    subject: opts.subject,
    body: { contentType: 'HTML', content: opts.html },
    toRecipients: recipients,
  };

  if (opts.cc?.length) {
    message.ccRecipients = opts.cc.map((address) => ({ emailAddress: { address } }));
  }
  if (opts.replyTo) {
    message.replyTo = [{ emailAddress: { address: opts.replyTo } }];
  }
  if (opts.attachments?.length) {
    message.attachments = opts.attachments.map((a) => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: a.name,
      contentType: a.contentType,
      contentBytes: Buffer.from(a.content, 'utf8').toString('base64'),
    }));
  }

  try {
    await getGraphClient()
      .api(`/users/${env.GRAPH_SENDER_UPN}/sendMail`)
      .post({ message, saveToSentItems: true });

    logger.info({ to: opts.to, subject: opts.subject }, 'Email sent via Microsoft Graph');
    return { sent: true };
  } catch (error) {
    // Never bubble a mail failure up into the visitor's form submission — the
    // lead is already safely persisted in Postgres by this point.
    logger.error({ err: error, to: opts.to }, 'Microsoft Graph sendMail failed');
    return { sent: false, reason: 'graph_send_failed' };
  }
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const BRAND_NAVY = '#0E336A';
const BRAND_ORANGE = '#FF8B00';

function wrapEmail(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAF9F8;font-family:'Segoe UI',Arial,sans-serif;color:#1B1B1B;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF9F8;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #E1DFDD;border-radius:10px;overflow:hidden;">
        <tr><td style="background:${BRAND_NAVY};padding:20px 28px;">
          <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">${escapeHtml(title)}</h1>
        </td></tr>
        <tr><td style="padding:28px;">${bodyHtml}</td></tr>
        <tr><td style="background:#F3F2F1;padding:16px 28px;font-size:12px;color:#605E5C;">
          ${org.legalName} · ${org.postalAddress} · ${org.phone}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function row(label: string, value?: string | null): string {
  if (!value) return '';
  return `<tr>
    <td style="padding:8px 0;border-bottom:1px solid #E1DFDD;font-size:13px;color:#605E5C;width:140px;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:8px 0;border-bottom:1px solid #E1DFDD;font-size:14px;color:#1B1B1B;">${escapeHtml(value)}</td>
  </tr>`;
}

export interface LeadEmailData {
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  service?: string | null;
  message?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
}

/** Internal notification to the sales team. */
export function renderLeadNotification(lead: LeadEmailData): string {
  return wrapEmail(
    'New website enquiry',
    `<p style="margin:0 0 18px;font-size:15px;">A new enquiry came in through the website.</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
       ${row('Name', lead.name)}
       ${row('Email', lead.email)}
       ${row('Company', lead.company)}
       ${row('Phone', lead.phone)}
       ${row('Service', lead.service)}
       ${row('Source', lead.utmSource)}
       ${row('Referrer', lead.referrer)}
     </table>
     ${
       lead.message
         ? `<div style="margin-top:20px;">
              <div style="font-size:13px;color:#605E5C;margin-bottom:6px;">Message</div>
              <div style="background:#F8FAFC;border-left:3px solid ${BRAND_ORANGE};padding:14px 16px;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(lead.message)}</div>
            </div>`
         : ''
     }
     <p style="margin:24px 0 0;font-size:13px;color:#605E5C;">Reply directly to this email to respond to ${escapeHtml(lead.name)}.</p>`,
  );
}

/** Auto-acknowledgement to the person who filled in the form. */
export function renderLeadAcknowledgement(lead: LeadEmailData): string {
  return wrapEmail(
    'Thanks for getting in touch',
    `<p style="margin:0 0 16px;font-size:15px;">Hi ${escapeHtml(lead.name.split(' ')[0] || lead.name)},</p>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Thanks for contacting Onsys Technologies. We've received your enquiry and a senior consultant will get back to you within one business day.</p>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">If it's urgent, call us on <strong>${org.phone}</strong> — managed service clients have 24/7 coverage.</p>
     <p style="margin:24px 0 0;">
       <a href="${env.SITE_URL}/contact" style="display:inline-block;background:${BRAND_ORANGE};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:4px;font-weight:600;font-size:14px;">Book a free consultation</a>
     </p>
     <p style="margin:24px 0 0;font-size:14px;color:#605E5C;">— The Onsys team</p>`,
  );
}

/**
 * One-time code that unlocks the chat widget.
 *
 * Deliberately plain: no links, no buttons, nothing to click. A visitor who
 * has been taught that "verify your email" messages contain a button to press
 * is a visitor who will press one in a forged copy of this email, so the only
 * thing here is a number they type back into the widget they already have open.
 */
export function renderChatCode(code: string, minutes: number): string {
  return wrapEmail(
    'Your chat verification code',
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Enter this code in the chat window to start the conversation:</p>
     <p style="margin:0 0 20px;font-size:34px;font-weight:700;letter-spacing:.22em;color:${BRAND_NAVY};font-family:'Segoe UI',Arial,sans-serif;">${escapeHtml(code)}</p>
     <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#605E5C;">The code expires in ${minutes} minutes. We will never ask you for it by phone or email.</p>
     <p style="margin:0;font-size:14px;line-height:1.6;color:#605E5C;">If you did not open a chat on our website, you can ignore this — nobody can use the code without it.</p>`,
  );
}

/**
 * Second-factor code for admin sign-in.
 *
 * The warning is the point. Anyone receiving this without having just typed
 * their password is looking at evidence that someone else has it, and the one
 * useful instruction at that moment is "change it" — not a link to click.
 */
export function renderAdminCode(code: string, name: string, minutes: number): string {
  return wrapEmail(
    'Your admin sign-in code',
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hello ${escapeHtml(name)}, here is the code to finish signing in to the Onsys admin console:</p>
     <p style="margin:0 0 20px;font-size:34px;font-weight:700;letter-spacing:.22em;color:${BRAND_NAVY};font-family:'Segoe UI',Arial,sans-serif;">${escapeHtml(code)}</p>
     <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#605E5C;">It expires in ${minutes} minutes and can only be used once.</p>
     <p style="margin:0;font-size:14px;line-height:1.6;color:#A4262C;"><strong>If you did not just try to sign in, someone else has your password.</strong> Change it immediately and tell the team.</p>`,
  );
}

/** Chat transcript emailed to the visitor or the team on request. */
export function renderChatTranscript(
  messages: Array<{ role: string; content: string; createdAt: Date }>,
): string {
  const rows = messages
    .map((m) => {
      const who = m.role === 'VISITOR' ? 'Visitor' : m.role === 'AGENT' ? 'Onsys' : 'Assistant';
      const colour = m.role === 'VISITOR' ? BRAND_NAVY : '#605E5C';
      return `<div style="margin-bottom:14px;">
        <div style="font-size:12px;color:${colour};font-weight:600;margin-bottom:3px;">${who}</div>
        <div style="font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(m.content)}</div>
      </div>`;
    })
    .join('');

  return wrapEmail('Your chat transcript', rows || '<p>No messages.</p>');
}

// --- Booking ---------------------------------------------------------------

export interface BookingEmailData {
  reference: string;
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  topic?: string | null;
  message?: string | null;
  /// Already formatted in the booking timezone, e.g. "Tuesday 26 August, 9:30 am".
  when: string;
  timezone: string;
  durationMinutes: number;
  joinUrl: string | null;
  consultantName: string;
  cancelUrl: string;
}

/**
 * RFC 5545 calendar entry for the visitor.
 *
 * They are not a Graph attendee — see booking.service.ts — so this is how the
 * meeting reaches their own calendar. ORGANIZER carries the generic address and
 * the consultant's display name, never the mailbox the event actually lives in.
 */
export function renderBookingIcs(data: BookingEmailData, startsAt: Date, endsAt: Date): string {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  // Escape order matters: backslashes first, or the escapes get double-escaped.
  const esc = (v: string) =>
    v.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

  const description = [
    `Your ${data.durationMinutes}-minute consultation with ${data.consultantName}.`,
    data.joinUrl ? `\nJoin on Microsoft Teams: ${data.joinUrl}` : '',
    `\nBooking reference: ${data.reference}`,
    `\nNeed to cancel? ${data.cancelUrl}`,
  ].join('');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${org.name}//Booking//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${data.reference}@onsys.com.au`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(startsAt)}`,
    `DTEND:${stamp(endsAt)}`,
    `SUMMARY:${esc(`${org.name} consultation`)}`,
    `DESCRIPTION:${esc(description)}`,
    data.joinUrl ? `LOCATION:${esc('Microsoft Teams meeting')}` : 'LOCATION:Online',
    data.joinUrl ? `URL:${data.joinUrl}` : '',
    `ORGANIZER;CN=${esc(data.consultantName)}:mailto:${org.email}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  // RFC 5545 requires CRLF.
  return lines.join('\r\n');
}

/** Sent to the visitor. Carries the Teams link; never names the mailbox. */
export function renderBookingConfirmation(data: BookingEmailData): string {
  const join = data.joinUrl
    ? `<p style="margin:24px 0">
         <a href="${escapeHtml(data.joinUrl)}"
            style="background:${BRAND_ORANGE};color:#fff;text-decoration:none;padding:14px 26px;border-radius:8px;font-weight:700;display:inline-block">
           Join the Teams meeting
         </a>
       </p>
       <p style="font-size:13px;color:#667">The same link is in the calendar invitation attached to this email. You do not need a Teams account — the link opens in a browser.</p>`
    : `<p style="color:#667">We will send the Microsoft Teams joining link separately, shortly.</p>`;

  return wrapEmail(
    'Your consultation is confirmed',
    `
    <p>Hi ${escapeHtml(data.name.split(' ')[0])},</p>
    <p>Your ${data.durationMinutes}-minute consultation with ${escapeHtml(data.consultantName)} is booked. Here are the details.</p>
    <table style="width:100%;border-collapse:collapse;margin:18px 0">
      ${row('When', `${data.when} (${data.timezone.replace('_', ' ')})`)}
      ${row('Duration', `${data.durationMinutes} minutes`)}
      ${row('With', data.consultantName)}
      ${row('Reference', data.reference)}
      ${row('Topic', data.topic)}
    </table>
    ${join}
    <p style="font-size:13px;color:#667">
      Need to change or cancel? <a href="${escapeHtml(data.cancelUrl)}" style="color:${BRAND_NAVY}">Cancel this booking</a>
      or reply to this email and we will rearrange it.
    </p>
  `,
  );
}

/** Internal heads-up. The calendar entry is the real notification. */
export function renderBookingNotification(data: BookingEmailData): string {
  return wrapEmail(
    'New consultation booked from the website',
    `
    <table style="width:100%;border-collapse:collapse">
      ${row('When', `${data.when} (${data.timezone.replace('_', ' ')})`)}
      ${row('Reference', data.reference)}
      ${row('Name', data.name)}
      ${row('Email', data.email)}
      ${row('Company', data.company)}
      ${row('Phone', data.phone)}
      ${row('Topic', data.topic)}
    </table>
    ${data.message ? `<p style="margin-top:14px"><strong>What they said</strong><br>${escapeHtml(data.message).replace(/\n/g, '<br>')}</p>` : ''}
    <p style="font-size:13px;color:#667;margin-top:18px">The meeting is already in the consultant's calendar with the Teams link attached.</p>
  `,
  );
}
