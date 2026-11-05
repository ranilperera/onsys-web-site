import { describe, expect, it } from 'vitest';
import {
  APPLICATION_STATUSES,
  CV_MAX_BYTES,
  applicationInputSchema,
  applicationNotesSchema,
  applicationStatusSchema,
  describeCvProblem,
  fileExtension,
  isApplicationOpen,
  sniffCvFormat,
} from '@onsys/shared';
import { buildCvKey } from '../services/cvStorage.service';

/**
 * The rules that stand between a public file upload and our disk.
 *
 * This is the first endpoint on the site that accepts a file from anybody, so
 * the tests concentrate on the three things that decide what gets written: the
 * file's own bytes, the storage key built from its name, and the shape of the
 * form around it.
 */

/** A buffer whose first bytes are a real format signature. */
const head = (...bytes: number[]) => new Uint8Array([...bytes, 0, 0, 0, 0]);
const PDF = head(0x25, 0x50, 0x44, 0x46); // %PDF
const ZIP = head(0x50, 0x4b, 0x03, 0x04); // PK.. — a .docx
const OLE2 = head(0xd0, 0xcf, 0x11, 0xe0); // the old binary .doc
const ELF = head(0x7f, 0x45, 0x4c, 0x46); // a Linux executable
const MZ = head(0x4d, 0x5a, 0x90, 0x00); // a Windows .exe

const validForm = {
  jobId: 'job_123',
  fullName: 'Jane Smith',
  email: 'Jane.Smith@Example.com',
  phone: '+61 400 000 000',
  location: 'Melbourne, Australia',
  consent: true as const,
};

describe('sniffCvFormat', () => {
  it('identifies the three formats a CV arrives in', () => {
    expect(sniffCvFormat(PDF)).toBe('pdf');
    expect(sniffCvFormat(ZIP)).toBe('docx');
    expect(sniffCvFormat(OLE2)).toBe('doc');
  });

  it('refuses executables, whatever they are named', () => {
    expect(sniffCvFormat(ELF)).toBeNull();
    expect(sniffCvFormat(MZ)).toBeNull();
  });

  it('refuses an empty or truncated file rather than reading past the end', () => {
    expect(sniffCvFormat(new Uint8Array([]))).toBeNull();
    expect(sniffCvFormat(new Uint8Array([0x25, 0x50]))).toBeNull();
  });
});

describe('describeCvProblem', () => {
  it('accepts an ordinary PDF', () => {
    expect(
      describeCvProblem({
        filename: 'Jane Smith CV.pdf',
        mimeType: 'application/pdf',
        size: 240_000,
        head: PDF,
      }),
    ).toBeNull();
  });

  it('accepts a .docx that the browser reported as a generic binary', () => {
    // A Windows machine without Office installed sends octet-stream for a
    // .docx. Rejecting that would turn away real candidates.
    expect(
      describeCvProblem({
        filename: 'cv.docx',
        mimeType: 'application/octet-stream',
        size: 90_000,
        head: ZIP,
      }),
    ).toBeNull();
  });

  it('accepts a file whose type the browser did not report at all', () => {
    expect(
      describeCvProblem({ filename: 'cv.doc', mimeType: '', size: 50_000, head: OLE2 }),
    ).toBeNull();
  });

  it('rejects a format we cannot open, and names the way out', () => {
    const problem = describeCvProblem({ filename: 'cv.pages', size: 10_000 });
    expect(problem).toMatch(/PDF/);
    expect(problem).toMatch(/Pages/);
  });

  it('rejects an executable renamed to .pdf', () => {
    // The whole reason the bytes are read: extension and content type are both
    // supplied by whoever is uploading.
    expect(
      describeCvProblem({
        filename: 'cv.pdf',
        mimeType: 'application/pdf',
        size: 400_000,
        head: MZ,
      }),
    ).toMatch(/not/i);
  });

  it('rejects a zip renamed to .pdf, which the signature alone would allow', () => {
    expect(
      describeCvProblem({ filename: 'cv.pdf', mimeType: 'application/pdf', size: 1000, head: ZIP }),
    ).toBeTruthy();
  });

  it('allows a PDF named .doc, because the family check is deliberately loose', () => {
    // Word opens it, people do rename files, and nothing is executed either
    // way — so this is tolerated rather than treated as an attack.
    expect(
      describeCvProblem({ filename: 'cv.doc', mimeType: 'application/msword', size: 1000, head: ZIP }),
    ).toBeNull();
  });

  it('rejects an empty file, which is usually a failed export', () => {
    expect(describeCvProblem({ filename: 'cv.pdf', size: 0 })).toMatch(/empty/i);
  });

  it('states the actual size when a file is too big', () => {
    const problem = describeCvProblem({ filename: 'cv.pdf', size: CV_MAX_BYTES + 1 });
    expect(problem).toMatch(/10 MB/);
    expect(problem).toMatch(/10\.0 MB/);
  });

  it('accepts a file exactly on the limit', () => {
    expect(
      describeCvProblem({ filename: 'cv.pdf', mimeType: 'application/pdf', size: CV_MAX_BYTES, head: PDF }),
    ).toBeNull();
  });

  it('asks for a file when none was attached', () => {
    expect(describeCvProblem({ filename: '', size: 0 })).toMatch(/Attach/);
  });
});

describe('buildCvKey', () => {
  it('never puts the candidate filename in the path', () => {
    const key = buildCvKey('Jane Smith CV.pdf');
    expect(key).not.toMatch(/Jane/);
    expect(key).not.toMatch(/ /);
    expect(key).toMatch(/^\d{4}-\d{2}\/[0-9a-f-]{36}\.pdf$/);
  });

  it('strips a traversal attempt rather than carrying it into a path', () => {
    // The extension is all that survives, so "../../etc/passwd" cannot become
    // part of a directory walk.
    const key = buildCvKey('../../../etc/passwd.pdf');
    expect(key).not.toMatch(/\.\./);
    expect(key).toMatch(/\.pdf$/);
  });

  it('keeps the extension it was given, lowercased', () => {
    expect(buildCvKey('CV.PDF')).toMatch(/\.pdf$/);
    expect(buildCvKey('cv.DOCX')).toMatch(/\.docx$/);
  });

  it('files by month, so a retention sweep can work a month at a time', () => {
    expect(buildCvKey('cv.pdf', new Date('2026-03-09T00:00:00Z')).startsWith('2026-03/')).toBe(true);
    // Zero-padded, or the folders sort wrongly and "2026-1" reads as January
    // beside "2026-10".
    expect(buildCvKey('cv.pdf', new Date('2026-01-09T00:00:00Z')).startsWith('2026-01/')).toBe(true);
  });

  it('gives two uploads of the same filename different keys', () => {
    expect(buildCvKey('cv.pdf')).not.toBe(buildCvKey('cv.pdf'));
  });
});

describe('fileExtension', () => {
  it('lowercases, and returns nothing for a file without one', () => {
    expect(fileExtension('CV.PdF')).toBe('.pdf');
    expect(fileExtension('cv')).toBe('');
    expect(fileExtension('.hidden')).toBe('.hidden');
    expect(fileExtension('my.cv.v2.docx')).toBe('.docx');
  });
});

describe('applicationInputSchema', () => {
  it('accepts a minimal application and normalises the email', () => {
    const parsed = applicationInputSchema.parse(validForm);
    expect(parsed.email).toBe('jane.smith@example.com');
    // Optional fields come back as empty strings, so the route can use
    // `|| null` without checking for undefined first.
    expect(parsed.coverNote).toBe('');
    expect(parsed.noticePeriod).toBe('');
  });

  it('refuses an unticked consent box', () => {
    // Consent is the lawful basis for holding the CV at all, so an absent or
    // false value must fail rather than be stored as agreement.
    expect(applicationInputSchema.safeParse({ ...validForm, consent: false }).success).toBe(false);
    const { consent: _consent, ...withoutConsent } = validForm;
    expect(applicationInputSchema.safeParse(withoutConsent).success).toBe(false);
  });

  it('requires a reachable email and a usable phone number', () => {
    expect(applicationInputSchema.safeParse({ ...validForm, email: 'jane@' }).success).toBe(false);
    expect(applicationInputSchema.safeParse({ ...validForm, phone: '123' }).success).toBe(false);
  });

  it('requires a name and a location, and rejects whitespace as either', () => {
    expect(applicationInputSchema.safeParse({ ...validForm, fullName: '   ' }).success).toBe(false);
    expect(applicationInputSchema.safeParse({ ...validForm, location: '' }).success).toBe(false);
  });

  it('accepts a blank LinkedIn field but not a half-typed one', () => {
    expect(applicationInputSchema.safeParse({ ...validForm, linkedinUrl: '' }).success).toBe(true);
    expect(
      applicationInputSchema.safeParse({ ...validForm, linkedinUrl: 'linkedin.com/in/jane' }).success,
    ).toBe(false);
    expect(
      applicationInputSchema.safeParse({
        ...validForm,
        linkedinUrl: 'https://www.linkedin.com/in/jane',
      }).success,
    ).toBe(true);
  });

  it('bounds the free-text fields', () => {
    expect(
      applicationInputSchema.safeParse({ ...validForm, coverNote: 'x'.repeat(4001) }).success,
    ).toBe(false);
  });

  it('explains what is wrong in words a candidate can act on', () => {
    const result = applicationInputSchema.safeParse({ ...validForm, consent: false });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message).join(' ')).toMatch(/Tick the box/);
    }
  });
});

describe('the pipeline', () => {
  it('treats everything up to an outcome as still open', () => {
    expect(isApplicationOpen('NEW')).toBe(true);
    expect(isApplicationOpen('SHORTLISTED')).toBe(true);
    expect(isApplicationOpen('OFFERED')).toBe(true);
    // Hired is an outcome, not a thing waiting on us.
    expect(isApplicationOpen('HIRED')).toBe(false);
    expect(isApplicationOpen('REJECTED')).toBe(false);
    expect(isApplicationOpen('WITHDRAWN')).toBe(false);
  });

  it('accepts only known statuses', () => {
    for (const status of APPLICATION_STATUSES) {
      expect(applicationStatusSchema.safeParse({ status }).success).toBe(true);
    }
    expect(applicationStatusSchema.safeParse({ status: 'MAYBE' }).success).toBe(false);
  });

  it('allows an internal note to be cleared, and bounds its length', () => {
    expect(applicationNotesSchema.safeParse({ notes: '' }).success).toBe(true);
    expect(applicationNotesSchema.safeParse({ notes: 'Called, keen.' }).success).toBe(true);
    expect(applicationNotesSchema.safeParse({ notes: 'x'.repeat(8001) }).success).toBe(false);
  });
});
