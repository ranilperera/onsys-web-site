import { Router } from 'express';
import multer from 'multer';
import {
  CV_MAX_BYTES,
  applicationInputSchema,
  describeCvProblem,
  isJobOpen,
} from '@onsys/shared';
import { prisma } from '../lib/prisma';
import { env } from '../lib/env';
import { logger } from '../lib/logger';
import { asyncHandler } from '../middleware/error';
import { applicationLimiter, verifyCaptcha, honeypot } from '../middleware/security';
import { storeCv, deleteCv } from '../services/cvStorage.service';
import {
  sendEmail,
  renderApplicationNotification,
  renderApplicationAcknowledgement,
} from '../services/email.service';

export const applicationRouter = Router();

/**
 * Applying for a job.
 *
 * The one public write on this router, and the only place on the site that
 * accepts a file. It replaces "email jobs@onsys.com.au a CV", which lost
 * applications in the ordinary course of business: an inbox cannot record that
 * a CV was read, cannot stop two people replying, and cannot distinguish a
 * message that was handled from one that arrived while someone was on leave.
 *
 * Shape of the request: multipart/form-data, with the text fields as ordinary
 * form fields and the CV as `cv`. Not JSON with a base64 blob — that inflates
 * a 10 MB file to 13 MB in memory and gives up streaming for nothing.
 */

/**
 * In memory, not straight to disk.
 *
 * Multer's disk storage would write the file before anything has checked what
 * it is, which means every rejected upload leaves a file behind to be cleaned
 * up, and a script can fill the volume with files that were never going to be
 * accepted. Buffering in memory bounded by `limits` lets the request be
 * validated in full before a single byte is written, at a worst case of 10 MB
 * per in-flight upload — and the rate limiter bounds how many of those there
 * can be.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: CV_MAX_BYTES,
    files: 1,
    // The text fields are small; a request carrying hundreds of them is not a
    // candidate. Capped so parsing cannot be used as the attack itself.
    fields: 30,
    fieldSize: 16 * 1024,
  },
});

/**
 * Multer rejects an oversized file by throwing, which would otherwise surface
 * as a 500 and tell the candidate nothing. Translated here into the same
 * message the browser would have shown had it checked first.
 */
const receiveCv = (...args: Parameters<ReturnType<typeof upload.single>>): void => {
  const [req, res, next] = args;
  upload.single('cv')(req, res, (err: unknown) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'That file is larger than 10 MB. A PDF export is usually much smaller than a scan.'
          : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
            ? 'Attach one CV file.'
            : 'That upload could not be read. Try again, or email us if it keeps failing.';
      res.status(400).json({ error: message });
      return;
    }

    next(err);
  });
};

/** Form fields arrive as strings, so the checkbox needs turning back into one. */
function readConsent(value: unknown): unknown {
  if (value === 'true' || value === 'on' || value === '1' || value === true) return true;
  return value;
}

applicationRouter.post(
  '/',
  applicationLimiter,
  // Order matters: the rate limiter runs before the body is parsed, so a
  // blocked IP never gets to upload 10 MB. The captcha and honeypot need the
  // parsed fields, so they come after receiveCv.
  receiveCv,
  honeypot,
  verifyCaptcha,
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Attach your CV as a PDF or Word document.' });
      return;
    }

    const input = applicationInputSchema.parse({
      ...req.body,
      consent: readConsent(req.body?.consent),
    });

    // The same rules the browser applied, plus the one it cannot: what the
    // file's own leading bytes say it is. An extension and a content type are
    // both supplied by the client; the signature is the only evidence.
    const problem = describeCvProblem({
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      head: file.buffer.subarray(0, 8),
    });
    if (problem) {
      res.status(400).json({ error: problem });
      return;
    }

    /**
     * The role has to be open.
     *
     * Checked against the database rather than trusting the posted jobId: the
     * form could have been sitting open in a tab since before the advert
     * closed, and a draft job's id is guessable. A closed or unpublished role
     * returns the same message either way — there is no reason to confirm that
     * a hidden advert exists.
     */
    const job = await prisma.job.findUnique({
      where: { id: input.jobId },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        closesAt: true,
        applyEmail: true,
      },
    });
    if (!job || job.status !== 'PUBLISHED' || !isJobOpen(job.closesAt)) {
      res.status(410).json({
        error: 'This role is no longer accepting applications. See /careers for what is open now.',
      });
      return;
    }

    // Write the file first, then the row. The other order can leave a row
    // pointing at a CV that was never written, which looks to the console
    // exactly like a candidate whose CV we lost.
    const stored = await storeCv(file.originalname, file.buffer);

    let application;
    try {
      application = await prisma.jobApplication.create({
        data: {
          jobId: job.id,
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          location: input.location,
          noticePeriod: input.noticePeriod || null,
          expectedSalary: input.expectedSalary || null,
          linkedinUrl: input.linkedinUrl || null,
          coverNote: input.coverNote || null,
          cvStorageKey: stored.key,
          cvOriginalName: file.originalname.slice(0, 255),
          cvBytes: stored.bytes,
          cvMimeType: file.mimetype || 'application/octet-stream',
          consentAt: new Date(),
          referrer: input.referrer || null,
          landingPath: input.landingPath || null,
          ip: req.ip ?? null,
        },
        select: { id: true },
      });
    } catch (err) {
      // No row means nobody will ever look at that file, and it is a CV.
      await deleteCv(stored.key);
      throw err;
    }

    logger.info(
      {
        applicationId: application.id,
        jobSlug: job.slug,
        cvBytes: stored.bytes,
        cvSha256: stored.sha256,
      },
      'Job application received',
    );

    // Answer before the email work. A candidate pressing Apply should not be
    // waiting on Graph, and must never see a failure for an application that
    // is already safely stored.
    res.status(201).json({
      ok: true,
      message:
        "Thanks — your application is in. We've emailed you a confirmation, and we read every application that arrives.",
    });

    void (async () => {
      const notification = await sendEmail({
        // Per-advert address when one is set — how a role advertised on behalf
        // of a client routes to their hiring manager — the careers inbox
        // otherwise. Either way the application is in the console, so a wrong
        // or dead address here delays a reply rather than losing a candidate.
        to: job.applyEmail || env.APPLICATION_NOTIFY_TO,
        subject: `New application — ${job.title} — ${input.fullName}`,
        html: renderApplicationNotification({
          jobTitle: job.title,
          jobSlug: job.slug,
          applicationId: application.id,
          fullName: input.fullName,
          email: input.email,
          phone: input.phone,
          location: input.location,
          noticePeriod: input.noticePeriod,
          expectedSalary: input.expectedSalary,
          linkedinUrl: input.linkedinUrl,
          coverNote: input.coverNote,
          cvOriginalName: file.originalname,
          cvBytes: stored.bytes,
        }),
        // So a reply from the careers inbox reaches the candidate directly.
        replyTo: input.email,
      });

      const ack = await sendEmail({
        to: input.email,
        subject: `Application received — ${job.title}`,
        html: renderApplicationAcknowledgement({
          fullName: input.fullName,
          jobTitle: job.title,
        }),
      });

      if (ack.sent) {
        await prisma.jobApplication
          .update({ where: { id: application.id }, data: { acknowledgedAt: new Date() } })
          .catch((err) =>
            logger.error({ err, applicationId: application.id }, 'Failed to stamp acknowledgedAt'),
          );
      }

      if (!notification.sent) {
        // Not fatal — the application is in the console either way, which is
        // the whole point of it being there — but it is the thing that stops
        // anyone noticing, so it is logged at error level.
        logger.error(
          { applicationId: application.id, reason: notification.reason },
          'Application notification email failed',
        );
      }
    })().catch((err) =>
      logger.error(
        { err, applicationId: application.id },
        'Application notification pipeline failed',
      ),
    );
  }),
);
