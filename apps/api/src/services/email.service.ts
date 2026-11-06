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

/**
 * Who is copied on every lead notification.
 *
 * Comma separated in LEAD_NOTIFY_CC, trimmed, empties dropped, and the primary
 * recipient removed so a single mailbox set as both never receives two copies
 * of the same alert.
 */
export function leadNotifyCc(): string[] {
  return env.LEAD_NOTIFY_CC.split(',')
    .map((a) => a.trim())
    .filter((a) => a && a.toLowerCase() !== env.LEAD_NOTIFY_TO.trim().toLowerCase());
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

/**
 * The shell every transactional email is rendered into.
 *
 * `footer: false` drops the company address and phone strip. It exists for
 * mail to people who are not customers and must not be directed at the sales
 * line: a candidate who reads "1800 431 416" at the foot of an application
 * acknowledgement will ring it to ask how their application is going, and that
 * number reaches consultants who know nothing about hiring. Everything else
 * keeps the strip — an enquiry or a booking is exactly the conversation that
 * number is for.
 */
function wrapEmail(title: string, bodyHtml: string, options: { footer?: boolean } = {}): string {
  const footer =
    options.footer === false
      ? ''
      : `<tr><td style="background:#F3F2F1;padding:16px 28px;font-size:12px;color:#605E5C;">
          ${org.legalName} · ${org.postalAddress} · ${org.phone}
        </td></tr>`;

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
        ${footer}
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
  /// Submitting IP, shown so a run of identical-looking enquiries can be told
  /// apart from one script without opening the admin console.
  ip?: string | null;
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
       ${row('IP address', lead.ip)}
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

export interface ApplicationEmailData {
  jobTitle: string;
  jobSlug: string;
  applicationId: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  noticePeriod?: string | null;
  expectedSalary?: string | null;
  linkedinUrl?: string | null;
  coverNote?: string | null;
  cvOriginalName: string;
  cvBytes: number;
}

/** "248 KB" — a CV is never big enough to need more than this. */
function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * "A CV has arrived" — to the careers address.
 *
 * The CV is deliberately NOT attached. The point of the console is that there
 * is one copy of a candidate's personal information, in one place, with a
 * record of who opened it; attaching it here would scatter copies through a
 * mail system and defeat that on the first forward. So this email carries the
 * facts needed to triage and a link to the file, and nothing to detach.
 */
export function renderApplicationNotification(data: ApplicationEmailData): string {
  return wrapEmail(
    `New application — ${data.jobTitle}`,
    `<p style="margin:0 0 18px;font-size:15px;">${escapeHtml(data.fullName)} has applied for <strong>${escapeHtml(data.jobTitle)}</strong>.</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
       ${row('Name', data.fullName)}
       ${row('Email', data.email)}
       ${row('Phone', data.phone)}
       ${row('Based in', data.location)}
       ${row('Notice period', data.noticePeriod)}
       ${row('Expected salary', data.expectedSalary)}
       ${row('LinkedIn', data.linkedinUrl)}
       ${row('CV', `${data.cvOriginalName} (${fileSize(data.cvBytes)})`)}
     </table>
     ${
       data.coverNote
         ? `<div style="margin-top:20px;">
              <div style="font-size:13px;color:#605E5C;margin-bottom:6px;">Their note</div>
              <div style="background:#F8FAFC;border-left:3px solid ${BRAND_ORANGE};padding:14px 16px;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(data.coverNote)}</div>
            </div>`
         : ''
     }
     <p style="margin:24px 0 0;">
       <a href="${env.SITE_URL}/admin/applications/${encodeURIComponent(data.applicationId)}" style="display:inline-block;background:${BRAND_ORANGE};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:4px;font-weight:600;font-size:14px;">Open the application</a>
     </p>
     <p style="margin:20px 0 0;font-size:13px;color:#605E5C;line-height:1.6;">The CV is not attached. It is on the application, where opening it is recorded — please read it there rather than forwarding copies. Replying to this email goes straight to ${escapeHtml(data.fullName.split(' ')[0] || data.fullName)}.</p>`,
  );
}

/**
 * "We have your application" — to the candidate.
 *
 * Says what happens next and does not promise what we cannot deliver. It
 * deliberately does not say "we will respond to every applicant": with open
 * adverts that is not true, and a candidate waiting on a reply that was never
 * coming is the thing people most resent about applying for work.
 */
export function renderApplicationAcknowledgement(data: {
  fullName: string;
  jobTitle: string;
}): string {
  const firstName = data.fullName.split(' ')[0] || data.fullName;
  return wrapEmail(
    'We have your application',
    `<p style="margin:0 0 16px;font-size:15px;">Hi ${escapeHtml(firstName)},</p>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Thanks for applying for <strong>${escapeHtml(data.jobTitle)}</strong>. Your application and CV have reached us and are with the team reviewing this role.</p>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">If your experience lines up with what the role needs, someone will contact you directly to arrange a conversation. We keep your CV on file for future openings unless you ask us not to.</p>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">You do not need to send anything else. If you want to correct something or withdraw, reply to this email and we will sort it out.</p>
     <p style="margin:24px 0 0;font-size:14px;color:#605E5C;">— The Onsys team</p>`,
    { footer: false },
  );
}

export interface OnCallEnrolmentEmailData {
  id: string;
  companyName: string;
  website: string | null;
  contactName: string;
  workEmail: string;
  phone: string;
  address: string;
  instanceCount: number;
  unitPriceCents: number;
  monthlyTotalCents: number;
  hourlyRateCents: number;
  currency: string;
  notes: string | null;
}

/** "$800" — every figure on the on-call page is a round number. */
function dollars(cents: number, currency = 'AUD'): string {
  return (cents / 100).toLocaleString('en-AU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * "A company has enrolled" — to the on-call inbox.
 *
 * Everything needed to act on it without opening anything else, because the
 * action it asks for has a deadline: cover is promised live within one
 * business day, and a mail that sends somebody looking for the address is a
 * mail that costs part of that day.
 */
export function renderOnCallEnrolmentNotification(data: OnCallEnrolmentEmailData): string {
  return wrapEmail(
    `On-call enrolment — ${data.companyName}`,
    `<p style="margin:0 0 18px;font-size:15px;"><strong>${escapeHtml(data.companyName)}</strong> has enrolled in on-call cover for <strong>${data.instanceCount} SQL Server instances</strong>.</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
       ${row('Monthly subscription', `${dollars(data.monthlyTotalCents, data.currency)} ex GST (${data.instanceCount} × ${dollars(data.unitPriceCents, data.currency)})`)}
       ${row('Call-out rate', `${dollars(data.hourlyRateCents, data.currency)} per hour`)}
       ${row('Contact', data.contactName)}
       ${row('Email', data.workEmail)}
       ${row('Phone', data.phone)}
       ${row('Company', data.companyName)}
       ${row('Website', data.website)}
       ${row('Invoice address', data.address)}
     </table>
     ${
       data.notes
         ? `<div style="margin-top:20px;">
              <div style="font-size:13px;color:#605E5C;margin-bottom:6px;">What they told us</div>
              <div style="background:#F8FAFC;border-left:3px solid ${BRAND_ORANGE};padding:14px 16px;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(data.notes)}</div>
            </div>`
         : ''
     }
     <p style="margin:24px 0 0;font-size:14px;line-height:1.6;">Next: confirm the estate and versions, set up secure access, issue the support number, and raise the subscription in Onsys Support against the ONCALL-SQL product. The customer has been told cover goes live within one business day.</p>
     <p style="margin:18px 0 0;font-size:13px;color:#605E5C;">Replying to this email goes straight to ${escapeHtml(data.contactName)}.</p>`,
  );
}

/**
 * "We have your enrolment" — to the customer.
 *
 * States what they have agreed to in figures, so the first invoice is never a
 * surprise, and says what happens next without promising anything the team
 * cannot do by tomorrow. The account link is offered, not demanded: cover
 * starts regardless of whether they ever create a login.
 */
export function renderOnCallEnrolmentAcknowledgement(data: OnCallEnrolmentEmailData): string {
  const firstName = data.contactName.split(' ')[0] || data.contactName;
  return wrapEmail(
    'We have your on-call enrolment',
    `<p style="margin:0 0 16px;font-size:15px;">Hi ${escapeHtml(firstName)},</p>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Thanks for starting on-call cover for <strong>${escapeHtml(data.companyName)}</strong>. Here is what you have enrolled in:</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
       ${row('Instances covered', String(data.instanceCount))}
       ${row('Monthly subscription', `${dollars(data.monthlyTotalCents, data.currency)} ex GST`)}
       ${row('Support calls', `${dollars(data.hourlyRateCents, data.currency)} per hour, only when you call`)}
       ${row('Invoiced to', data.address)}
     </table>
     <p style="margin:20px 0 16px;font-size:15px;line-height:1.6;">A consultant will be in touch to confirm your versions and platforms, agree escalation paths and set up secure access. Cover goes live within one business day of that call, and you will get a dedicated support number to ring.</p>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Nothing is invoiced until cover is live. If anything above is wrong, reply to this email and we will correct it.</p>
     <p style="margin:0 0 8px;font-size:15px;line-height:1.6;">You can set up your login for Onsys Support now, where you will raise tickets and see your invoices:</p>
     <p style="margin:0 0 20px;">
       <a href="${env.ONCALL_SIGNUP_URL}?plan=oncall&amp;instances=${data.instanceCount}" style="display:inline-block;background:${BRAND_ORANGE};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:4px;font-weight:600;font-size:14px;">Create your Onsys Support login</a>
     </p>
     <p style="margin:0;font-size:13.5px;line-height:1.6;color:#605E5C;">On-call is reactive cover: we are on standby for your instances and respond when you raise a call. It does not include continuous monitoring or routine administration — if you want those, ask us about the monthly plans.</p>
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

interface HealthCheckInput {
  name: string;
  company: string;
  email: string;
  /// Optional on the form, so the alert has to cope with its absence rather
  /// than render an empty tel: link nobody can dial.
  phone?: string;
  sqlVersion: string;
  instanceCount?: string;
  notes?: string;
}

/**
 * Acknowledgement to whoever asked for the health check.
 *
 * Leads with the collector rather than with a thank-you. There is no slot to
 * wait for any more: the script is ready the moment someone asks, and the whole
 * proposition is that they read the queries before running them. So the
 * download and the four steps are the most useful things this email can carry.
 */
export function renderHealthCheckAck(
  r: HealthCheckInput & {
    earliest: string;
    leadDays: number;
    alreadyClaimed?: boolean;
    collectorUrl: string;
    collectorExpiryDays: number;
  },
): string {
  const step = 'margin:0 0 10px;font-size:15px;line-height:1.6;';

  return wrapEmail(
    'Your free 20-point SQL Server health check',
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Thanks ${escapeHtml(r.name)} — we have your request for ${escapeHtml(r.company)}. There is nothing to wait for: the collector is ready now.</p>
     <p style="margin:0 0 22px;">
       <a href="${env.SITE_URL}${r.collectorUrl}" style="display:inline-block;background:${BRAND_ORANGE};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:4px;font-weight:600;font-size:15px;">Download the collector script</a>
     </p>
     <p style="${step}"><strong>1. Read it first.</strong> Every one of the twenty checkpoints is a read-only query, and all of them are <a href="${env.SITE_URL}/onsys-sql-server-health-check.html">published in full</a> so you can review them — and get whatever change approval you need — before anything runs.</p>
     <p style="${step}"><strong>2. Run it against one instance.</strong> <code style="font-size:13px;background:#F3F2F1;padding:2px 5px;border-radius:3px;">.\Invoke-OnsysHealthCheck.ps1 -ServerInstance YOURINSTANCE</code> — about twenty minutes, using Windows PowerShell, which is already on the server.</p>
     <p style="${step}"><strong>3. Send us the zip.</strong> Email it to <a href="mailto:${escapeHtml(env.HEALTHCHECK_RESULTS_TO)}">${escapeHtml(env.HEALTHCHECK_RESULTS_TO)}</a>, quoting your company name.</p>
     <p style="margin:0 0 22px;font-size:15px;line-height:1.6;"><strong>4. We take it from there.</strong> A written report rating all twenty points within <strong>3 business days</strong> of your results reaching us, and a free Teams walkthrough booked within <strong>5 business days</strong>.</p>
     <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;border-collapse:collapse;margin:0 0 16px;">
       <tr><td style="padding:6px 0;color:#605E5C;">SQL Server version</td><td style="padding:6px 0;text-align:right;">${escapeHtml(r.sqlVersion)}</td></tr>
       ${r.instanceCount ? `<tr><td style="padding:6px 0;color:#605E5C;">Instances</td><td style="padding:6px 0;text-align:right;">${escapeHtml(r.instanceCount)}</td></tr>` : ''}
       <tr><td style="padding:6px 0;color:#605E5C;">Send results to</td><td style="padding:6px 0;text-align:right;">${escapeHtml(env.HEALTHCHECK_RESULTS_TO)}</td></tr>
     </table>
     ${
       r.alreadyClaimed
         ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#6B5900;background:#FFF4CE;border:1px solid #F0DFA0;border-radius:6px;padding:12px 14px;">Our records show the free health check has already been used by someone at your organisation. The offer is one instance per customer, so a second review is a paid engagement — a consultant will come back to you with what that involves. You are welcome to keep and re-run the scripts either way.</p>`
         : ''
     }
     <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#605E5C;">Your download link is personal to this request and stays live for ${r.collectorExpiryDays} days. Ask again from the website any time for a fresh one.</p>
     <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#605E5C;">The collector is read-only: it queries dynamic management views and catalog views only, writes nothing to your instance, changes no configuration, and does not read the contents of your tables. It is provided as is, without warranty — please review it before running it.</p>
     <p style="margin:0;font-size:14px;line-height:1.6;color:#605E5C;">If production is down right now, do not wait for this — call <strong>${escapeHtml(org.phone)}</strong>.</p>`,
  );
}

/** Internal alert with everything a consultant needs before the report. */
export function renderHealthCheckAlert(
  r: HealthCheckInput & { alreadyClaimed?: boolean },
): string {
  return wrapEmail(
    'Health check request',
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;"><strong>${escapeHtml(r.company)}</strong> has requested the free 20-point health check.</p>
     ${
       r.alreadyClaimed
         ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#8A1220;background:#FDE7E9;border:1px solid #F5B5BC;border-radius:6px;padding:12px 14px;"><strong>Repeat claim.</strong> Someone at this organisation has already had the free check. Quote a paid review rather than running a second free one.</p>`
         : ''
     }
     <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;border-collapse:collapse;margin:0 0 16px;">
       <tr><td style="padding:6px 0;color:#605E5C;">Contact</td><td style="padding:6px 0;text-align:right;">${escapeHtml(r.name)}</td></tr>
       <tr><td style="padding:6px 0;color:#605E5C;">Email</td><td style="padding:6px 0;text-align:right;"><a href="mailto:${escapeHtml(r.email)}">${escapeHtml(r.email)}</a></td></tr>
       <tr><td style="padding:6px 0;color:#605E5C;">Phone</td><td style="padding:6px 0;text-align:right;">${
         r.phone
           ? `<a href="tel:${escapeHtml(r.phone)}">${escapeHtml(r.phone)}</a>`
           : 'Not given — reply by email'
       }</td></tr>
       <tr><td style="padding:6px 0;color:#605E5C;">SQL Server version</td><td style="padding:6px 0;text-align:right;"><strong>${escapeHtml(r.sqlVersion)}</strong></td></tr>
       <tr><td style="padding:6px 0;color:#605E5C;">Instances</td><td style="padding:6px 0;text-align:right;">${escapeHtml(r.instanceCount || '—')}</td></tr>
     </table>
     ${r.notes ? `<p style="margin:0;font-size:14px;line-height:1.6;"><strong>Notes:</strong><br/>${escapeHtml(r.notes)}</p>` : ''}`,
  );
}

interface EmergencyRecord {
  name: string;
  company: string | null;
  phone: string;
  email: string;
  summary: string | null;
  hours: number;
  amountCents: number | null;
  currency: string;
}

const money = (cents: number | null, currency: string): string =>
  cents == null
    ? '—'
    : new Intl.NumberFormat('en-AU', { style: 'currency', currency: currency.toUpperCase() }).format(
        cents / 100,
      );

/**
 * Receipt for a prepaid emergency block.
 *
 * The phone number is the first thing in it and the largest thing in it. The
 * customer has just paid because production is down; a receipt that leads with
 * an invoice reference is a receipt that wastes their next thirty seconds.
 */
export function renderEmergencyReceipt(r: EmergencyRecord): string {
  return wrapEmail(
    'Your emergency support block is active',
    `<p style="margin:0 0 8px;font-size:15px;line-height:1.6;">Thanks ${escapeHtml(r.name)} — your ${r.hours}-hour emergency block is paid and active.</p>
     <p style="margin:0 0 8px;font-size:15px;line-height:1.6;"><strong>Call us now:</strong></p>
     <p style="margin:0 0 20px;">
       <a href="tel:${escapeHtml(org.phoneE164)}" style="display:inline-block;background:${BRAND_ORANGE};color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:4px;font-weight:700;font-size:20px;">${escapeHtml(org.phone)}</a>
     </p>
     <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">Quote your name or company and we will pick up from there. If you would rather book a scheduled session, use <a href="${env.SITE_URL}/book">${env.SITE_URL}/book</a> and you will get a Teams link by email.</p>
     <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;border-collapse:collapse;margin:0 0 16px;">
       <tr><td style="padding:6px 0;color:#605E5C;">Purchased</td><td style="padding:6px 0;text-align:right;">${r.hours} hours</td></tr>
       <tr><td style="padding:6px 0;color:#605E5C;">Amount paid</td><td style="padding:6px 0;text-align:right;">${money(r.amountCents, r.currency)} (GST inclusive)</td></tr>
       <tr><td style="padding:6px 0;color:#605E5C;">Contact</td><td style="padding:6px 0;text-align:right;">${escapeHtml(r.phone)}</td></tr>
     </table>
     <p style="margin:0;font-size:13px;line-height:1.6;color:#605E5C;">Hours are consumed against actual work performed. Anything unused is credited against further work or refunded on request — just reply to this email.</p>`,
  );
}

/** Internal alert: everything needed to call the customer back immediately. */
export function renderEmergencyAlert(r: EmergencyRecord): string {
  return wrapEmail(
    'Paid emergency support request',
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;"><strong>${escapeHtml(r.company || r.name)}</strong> has paid for a ${r.hours}-hour emergency block. They are expecting a consultant.</p>
     <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;border-collapse:collapse;margin:0 0 16px;">
       <tr><td style="padding:6px 0;color:#605E5C;">Name</td><td style="padding:6px 0;text-align:right;">${escapeHtml(r.name)}</td></tr>
       <tr><td style="padding:6px 0;color:#605E5C;">Company</td><td style="padding:6px 0;text-align:right;">${escapeHtml(r.company || '—')}</td></tr>
       <tr><td style="padding:6px 0;color:#605E5C;">Phone</td><td style="padding:6px 0;text-align:right;"><a href="tel:${escapeHtml(r.phone)}">${escapeHtml(r.phone)}</a></td></tr>
       <tr><td style="padding:6px 0;color:#605E5C;">Email</td><td style="padding:6px 0;text-align:right;"><a href="mailto:${escapeHtml(r.email)}">${escapeHtml(r.email)}</a></td></tr>
       <tr><td style="padding:6px 0;color:#605E5C;">Paid</td><td style="padding:6px 0;text-align:right;">${money(r.amountCents, r.currency)}</td></tr>
     </table>
     ${r.summary ? `<p style="margin:0;font-size:14px;line-height:1.6;"><strong>What is happening:</strong><br/>${escapeHtml(r.summary)}</p>` : ''}`,
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
