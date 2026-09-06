import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { healthCheckRequestSchema, claimMatchFor } from '@onsys/shared';
import { prisma } from '../lib/prisma';
import { env, org } from '../lib/env';
import { logger } from '../lib/logger';
import { asyncHandler } from '../middleware/error';
import { leadLimiter } from '../middleware/security';
import { sendEmail, renderHealthCheckAck, renderHealthCheckAlert } from '../services/email.service';
import { notifyHealthCheckToTeams } from '../services/teams.service';

export const healthCheckRouter = Router();

/** Marks a lead as a free health check claim; also what the console filters on. */
const HEALTH_CHECK_SERVICE = 'Free 20-point SQL Server health check';



/**
 * Earliest date we will offer, as a date key in the booking timezone.
 *
 * The lead time is deliberate rather than a scheduling constraint: the whole
 * proposition is that the prospect reads the scripts before running them and
 * clears whatever change approval their organisation requires. Offering a slot
 * tomorrow would undercut that and produce sessions where nobody has read
 * anything.
 */
function earliestSessionDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + env.HEALTHCHECK_LEAD_DAYS);
  return d.toISOString().slice(0, 10);
}

/**
 * How long a download link stays good.
 *
 * Long enough to survive a change-approval process and a holiday, short enough
 * that a link pasted into a public ticket does not stay useful forever.
 */
const COLLECTOR_TOKEN_DAYS = 30;

/** Route in the web app that checks the token and then serves the file. */
const COLLECTOR_PATH = '/download/collector';

/**
 * Mint a download grant for the collector.
 *
 * 32 bytes from the CSPRNG, base64url. Not derived from the lead id or the
 * email: this is the only thing between a stranger and the file, so it must not
 * be guessable from anything the requester already knows.
 */
async function issueCollectorToken(input: {
  email: string;
  company: string;
  leadId: string;
}): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + COLLECTOR_TOKEN_DAYS * 24 * 60 * 60 * 1000);

  await prisma.healthCheckToken.create({
    data: {
      token,
      email: input.email.trim().toLowerCase(),
      company: input.company,
      leadId: input.leadId,
      expiresAt,
    },
  });
  return token;
}

/** Note added to a repeat lead so the console explains itself. */
function repeatNote(prior: { email: string; company: string | null; createdAt: Date }): string {
  const who = prior.company ? `${prior.email} (${prior.company})` : prior.email;
  return (
    `\n[REPEAT] The free check was already claimed by ${who} on ` +
    `${prior.createdAt.toISOString().slice(0, 10)}. Quote a paid review rather ` +
    'than running a second free one.'
  );
}

/**
 * Check a collector download token.
 *
 * Deliberately unauthenticated and cheap: the token *is* the credential, and
 * the web app's download route calls this on every request for the file. It
 * answers 403 for anything invalid rather than distinguishing "unknown" from
 * "expired", so the endpoint cannot be used to probe which tokens exist.
 */
healthCheckRouter.get(
  '/collector/verify',
  asyncHandler(async (req, res) => {
    const token = typeof req.query.token === 'string' ? req.query.token : '';

    // Bounded before it reaches the database, so a huge query string cannot be
    // turned into work.
    if (!token || token.length > 128) {
      res.status(403).json({ ok: false, error: 'This download link is not valid.' });
      return;
    }

    const grant = await prisma.healthCheckToken.findUnique({ where: { token } });
    if (!grant || grant.expiresAt.getTime() < Date.now()) {
      logger.info({ found: Boolean(grant) }, 'Collector download refused');
      res.status(403).json({
        ok: false,
        error: grant
          ? 'This download link has expired. Request the health check again for a new one.'
          : 'This download link is not valid.',
      });
      return;
    }

    await prisma.healthCheckToken.update({
      where: { id: grant.id },
      data: { downloads: { increment: 1 }, lastUsedAt: new Date() },
    });

    logger.info(
      { company: grant.company, downloads: grant.downloads + 1 },
      'Collector downloaded',
    );
    res.json({ ok: true, company: grant.company });
  }),
);

healthCheckRouter.post(
  '/request',
  leadLimiter,
  asyncHandler(async (req, res) => {
    const input = healthCheckRequestSchema.parse(req.body);

    /**
     * The offer is one free check, on one instance, per customer.
     *
     * Matched on the address and on the company's email domain, because a
     * second request usually comes from a colleague rather than the same
     * person.
     *
     * Deliberately a soft gate: it answers 200 with `alreadyClaimed` rather
     * than an error, and still records the lead. The person asking has done
     * nothing wrong and a repeat request is still a sales conversation worth
     * having — what this prevents is the free analysis being delivered twice
     * without anyone noticing.
     */
    const claim = claimMatchFor(input.email);
    const priorClaim = await prisma.lead.findFirst({
      where: {
        service: HEALTH_CHECK_SERVICE,
        OR: [
          { email: { equals: claim.email, mode: 'insensitive' } },
          ...(claim.domain
            ? [{ email: { endsWith: `@${claim.domain}`, mode: 'insensitive' as const } }]
            : []),
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, company: true, createdAt: true },
    });

    const lead = await prisma.lead.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        company: input.company,
        service: HEALTH_CHECK_SERVICE,
        // The version and instance count are what a consultant needs before the
        // session, so they belong in the message rather than lost in a note.
        message: [
          `SQL Server version: ${input.sqlVersion}`,
          input.instanceCount ? `Instances: ${input.instanceCount}` : null,
          // Flagged on the lead itself so the console shows a repeat without
          // anyone having to search the list for the earlier claim.
          priorClaim ? repeatNote(priorClaim) : null,
          input.notes ? `\n${input.notes}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
        channel: 'CONTACT_FORM',
      },
    });

    const earliest = earliestSessionDate();
    const collectorToken = await issueCollectorToken({
      email: input.email,
      company: input.company,
      leadId: lead.id,
    });

    await Promise.allSettled([
      sendEmail({
        to: input.email,
        subject: 'Your free 20-point SQL Server health check',
        html: renderHealthCheckAck({
          ...input,
          earliest,
          leadDays: env.HEALTHCHECK_LEAD_DAYS,
          alreadyClaimed: Boolean(priorClaim),
          collectorUrl: `${COLLECTOR_PATH}?token=${collectorToken}`,
          collectorExpiryDays: COLLECTOR_TOKEN_DAYS,
        }),
      }),
      sendEmail({
        to: env.LEAD_NOTIFY_TO,
        subject: `Health check request${priorClaim ? ' [REPEAT]' : ''} — ${input.company} (${input.sqlVersion})`,
        html: renderHealthCheckAlert({ ...input, alreadyClaimed: Boolean(priorClaim) }),
      }),
      notifyHealthCheckToTeams(input),
    ]);

    logger.info(
      {
        leadId: lead.id,
        company: input.company,
        sqlVersion: input.sqlVersion,
        repeatOf: priorClaim?.id,
      },
      priorClaim ? 'Health check requested (already claimed)' : 'Health check requested',
    );

    res.status(201).json({
      ok: true,
      earliest,
      leadDays: env.HEALTHCHECK_LEAD_DAYS,
      bookingUrl: org.bookingUrl,
      scriptsUrl: '/onsys-sql-server-health-check.html',
      collectorUrl: `${COLLECTOR_PATH}?token=${collectorToken}`,
      collectorExpiryDays: COLLECTOR_TOKEN_DAYS,
      submitTo: env.HEALTHCHECK_RESULTS_TO,
      alreadyClaimed: Boolean(priorClaim),
    });
  }),
);
