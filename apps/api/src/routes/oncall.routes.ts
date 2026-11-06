import { Router } from 'express';
import {
  formatPostalAddress,
  onCallEnrolmentSchema,
  onCallMonthlyCents,
  resolveCountryName,
} from '@onsys/shared';
import { prisma } from '../lib/prisma';
import { env } from '../lib/env';
import { logger } from '../lib/logger';
import { asyncHandler } from '../middleware/error';
import { leadLimiter, verifyCaptcha, honeypotField } from '../middleware/security';
import {
  sendEmail,
  renderOnCallEnrolmentNotification,
  renderOnCallEnrolmentAcknowledgement,
} from '../services/email.service';

export const onCallRouter = Router();

/**
 * Enrolling in on-call cover.
 *
 * The page sells a monthly subscription and this is where somebody says yes to
 * it, so the record it writes is the record of the commitment: who, where to
 * invoice, how many instances, and the price they were shown at the moment
 * they agreed. Quoted prices are stored with the row rather than read back
 * later, because today's rate is not necessarily the one they accepted.
 *
 * It does not create a login. That happens in Onsys Support, which owns
 * credentials and the emailed code; the confirmation offers that link with the
 * instance count already in it.
 */
onCallRouter.post(
  '/enrolments',
  // Same limiter as the contact form: this is a form a real person fills in
  // once, and the cost of a script filling it repeatedly is a false order.
  leadLimiter,
  // Not the default `website` trap: this form asks a company for its real
  // website, and the two cannot share a name without discarding customers.
  honeypotField('website_url'),
  verifyCaptcha,
  asyncHandler(async (req, res) => {
    const input = onCallEnrolmentSchema.parse(req.body);

    const unitPriceCents = env.ONCALL_PRICE_CENTS;
    const hourlyRateCents = env.ONCALL_HOURLY_CENTS;
    const monthlyTotalCents = onCallMonthlyCents(input.instances, unitPriceCents);
    const country = resolveCountryName(input.country, input.countryOther);

    // Stored before either email is attempted. If Graph is down we still have
    // the enrolment, which is the half that cannot be reconstructed.
    const enrolment = await prisma.onCallEnrolment.create({
      data: {
        companyName: input.companyName,
        website: input.website || null,
        country,
        street: input.street,
        street2: input.street2 || null,
        locality: input.locality,
        region: input.region || null,
        postcode: input.postcode || null,
        contactName: input.contactName,
        workEmail: input.workEmail,
        phone: input.phone,
        instanceCount: input.instances,
        unitPriceCents,
        monthlyTotalCents,
        hourlyRateCents,
        notes: input.notes || null,
        referrer: input.referrer || null,
        landingPath: input.landingPath || null,
        ip: req.ip ?? null,
      },
    });

    logger.info(
      {
        enrolmentId: enrolment.id,
        company: enrolment.companyName,
        instances: enrolment.instanceCount,
        monthlyTotalCents,
      },
      'On-call enrolment received',
    );

    // Answered before the email work: nobody filling in a form should wait on
    // Graph, and a failure there must never read as "your enrolment failed".
    res.status(201).json({
      ok: true,
      enrolmentId: enrolment.id,
      instances: enrolment.instanceCount,
      monthlyTotalCents,
      message:
        "Thanks — we have your enrolment. We'll confirm the estate and arrange secure access, and cover goes live within one business day.",
    });

    void (async () => {
      const address = formatPostalAddress({
        street: enrolment.street,
        street2: enrolment.street2,
        locality: enrolment.locality,
        region: enrolment.region,
        postcode: enrolment.postcode,
        country: enrolment.country,
      });

      const notification = await sendEmail({
        to: env.ONCALL_NOTIFY_TO,
        subject: `On-call enrolment — ${enrolment.companyName} — ${enrolment.instanceCount} instances`,
        html: renderOnCallEnrolmentNotification({ ...enrolment, address }),
        // So a reply from the Onsys inbox reaches the customer directly.
        replyTo: enrolment.workEmail,
      });

      const acknowledgement = await sendEmail({
        to: enrolment.workEmail,
        subject: `On-call cover for ${enrolment.companyName} — we have your enrolment`,
        html: renderOnCallEnrolmentAcknowledgement({ ...enrolment, address }),
      });

      await prisma.onCallEnrolment
        .update({
          where: { id: enrolment.id },
          data: {
            onsysEmailedAt: notification.sent ? new Date() : null,
            customerEmailedAt: acknowledgement.sent ? new Date() : null,
          },
        })
        .catch((err) =>
          logger.error({ err, enrolmentId: enrolment.id }, 'Failed to stamp enrolment email times'),
        );

      if (!notification.sent) {
        // The enrolment is safe in the database either way, but this email is
        // what makes anyone look at it, so a failure is an error not a notice.
        logger.error(
          { enrolmentId: enrolment.id, reason: notification.reason },
          'On-call enrolment notification failed to send',
        );
      }
    })().catch((err) =>
      logger.error({ err, enrolmentId: enrolment.id }, 'On-call enrolment email pipeline failed'),
    );
  }),
);
