import { z } from 'zod';

/**
 * Job applications: the form a candidate fills in, and the pipeline HR works.
 *
 * This replaces "email a CV to jobs@onsys.com.au". An inbox is a bad applicant
 * tracker for one specific reason: there is no state on a message. Nothing
 * records that a CV was read, nobody can tell whether a colleague has already
 * replied, a deleted mail is gone, and a CV that arrives while someone is on
 * leave is indistinguishable from one that has been dealt with. Every one of
 * those is a candidate who never hears back.
 *
 * The rules live here rather than in the API because the browser must apply
 * the same ones. A candidate who has typed out their history and attached a CV
 * should be told "that file is 14 MB" before they submit, not after — but the
 * API cannot take the browser's word for any of it, so it re-checks all of it.
 */

// ---------------------------------------------------------------
// The pipeline
// ---------------------------------------------------------------

/**
 * Where an application is up to.
 *
 * Named after what has happened, not what someone intends to do, so two people
 * reading the list agree on what they are seeing. REVIEWED is deliberately
 * distinct from NEW: "somebody has read this" is the single most useful fact
 * in a shared queue, and it is exactly the fact an inbox cannot hold.
 */
export const APPLICATION_STATUSES = [
  'NEW',
  'REVIEWED',
  'SHORTLISTED',
  'INTERVIEWING',
  'OFFERED',
  'HIRED',
  'REJECTED',
  'WITHDRAWN',
] as const;

export type ApplicationStatusValue = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatusValue, string> = {
  NEW: 'New',
  REVIEWED: 'Reviewed',
  SHORTLISTED: 'Shortlisted',
  INTERVIEWING: 'Interviewing',
  OFFERED: 'Offer made',
  HIRED: 'Hired',
  REJECTED: 'Not proceeding',
  WITHDRAWN: 'Withdrawn',
};

/**
 * Statuses that still need something from us.
 *
 * The count that matters on the dashboard is not "how many applications" but
 * "how many are waiting on me" — the question the old inbox could not answer.
 */
export const APPLICATION_STATUSES_OPEN: readonly ApplicationStatusValue[] = [
  'NEW',
  'REVIEWED',
  'SHORTLISTED',
  'INTERVIEWING',
  'OFFERED',
];

/** Is this application still live, as opposed to closed out either way? */
export function isApplicationOpen(status: ApplicationStatusValue): boolean {
  return APPLICATION_STATUSES_OPEN.includes(status);
}

// ---------------------------------------------------------------
// The CV file
// ---------------------------------------------------------------

/**
 * 10 MB, matching the standalone app this replaces.
 *
 * Generous for a CV — a text-only PDF is tens of kilobytes — but people attach
 * scanned certificates and portfolio pages, and rejecting those at the door
 * costs us candidates for no security gain. The limit exists so one submission
 * cannot fill the disk, and it is enforced by the upload middleware before the
 * bytes are buffered, not by this constant alone.
 */
export const CV_MAX_BYTES = 10 * 1024 * 1024;

/** The three formats a CV actually arrives in. */
export const CV_ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'] as const;

/**
 * Accepted content types, by extension.
 *
 * A browser's reported type is a hint, not evidence: Windows machines without
 * Office installed send `application/octet-stream` for a .docx, and some send
 * nothing at all. So an empty or generic type is tolerated here and the real
 * check is the file's own leading bytes — see sniffCvFormat.
 */
export const CV_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
  '',
] as const;

/** The accept attribute for the file input, kept in step with the list above. */
export const CV_ACCEPT_ATTRIBUTE = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export type CvFormat = 'pdf' | 'doc' | 'docx';

/** The extension of a filename, lowercased, including the dot. */
export function fileExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot).toLowerCase() : '';
}

/**
 * Identify a file by its leading bytes rather than its name.
 *
 * The extension is attacker-controlled and the content type is unreliable, so
 * neither is allowed to decide what gets written to disk. These three
 * signatures are stable and documented:
 *
 *   %PDF            PDF, every version
 *   PK\x03\x04      ZIP container — which is what a .docx is
 *   \xD0\xCF\x11\xE0  OLE2 compound file — the old binary .doc
 *
 * Returns null when the bytes match nothing known, which the caller treats as
 * a rejection. Note this cannot distinguish a .docx from any other zip: that
 * is what the extension check is for, and the two together are what make a
 * renamed .exe fail.
 */
export function sniffCvFormat(head: Uint8Array): CvFormat | null {
  const startsWith = (...bytes: number[]): boolean =>
    bytes.length <= head.length && bytes.every((b, i) => head[i] === b);

  if (startsWith(0x25, 0x50, 0x44, 0x46)) return 'pdf'; // %PDF
  if (startsWith(0x50, 0x4b, 0x03, 0x04)) return 'docx'; // PK..
  if (startsWith(0xd0, 0xcf, 0x11, 0xe0)) return 'doc'; // OLE2
  return null;
}

export interface CvCandidate {
  filename: string;
  /** Browser-reported content type. May be empty or generic; see above. */
  mimeType?: string;
  size: number;
  /** The first few bytes. Omitted in the browser, where they are not read. */
  head?: Uint8Array;
}

/**
 * Everything that can be wrong with an attached CV, in one place.
 *
 * Returns a message a candidate can act on, or null when the file is fine.
 * The messages name the fix ("save it as a PDF"), because "invalid file" tells
 * someone holding a .pages document nothing at all.
 */
export function describeCvProblem(file: CvCandidate): string | null {
  if (!file.filename.trim()) return 'Attach your CV.';

  if (file.size === 0) {
    return 'That file is empty. Check it opens on your machine, then attach it again.';
  }
  if (file.size > CV_MAX_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `That file is ${mb} MB. The limit is 10 MB — a PDF export is usually much smaller than a scan.`;
  }

  const ext = fileExtension(file.filename);
  if (!CV_ALLOWED_EXTENSIONS.includes(ext as (typeof CV_ALLOWED_EXTENSIONS)[number])) {
    return 'Attach your CV as a PDF or Word document (.pdf, .doc or .docx). If it is in Pages, Google Docs or another format, export it as a PDF first.';
  }

  if (
    file.mimeType !== undefined &&
    !CV_ALLOWED_MIME_TYPES.includes(file.mimeType as (typeof CV_ALLOWED_MIME_TYPES)[number])
  ) {
    return 'That file is not a PDF or Word document. Export your CV as a PDF and attach that.';
  }

  // Server-side only: the browser does not read the file to validate it.
  if (file.head) {
    const sniffed = sniffCvFormat(file.head);
    if (!sniffed) {
      return 'That file is not a readable PDF or Word document. Export your CV as a PDF and attach that.';
    }
    // A .pdf must be a PDF. A .doc/.docx may be either an OLE2 or a zip
    // container, so the extension and the signature only have to agree on
    // which family the file belongs to.
    const expectsPdf = ext === '.pdf';
    if (expectsPdf !== (sniffed === 'pdf')) {
      return `That file is named "${ext}" but its contents are not. Re-save it and attach it again.`;
    }
  }

  return null;
}

// ---------------------------------------------------------------
// The form
// ---------------------------------------------------------------

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  trimmed(max)
    .optional()
    .or(z.literal(''))
    .transform((v) => v || '');

/**
 * What a candidate fills in, beside the CV itself.
 *
 * Short on purpose. Every extra field costs completed applications, and the CV
 * already carries the employment history — so this asks only for what we need
 * to reply, to rank, or to arrange a call, and nothing the document repeats.
 * The standalone app's separate qualification, experience and skill tables are
 * not carried over for that reason: a candidate retyping their CV into a web
 * form is a candidate who gives up halfway.
 */
export const applicationInputSchema = z.object({
  jobId: z.string().trim().min(1, 'Which role are you applying for?'),

  fullName: trimmed(200).min(1, 'Enter your name'),
  email: z.string().trim().toLowerCase().email('Enter an email address we can reply to').max(200),
  phone: trimmed(40).min(5, 'Enter a phone number with your country code'),

  /**
   * Where the candidate is, as they describe it. Free text rather than a
   * country list: these roles span Australia and Sri Lanka, remote candidates
   * apply from everywhere, and "Colombo" is more use to a hiring manager than
   * a code. Right-to-work is a conversation, not a dropdown.
   */
  location: trimmed(160).min(1, 'Where are you based?'),

  /** Optional extras. Useful for ranking, never a reason to block a submission. */
  noticePeriod: optionalText(80),
  expectedSalary: optionalText(80),
  linkedinUrl: z
    .string()
    .trim()
    .max(300)
    .optional()
    .or(z.literal(''))
    .transform((v) => v || '')
    .refine(
      (v) => v === '' || /^https?:\/\/[^\s]+$/i.test(v),
      'Paste the full link, starting with https://',
    ),
  coverNote: optionalText(4000),

  /**
   * Consent to us holding the CV, with the moment it was given.
   *
   * A CV is personal information under the Privacy Act and we keep it on file
   * after the role closes, so there has to be a record that the candidate was
   * told that and agreed. A literal `true` rather than a boolean: an unticked
   * box must fail validation, not arrive as false and be stored as consent.
   */
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Tick the box to let us keep your CV on file' }),
  }),

  /** Attribution, carried the same way the contact form carries it. */
  referrer: optionalText(500),
  landingPath: optionalText(300),
});

export type ApplicationInput = z.infer<typeof applicationInputSchema>;

/** Admin: move an application along the pipeline. */
export const applicationStatusSchema = z.object({
  status: z.enum(APPLICATION_STATUSES),
});

/**
 * Admin: the shared running commentary on a candidate.
 *
 * One editable field rather than an append-only thread. The thread is the
 * better design and the standalone app has one; this is the smaller thing that
 * makes the queue workable now, and a note table can replace it without
 * changing anything a candidate sees.
 */
export const applicationNotesSchema = z.object({
  notes: z.string().trim().max(8000),
});

/**
 * What the admin console receives for each row of the queue.
 *
 * It carries the short answers — notice period, salary expectation, a link —
 * because those are what a row is triaged on, and a reviewer who has to open
 * every application to find them ends up opening none of them. The candidate's
 * written note is not here: only whether there is one, since the text can run
 * to four thousand characters and five hundred of those would be a payload
 * nobody reads in a table.
 */
export interface ApplicationSummary {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  status: ApplicationStatusValue;
  cvOriginalName: string;
  cvBytes: number;
  submittedAt: string;
  statusChangedAt: string | null;
  noticePeriod: string | null;
  expectedSalary: string | null;
  linkedinUrl: string | null;
  /** Is there a note to read? The note itself is on the detail page. */
  hasCoverNote: boolean;
  job: { id: string; slug: string; title: string };
}

export interface ApplicationRecord extends ApplicationSummary {
  coverNote: string | null;
  notes: string | null;
  consentAt: string;
  referrer: string | null;
  landingPath: string | null;
  ip: string | null;
  acknowledgedAt: string | null;
  statusChangedBy: { name: string } | null;
}
