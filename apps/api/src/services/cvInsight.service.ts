import { readFile } from 'node:fs/promises';
import type { CvInsight, CvRequirementMatch, CvSummary } from '@onsys/shared';
import OpenAI from 'openai';
import { env, aiConfigured } from '../lib/env';
import { logger } from '../lib/logger';
import { cvPath } from './cvStorage.service';

/**
 * Reading a CV without opening it.
 *
 * The application queue worked, but every decision in it cost a round trip:
 * download the file, wait for a PDF reader, read it, close it, go back, find
 * your place again. At a hundred applications that is the whole afternoon, and
 * the predictable result is that the ones at the bottom never get read.
 *
 * So the text comes out of the file here and is shown on the screen the
 * reviewer is already looking at. The download stays — it is still the real
 * document, and some CVs are designed as much as written — but it stops being
 * the only way to find out whether somebody is worth a phone call.
 *
 * Three honesty rules run through this module:
 *
 *   - A CV we cannot read is reported as unreadable, with the reason, never as
 *     an empty summary. A scanned CV is a real application from a real person.
 *   - A summary says how it was made. A keyword scan and a read are worth
 *     very different amounts.
 *   - Nothing here decides anything. It surfaces what the document says; the
 *     judgement stays with the person, which is also the only defensible
 *     position when the subject is somebody's livelihood.
 */

/**
 * Beyond this, a "CV" is a portfolio, a thesis or a scan of a filing cabinet.
 *
 * The cap is on the stored text rather than the file: a 9 MB PDF of images
 * yields nothing and a 60 KB one can yield plenty.
 */
const MAX_TEXT_CHARS = 120_000;

/** What the model is shown. Four thousand words is a long CV read in full. */
const MAX_PROMPT_CHARS = 24_000;

/**
 * Whether CV text may be sent to OpenAI to be summarised.
 *
 * Deliberately separate from OPENAI_API_KEY. The key being present means the
 * site has a chatbot; it does not mean somebody decided that candidates' CVs
 * may leave the organisation. Default is on where a key exists, because the
 * summary is the point of the feature, but it is one environment variable to
 * turn off and the console always says which path produced what it is showing.
 */
function aiSummariesAllowed(): boolean {
  return aiConfigured && env.CV_AI_SUMMARY;
}

let client: OpenAI | null = null;
function openai(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return client;
}

// ---------------------------------------------------------------
// Getting text out of the file
// ---------------------------------------------------------------

export interface ExtractedText {
  text: string;
  pages: number | null;
  /** Null when it worked. A sentence a recruiter can act on when it did not. */
  problem: string | null;
}

/**
 * Tidy extracted text into something readable on a screen.
 *
 * PDF extraction returns the page's text in drawing order, which leaves ragged
 * single-line gaps between what were columns and a lot of doubled blank lines.
 * Collapsing runs of blank lines to one keeps the document's real paragraph
 * breaks — which carry the structure of a CV — without the gaps.
 */
function tidy(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    // Zero-width and non-breaking characters survive extraction and then break
    // every search the reviewer tries.
    .replace(/[ ​-‍﻿]/g, ' ')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Pull the text out of a stored CV.
 *
 * Never throws. A reviewer opening an application wants the application; a
 * parser that could not cope with the file is a line on the screen, not an
 * error page in front of the candidate's details.
 */
export async function extractCvText(
  storageKey: string,
  mimeType: string,
  originalName: string,
): Promise<ExtractedText> {
  const ext = originalName.slice(originalName.lastIndexOf('.')).toLowerCase();
  const isPdf = mimeType === 'application/pdf' || ext === '.pdf';
  const isDocx =
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx';
  const isLegacyDoc = ext === '.doc';

  if (isLegacyDoc) {
    return {
      text: '',
      pages: null,
      problem:
        'This is an old-style Word .doc, which cannot be read as text here. Download it to open it in Word.',
    };
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(cvPath(storageKey));
  } catch (err) {
    logger.error({ err, key: storageKey }, 'CV file missing while extracting text');
    return {
      text: '',
      pages: null,
      problem: 'The CV file is missing from storage. The application record itself is intact.',
    };
  }

  try {
    if (isPdf) {
      // Required here rather than at module load: it is a couple of megabytes
      // of PDF machinery that most requests to this api never need.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pdf = require('pdf-parse') as (b: Buffer) => Promise<{
        text: string;
        numpages: number;
      }>;
      const parsed = await pdf(buffer);
      const text = tidy(parsed.text).slice(0, MAX_TEXT_CHARS);
      return {
        text,
        pages: parsed.numpages ?? null,
        problem: text
          ? null
          : // The commonest real case, and worth naming precisely: a photographed
            // or scanned CV is a perfectly good application that happens to be
            // pictures of words.
            'This PDF holds no text — it is most likely a scan or a photograph of a printed CV. Download it to read it.',
      };
    }

    if (isDocx) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mammoth = require('mammoth') as {
        extractRawText(input: { buffer: Buffer }): Promise<{ value: string }>;
      };
      const parsed = await mammoth.extractRawText({ buffer });
      const text = tidy(parsed.value).slice(0, MAX_TEXT_CHARS);
      return {
        text,
        pages: null,
        problem: text ? null : 'This Word document has no readable text in it.',
      };
    }
  } catch (err) {
    logger.warn({ err, key: storageKey }, 'Could not extract text from a CV');
    return {
      text: '',
      pages: null,
      problem: 'This file could not be read as text — it may be damaged. Download it to open it.',
    };
  }

  return {
    text: '',
    pages: null,
    problem: 'This file type cannot be read as text here. Download it to open it.',
  };
}

// ---------------------------------------------------------------
// What the advert asked for
// ---------------------------------------------------------------

/** Words that appear in every advert and tell you nothing about a candidate. */
const STOP_WORDS = new Set(
  (
    'the and for with you your our are will have has been this that from they them their there ' +
    'who whom what when where which while about into over under more most some any all can could ' +
    'would should must may might not but out off its it is as at be by do if in of or so to up ' +
    'we us a an role job work working team teams year years experience strong good great excellent ' +
    'ability able well across within also including include includes etc per plus new high help ' +
    'ensure ensuring support supporting provide providing deliver delivering manage managing lead ' +
    'leading build building run running make making take taking need needs needed looking look ' +
    'candidate candidates applicant applicants apply application onsys technologies company client ' +
    'clients customer customers business day days week weeks month months time full part position ' +
    'senior junior lead principal mid level you your we our us the and for with strong excellent ' +
    'familiarity knowledge understanding exposure awareness bonus advantage desirable essential ' +
    'preferred required responsibilities requirements about offer offering join joining ' +
    // Places are not skills. Leaving city and country names in the list would
    // put "does this CV say Melbourne?" beside "does it say SQL Server?" as
    // though the two were the same kind of question. Where somebody lives is
    // on the application form, where it belongs, and selecting on it here
    // would be both useless and the beginning of the wrong habit.
    'melbourne sydney brisbane perth adelaide canberra hobart darwin australia australian ' +
    'colombo kandy galle lanka sri india singapore zealand nsw vic qld'
  ).split(' '),
);

/**
 * Terms worth checking a CV against, taken from the advert itself.
 *
 * Not a fixed skills list. A fixed list goes stale the moment somebody writes
 * an advert for a role it does not cover, and it quietly stops matching
 * anything without ever saying so. The advert is the specification for the
 * job, so the advert is where the terms come from, and the check stays correct
 * for roles nobody has thought of yet.
 */
export function requirementTerms(descriptionHtml: string, title: string): string[] {
  const plain = `${title}. ${descriptionHtml}`
    .replace(/<[^>]+>/g, ' . ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ');

  /*
   * Phrases are found from word pairs, not by sliding a regex over the text.
   *
   * A single pattern walking the string pairs whatever happens to be adjacent
   * where the last match ended, which turned "Senior SQL Server DBA" into
   * "Senior SQL" and "Server DBA" — two phrases that are not technologies and
   * that no CV will ever contain. Counting every adjacent pair independently
   * lets the real one, "SQL Server", win on how often it appears.
   */
  const unigrams = new Map<string, { display: string; n: number }>();
  const bigrams = new Map<string, { display: string; n: number }>();

  const bump = (
    map: Map<string, { display: string; n: number }>,
    display: string,
  ): void => {
    const key = display.toLowerCase();
    const seen = map.get(key);
    if (seen) seen.n += 1;
    else map.set(key, { display, n: 1 });
  };

  /** A word worth naming: an acronym, a product name, or something dotted. */
  const technical = (word: string): boolean => {
    if (word.length < 2 || word.length > 24) return false;
    if (STOP_WORDS.has(word.toLowerCase())) return false;
    // SQL, DBA, BI, T-SQL, CI/CD — an acronym is upper case throughout, and
    // may carry a hyphen or slash.
    if (/^[A-Z][A-Z0-9+#.\-/]*[A-Z0-9+#]$/.test(word)) return true;
    // .NET, C#, C++, Node.js — punctuation is the giveaway.
    if (/[.+#]/.test(word) && /[A-Za-z]/.test(word)) return true;
    // Azure, Oracle, Kubernetes — a capitalised word that is not a stop word.
    return /^[A-Z][a-z]{2,}$/.test(word);
  };

  // Sentence and markup boundaries end a phrase: a pair that straddles one was
  // never a phrase, just two words that ended up next to each other.
  for (const segment of plain.split(/[.;:,!?()\n\r]+|\s-\s/)) {
    const words = segment
      .split(/\s+/)
      .map((w) => w.replace(/^[^A-Za-z0-9.#+]+|[^A-Za-z0-9.#+]+$/g, ''))
      .filter(Boolean);

    for (let i = 0; i < words.length; i += 1) {
      const word = words[i];
      if (!technical(word)) continue;
      if (word.length >= 3) bump(unigrams, word);

      const nextWord = words[i + 1];
      // "SQL Server", "Always On", "Power BI" — both halves capitalised, which
      // is how a product name is written and how an ordinary phrase is not.
      if (nextWord && /^[A-Z]/.test(nextWord) && !STOP_WORDS.has(nextWord.toLowerCase())) {
        if (nextWord.length >= 2 && nextWord.length <= 24) {
          bump(bigrams, `${word} ${nextWord}`);
        }
      }
    }
  }

  const byWeight = (a: { display: string; n: number }, b: { display: string; n: number }) =>
    b.n - a.n || a.display.localeCompare(b.display);

  /*
   * Phrases first, and then only the single words that are not already part of
   * one. Showing "SQL Server", "SQL" and "Server" as three separate things to
   * check would treble the list without adding a single question worth asking.
   */
  /*
   * Overlapping phrases are the same phrase seen twice. "Senior SQL Server
   * DBA" offers both "SQL Server" and "Server DBA"; only the first is a
   * technology, and the one that appears more often across the advert is the
   * one the advert is really about. Taking phrases strongest-first and
   * refusing any that reuses a word already spoken for settles it without a
   * list of known product names to maintain.
   */
  const phrases: Array<{ display: string; n: number }> = [];
  const claimed = new Set<string>();
  for (const candidate of [...bigrams.values()].sort(byWeight)) {
    const words = candidate.display.toLowerCase().split(' ');
    if (words.some((w) => claimed.has(w))) continue;
    phrases.push(candidate);
    for (const w of words) claimed.add(w);
    if (phrases.length === 8) break;
  }

  const singles = [...unigrams.values()]
    .filter((u) => !claimed.has(u.display.toLowerCase()))
    .sort(byWeight);

  return [...phrases, ...singles].slice(0, 14).map((t) => t.display);
}

/** Which of the advert's terms this CV mentions. */
export function matchRequirements(text: string, terms: string[]): CvRequirementMatch[] {
  const haystack = text.toLowerCase();
  return terms.map((term) => ({
    term,
    present: haystack.includes(term.toLowerCase()),
  }));
}

// ---------------------------------------------------------------
// Summarising
// ---------------------------------------------------------------

/** "11 years", "over 8 years" — the claim candidates make about themselves. */
function statedYears(text: string): number | null {
  const years = [...text.matchAll(/(\d{1,2})\s*\+?\s*years?\b/gi)]
    .map((m) => Number(m[1]))
    .filter((n) => n >= 1 && n <= 45);
  return years.length ? Math.max(...years) : null;
}

/**
 * A summary built from the text alone, with no model involved.
 *
 * Used when AI summarising is switched off or unavailable. It is honestly
 * labelled as a keyword scan, because that is all it is: it reports what the
 * document contains, and makes no claim to have understood any of it. The
 * extracted text is on the screen beside it, which is what actually replaces
 * the download.
 */
function keywordSummary(text: string, matches: CvRequirementMatch[]): CvSummary {
  const present = matches.filter((m) => m.present).map((m) => m.term);
  const missing = matches.filter((m) => !m.present).map((m) => m.term);
  const years = statedYears(text);

  // The opening lines of a CV are nearly always the name and the headline the
  // candidate chose for themselves, which beats anything inferred.
  const opening = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 4)
    .find((l) => l.length > 12 && l.length < 120 && !/@|\d{6}/.test(l));

  return {
    headline: opening ?? 'No headline found in the document.',
    yearsExperience: years,
    currentRole: null,
    skills: present,
    recentRoles: [],
    education: [],
    certifications: [],
    strengths: present.length ? [`Mentions ${present.slice(0, 6).join(', ')}`] : [],
    concerns: missing.length
      ? [`The advert asks about ${missing.slice(0, 6).join(', ')}; the CV does not mention it`]
      : [],
    source: 'keywords',
  };
}

const SUMMARY_INSTRUCTIONS = `You read CVs for a small Australian IT consultancy and report what is in them.

Return JSON only, matching this shape exactly:
{
  "headline": string,
  "yearsExperience": number | null,
  "currentRole": string | null,
  "skills": string[],
  "recentRoles": [{ "title": string, "employer": string, "period": string }],
  "education": string[],
  "certifications": string[],
  "strengths": string[],
  "concerns": string[]
}

Rules:
- Report only what the CV says. Never infer a skill, a date or an employer that is not written down. If something is absent, use null or an empty array.
- "headline" is one line describing the candidate professionally, as the CV presents them.
- "yearsExperience" is the total the CV claims or clearly shows. null if neither.
- "recentRoles" is at most the four most recent, most recent first. Use "" for any part the CV does not give.
- "skills" is at most twelve, ordered by prominence in the CV.
- "strengths" and "concerns" are each at most four short points, judged ONLY against the advert supplied, and each must be traceable to something the CV does or does not say. A gap in the record is a concern; a guess about the person is not.
- Never comment on age, gender, nationality, ethnicity, religion, marital or family status, health, disability, or a photograph, and never infer any of these from a name, a place or a date. These are not job-related and in Australia it is unlawful to select on them.
- Write plainly, in Australian English.`;

/** Ask the model to read the CV against this advert. */
async function aiSummary(
  text: string,
  job: { title: string; summary: string },
): Promise<CvSummary | null> {
  try {
    const completion = await openai().chat.completions.create({
      model: env.OPENAI_CHAT_MODEL,
      // The reading should not vary between two people opening the same CV.
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SUMMARY_INSTRUCTIONS },
        {
          role: 'user',
          content: `The advert this CV answers:\nTitle: ${job.title}\n${job.summary}\n\n--- CV ---\n${text.slice(0, MAX_PROMPT_CHARS)}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CvSummary>;

    // Trust nothing about the shape. A model that returns a string where an
    // array belongs would otherwise crash the screen this exists to simplify.
    const list = (v: unknown, cap: number): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, cap) : [];

    return {
      headline: typeof parsed.headline === 'string' ? parsed.headline : 'No summary available.',
      yearsExperience:
        typeof parsed.yearsExperience === 'number' && Number.isFinite(parsed.yearsExperience)
          ? parsed.yearsExperience
          : null,
      currentRole: typeof parsed.currentRole === 'string' ? parsed.currentRole : null,
      skills: list(parsed.skills, 12),
      recentRoles: Array.isArray(parsed.recentRoles)
        ? parsed.recentRoles
            .filter((r): r is NonNullable<CvSummary['recentRoles'][number]> => Boolean(r))
            .slice(0, 4)
            .map((r) => ({
              title: typeof r.title === 'string' ? r.title : '',
              employer: typeof r.employer === 'string' ? r.employer : '',
              period: typeof r.period === 'string' ? r.period : '',
            }))
        : [],
      education: list(parsed.education, 6),
      certifications: list(parsed.certifications, 8),
      strengths: list(parsed.strengths, 4),
      concerns: list(parsed.concerns, 4),
      source: 'ai',
    };
  } catch (err) {
    // A summary is a convenience. Losing it must never cost the reviewer the
    // extracted text, which is the part that replaced the download.
    logger.warn({ err }, 'CV summary generation failed; falling back to a keyword scan');
    return null;
  }
}

// ---------------------------------------------------------------
// The one call the route makes
// ---------------------------------------------------------------

export interface BuildInsightInput {
  storageKey: string;
  mimeType: string;
  originalName: string;
  job: { title: string; summary: string; descriptionHtml: string };
}

/**
 * Read a CV and summarise it against its advert.
 *
 * The caller caches the result on the application row; this function always
 * does the work.
 */
export async function buildCvInsight(input: BuildInsightInput): Promise<CvInsight> {
  const extracted = await extractCvText(input.storageKey, input.mimeType, input.originalName);
  const terms = requirementTerms(input.job.descriptionHtml, input.job.title);

  if (!extracted.text) {
    return {
      state: 'unreadable',
      problem: extracted.problem,
      chars: 0,
      pages: extracted.pages,
      text: null,
      summary: null,
      requirements: [],
      generatedAt: new Date().toISOString(),
    };
  }

  const requirements = matchRequirements(extracted.text, terms);
  const summary = aiSummariesAllowed()
    ? ((await aiSummary(extracted.text, input.job)) ?? keywordSummary(extracted.text, requirements))
    : keywordSummary(extracted.text, requirements);

  return {
    state: 'ready',
    problem: null,
    chars: extracted.text.length,
    pages: extracted.pages,
    text: extracted.text,
    summary,
    requirements,
    generatedAt: new Date().toISOString(),
  };
}
