import { z } from 'zod';

/**
 * Vacancies, shared between the admin console and the public /careers pages.
 *
 * Ported from the standalone cv-post-app. The enums and the slug rule are
 * carried over verbatim so existing adverts move across without rewording;
 * everything else follows this codebase's conventions — ContentStatus instead
 * of an isPublished boolean, and the SEO fields every other content type has.
 */

export const JOB_TYPES = [
  'PERMANENT',
  'CONTRACT',
  'INTERN',
  'TRAINEE',
  'CASUAL',
  'PART_TIME',
] as const;
export const JOB_LOCATIONS = ['AUSTRALIA', 'SRI_LANKA'] as const;
export const WORK_ARRANGEMENTS = ['ONSITE', 'HYBRID', 'REMOTE'] as const;

export type JobTypeValue = (typeof JOB_TYPES)[number];
export type JobLocationValue = (typeof JOB_LOCATIONS)[number];
export type WorkArrangementValue = (typeof WORK_ARRANGEMENTS)[number];

export const JOB_TYPE_LABEL: Record<JobTypeValue, string> = {
  PERMANENT: 'Permanent',
  CONTRACT: 'Contract',
  INTERN: 'Internship',
  TRAINEE: 'Trainee',
  CASUAL: 'Casual',
  PART_TIME: 'Part-time',
};

export const JOB_LOCATION_LABEL: Record<JobLocationValue, string> = {
  AUSTRALIA: 'Australia',
  SRI_LANKA: 'Sri Lanka',
};

export const WORK_ARRANGEMENT_LABEL: Record<WorkArrangementValue, string> = {
  ONSITE: 'On-site',
  HYBRID: 'Hybrid',
  REMOTE: 'Remote',
};

/** Matches the slug rule used for pages and posts. */
export const JOB_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A URL slug from a job title.
 *
 * Decomposes accents before stripping them, so "Développeur" becomes
 * "developpeur" rather than "d-veloppeur".
 */
export function slugifyJob(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export const jobInputSchema = z.object({
  title: z.string().trim().min(1, 'Job title is required').max(200),
  slug: z
    .string()
    .trim()
    .min(2, 'URL slug is too short')
    .max(80, 'URL slug is too long')
    .regex(
      JOB_SLUG_PATTERN,
      'URL slug may only contain lowercase letters, numbers and hyphens (e.g. sql-server-dba-melbourne)',
    ),
  summary: z.string().trim().min(1, 'A one-line summary is required').max(300),
  type: z.enum(JOB_TYPES),
  location: z.enum(JOB_LOCATIONS),
  workArrangement: z.enum(WORK_ARRANGEMENTS),
  descriptionHtml: z
    .string()
    .trim()
    .min(10, 'Job description is too short')
    .max(50_000, 'Job description is too long'),
  /// Optional, and published when given — the site publishes its prices.
  salaryRange: z.string().trim().max(160).optional().or(z.literal('')),
  /**
   * Applications close at the end of this day. Accepts a date or a full
   * timestamp so an <input type="date"> posts straight back.
   */
  closesAt: z
    .string()
    .trim()
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Closing date is invalid'),
  applyEmail: z.string().trim().email('Enter a valid email address').max(200).optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  seoTitle: z.string().trim().max(200).optional().or(z.literal('')),
  seoDescription: z.string().trim().max(320).optional().or(z.literal('')),
});
export type JobInput = z.infer<typeof jobInputSchema>;

/** What the public listing and detail pages receive. */
export interface JobRecord {
  id: string;
  slug: string;
  title: string;
  summary: string;
  type: JobTypeValue;
  location: JobLocationValue;
  workArrangement: WorkArrangementValue;
  descriptionHtml: string;
  salaryRange: string | null;
  closesAt: string;
  applyEmail: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

export type JobSummary = Omit<JobRecord, 'descriptionHtml'>;

/**
 * Is this vacancy still open?
 *
 * `closesAt` is stored as an instant but means "end of that day", so a job
 * closing today is open all of today. Without this, a job posted with a close
 * date of today would vanish from the listing the moment it was published.
 */
export function isJobOpen(closesAt: string | Date, now: Date = new Date()): boolean {
  const close = closesAt instanceof Date ? new Date(closesAt) : new Date(closesAt);
  if (Number.isNaN(close.getTime())) return false;
  close.setHours(23, 59, 59, 999);
  return close.getTime() >= now.getTime();
}
