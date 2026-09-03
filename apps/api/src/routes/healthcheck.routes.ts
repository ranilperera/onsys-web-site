import { Router } from 'express';
import { healthCheckRequestSchema } from '@onsys/shared';
import { prisma } from '../lib/prisma';
import { env, org } from '../lib/env';
import { logger } from '../lib/logger';
import { asyncHandler } from '../middleware/error';
import { leadLimiter } from '../middleware/security';
import { sendEmail, renderHealthCheckAck, renderHealthCheckAlert } from '../services/email.service';
import { notifyHealthCheckToTeams } from '../services/teams.service';

export const healthCheckRouter = Router();

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

healthCheckRouter.post(
  '/request',
  leadLimiter,
  asyncHandler(async (req, res) => {
    const input = healthCheckRequestSchema.parse(req.body);

    const lead = await prisma.lead.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        company: input.company,
        service: 'Free 20-point SQL Server health check',
        // The version and instance count are what a consultant needs before the
        // session, so they belong in the message rather than lost in a note.
        message: [
          `SQL Server version: ${input.sqlVersion}`,
          input.instanceCount ? `Instances: ${input.instanceCount}` : null,
          input.notes ? `\n${input.notes}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
        channel: 'CONTACT_FORM',
      },
    });

    const earliest = earliestSessionDate();

    await Promise.allSettled([
      sendEmail({
        to: input.email,
        subject: 'Your free 20-point SQL Server health check',
        html: renderHealthCheckAck({ ...input, earliest, leadDays: env.HEALTHCHECK_LEAD_DAYS }),
      }),
      sendEmail({
        to: env.LEAD_NOTIFY_TO,
        subject: `Health check request — ${input.company} (${input.sqlVersion})`,
        html: renderHealthCheckAlert(input),
      }),
      notifyHealthCheckToTeams(input),
    ]);

    logger.info({ leadId: lead.id, company: input.company, sqlVersion: input.sqlVersion },
      'Health check requested');

    res.status(201).json({
      ok: true,
      earliest,
      leadDays: env.HEALTHCHECK_LEAD_DAYS,
      bookingUrl: org.bookingUrl,
      scriptsUrl: '/onsys-sql-server-health-check.html',
    });
  }),
);
