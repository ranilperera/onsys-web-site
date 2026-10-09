import { z } from 'zod';
import { blocksSchema } from './blocks';

/**
 * Case studies — anonymised accounts of delivered work.
 *
 * The anonymisation is the contract, not a style choice. The source material is
 * commercial-in-confidence client documentation, no permission to name has been
 * given for any engagement, and the write-ups therefore carry sector, region
 * and year and nothing else. `region` is coarse for the Pacific on purpose:
 * sector plus country identifies the client in a market with one operator.
 */

/*
 * 'Pacific' rather than 'Pacific Islands' since 9 October 2026. Four of the
 * published studies sit in this region and two share a sector; the narrower
 * label made it easier to join them into one identifiable operator. The
 * market pages keep the phrase 'Pacific Islands' in their copy — this is the
 * case-study label only.
 */
export const CASE_STUDY_REGIONS = ['Australia', 'New Zealand', 'Sri Lanka', 'Pacific'] as const;
export type CaseStudyRegion = (typeof CASE_STUDY_REGIONS)[number];

export const caseStudyInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  slug: z
    .string()
    .trim()
    .min(2, 'URL slug is too short')
    .max(80, 'URL slug is too long')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'URL slug may only contain lowercase letters, numbers and hyphens',
    ),
  summary: z.string().trim().min(1, 'A one-line summary is required').max(400),
  sector: z.string().trim().min(1, 'Sector is required').max(80),
  region: z.enum(CASE_STUDY_REGIONS),
  deliveredYear: z.coerce
    .number()
    .int()
    .min(2000, 'Year looks wrong')
    .max(new Date().getFullYear(), 'Year cannot be in the future'),
  blocks: blocksSchema,
  platforms: z.array(z.string().trim().max(60)).max(12).default([]),
  seoTitle: z.string().trim().max(200).optional().or(z.literal('')),
  seoDescription: z.string().trim().max(320).optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
});
export type CaseStudyInput = z.infer<typeof caseStudyInputSchema>;

export interface CaseStudySummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  sector: string;
  region: string;
  deliveredYear: number;
  platforms: string[];
  publishedAt: string | null;
  updatedAt: string;
  contentUpdatedAt: string | null;
}

export interface CaseStudyRecord extends CaseStudySummary {
  blocks: unknown;
  seoTitle: string | null;
  seoDescription: string | null;
}

/**
 * Patterns that must never appear in published case-study copy.
 *
 * This is a guard, not a sanitiser: it refuses the content rather than quietly
 * editing it, because a hostname silently stripped out of a sentence leaves a
 * sentence that no longer says what its author meant. Every pattern here was
 * found in the source documents.
 */
const FORBIDDEN: Array<{ pattern: RegExp; what: string }> = [
  /*
   * Hostnames in the house style of the source documents — AUMELPPSQL001,
   * DC1DARPN2, DC1DARPV1AG2, mpvl-gsn-ora02, tci-mysql01.
   *
   * A long all-caps token that contains a digit, or a lowercase token with a
   * trailing number. Nine characters is the threshold because it is what
   * separates those from ISO27001 and from words like POSTGRESQL, which a case
   * study legitimately contains.
   *
   * This is a net, not a sieve. It cannot tell an availability-group name made
   * only of letters from an ordinary word, and no pattern can. It catches the
   * realistic mistake — a line pasted out of a design document — and it is not
   * a substitute for reading the copy before publishing it.
   */
  { pattern: /\b(?=[A-Z0-9]*\d)[A-Z][A-Z0-9]{8,}\b/, what: 'what looks like a hostname' },
  { pattern: /\b[a-z]{2,5}-[a-z]{2,10}\d{2,}\b/, what: 'what looks like a hostname' },
  // Dotted quads. Deliberately not matching version numbers like 8.4.
  { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, what: 'an IP address' },
  // Build numbers and four-part versions, e.g. 13.0.2164.0.
  { pattern: /\b\d+\.\d+\.\d+\.\d+\b/, what: 'a build number' },
  // Money. Case studies describe work, not commercials.
  { pattern: /(?:AUD|USD|FJD|LKR|\$)\s?\d[\d,]*/, what: 'a price' },
  { pattern: /\bport\s+\d{3,5}\b/i, what: 'a port number' },
];

/**
 * Check case-study copy for identifiers that must not be published.
 *
 * Returns the problems found, empty when clean. Called by the admin API on
 * save, so a hostname pasted out of a design document is refused at the point
 * someone tries to publish it rather than discovered by a client later.
 */
export function findForbiddenIdentifiers(text: string): string[] {
  const found: string[] = [];
  for (const { pattern, what } of FORBIDDEN) {
    const m = text.match(pattern);
    if (m) found.push(`${what}: "${m[0]}"`);
  }
  return found;
}
