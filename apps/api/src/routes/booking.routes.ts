import { Router } from 'express';
import { availabilityQuerySchema, bookingInputSchema } from '@onsys/shared';
import { booking as cfg, env } from '../lib/env';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/error';
import { honeypot, leadLimiter, verifyCaptcha } from '../middleware/security';
import {
  BookingDisabledError,
  SlotUnavailableError,
  cancelBooking,
  createBooking,
  describeSlot,
  getAvailability,
} from '../services/booking.service';
import {
  renderBookingConfirmation,
  renderBookingIcs,
  renderBookingNotification,
  sendEmail,
  type BookingEmailData,
} from '../services/email.service';

export const bookingRouter = Router();

/** Open slots for the picker. Cheap, public, and safe to poll. */
bookingRouter.get(
  '/availability',
  asyncHandler(async (req, res) => {
    const { from, days } = availabilityQuerySchema.parse(req.query);
    res.json(await getAvailability(from, days));
  }),
);

bookingRouter.post(
  '/',
  leadLimiter,
  honeypot,
  verifyCaptcha,
  asyncHandler(async (req, res) => {
    const input = bookingInputSchema.parse(req.body);

    let record;
    try {
      record = await createBooking(input, {
        utmSource: input.utmSource,
        utmMedium: input.utmMedium,
        utmCampaign: input.utmCampaign,
        referrer: input.referrer,
      });
    } catch (error) {
      if (error instanceof SlotUnavailableError) {
        return res.status(409).json({ ok: false, error: error.message });
      }
      if (error instanceof BookingDisabledError) {
        return res.status(503).json({
          ok: false,
          error: 'Online booking is unavailable right now. Please use the contact form and we will call you.',
        });
      }
      // The request is persisted as FAILED, so tell the visitor the truth: we
      // have it, but the calendar slot is not held.
      logger.error({ err: error }, 'Booking failed after persistence');
      return res.status(502).json({
        ok: false,
        error:
          'We could not confirm that time with our calendar. Your request has been recorded and we will email you to confirm.',
      });
    }

    const cancelUrl = `${env.SITE_URL}/book/cancel?token=${record.cancelToken}`;
    const when = describeSlot(record.startsAt);

    // Respond before the emails — the visitor already has what they need.
    res.status(201).json({
      ok: true,
      booking: {
        reference: record.reference,
        startsAt: record.startsAt.toISOString(),
        endsAt: record.endsAt.toISOString(),
        timezone: record.timezone,
        when,
        joinUrl: record.joinUrl,
        consultantName: cfg.consultantName,
        cancelUrl,
      },
    });

    const emailData: BookingEmailData = {
      reference: record.reference,
      name: record.name,
      email: record.email,
      company: record.company,
      phone: record.phone,
      topic: record.topic,
      message: record.message,
      when,
      timezone: record.timezone,
      durationMinutes: cfg.slotMinutes,
      joinUrl: record.joinUrl,
      consultantName: cfg.consultantName,
      cancelUrl,
    };

    void (async () => {
      try {
        const ics = renderBookingIcs(emailData, record.startsAt, record.endsAt);
        const confirmation = await sendEmail({
          to: record.email,
          subject: `Confirmed: your consultation on ${when}`,
          html: renderBookingConfirmation(emailData),
          replyTo: env.LEAD_NOTIFY_TO,
          attachments: [
            { name: `onsys-consultation-${record.reference}.ics`, contentType: 'text/calendar; method=PUBLISH', content: ics },
          ],
        });

        await sendEmail({
          to: env.LEAD_NOTIFY_TO,
          subject: `New booking — ${record.name} on ${when}`,
          html: renderBookingNotification(emailData),
          replyTo: record.email,
        });

        if (confirmation.sent) {
          await prisma.booking.update({
            where: { id: record.id },
            data: { confirmationSentAt: new Date() },
          });
        }
      } catch (error) {
        logger.error({ err: error, reference: record.reference }, 'Booking emails failed');
      }
    })();
  }),
);

/**
 * Self-service cancellation. The token is the only credential, so it is treated
 * as one: unguessable, single-purpose, and never echoed back in the response.
 */
bookingRouter.post(
  '/cancel',
  leadLimiter,
  asyncHandler(async (req, res) => {
    const token = String(req.body?.token ?? '');
    if (token.length < 20) return res.status(400).json({ ok: false, error: 'Invalid cancellation link.' });

    const record = await cancelBooking(token);
    if (!record) return res.status(404).json({ ok: false, error: 'We could not find that booking.' });

    res.json({ ok: true, reference: record.reference, when: describeSlot(record.startsAt) });

    void sendEmail({
      to: env.LEAD_NOTIFY_TO,
      subject: `Booking cancelled — ${record.name} (${record.reference})`,
      html: `<p>${record.name} cancelled their consultation on ${describeSlot(record.startsAt)}.</p>`,
    }).catch((error) => logger.error({ err: error }, 'Cancellation notice failed'));
  }),
);
