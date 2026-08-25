import { Router } from 'express';
import { leadInputSchema } from '@onsys/shared';
import { prisma } from '../lib/prisma';
import { env } from '../lib/env';
import { logger } from '../lib/logger';
import { asyncHandler } from '../middleware/error';
import { leadLimiter, verifyCaptcha, honeypot } from '../middleware/security';
import { sendEmail, renderLeadNotification, renderLeadAcknowledgement } from '../services/email.service';
import { notifyLeadToTeams } from '../services/teams.service';

export const leadRouter = Router();

leadRouter.post(
  '/',
  leadLimiter,
  honeypot,
  verifyCaptcha,
  asyncHandler(async (req, res) => {
    const input = leadInputSchema.parse(req.body);

    // Persist first. If Graph or Teams is down we still have the lead.
    const lead = await prisma.lead.create({
      data: {
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        company: input.company?.trim() || null,
        phone: input.phone?.trim() || null,
        service: input.service?.trim() || null,
        message: input.message?.trim() || null,
        channel: 'CONTACT_FORM',
        utmSource: input.utmSource || null,
        utmMedium: input.utmMedium || null,
        utmCampaign: input.utmCampaign || null,
        referrer: input.referrer || null,
      },
    });

    // Respond immediately — the visitor should not wait on Graph.
    res.status(201).json({
      ok: true,
      message: "Thanks — we've received your enquiry and will be in touch within one business day.",
    });

    // Fire-and-forget notifications.
    void (async () => {
      const notification = await sendEmail({
        to: env.LEAD_NOTIFY_TO,
        subject: `New enquiry — ${lead.name}${lead.company ? ` (${lead.company})` : ''}`,
        html: renderLeadNotification(lead),
        replyTo: lead.email,
      });

      await sendEmail({
        to: lead.email,
        subject: 'Thanks for contacting Onsys Technologies',
        html: renderLeadAcknowledgement(lead),
      });

      await notifyLeadToTeams(lead);

      if (notification.sent) {
        await prisma.lead
          .update({ where: { id: lead.id }, data: { emailSentAt: new Date() } })
          .catch((err) => logger.error({ err }, 'Failed to stamp lead emailSentAt'));
      }
    })().catch((err) => logger.error({ err, leadId: lead.id }, 'Lead notification pipeline failed'));
  }),
);
