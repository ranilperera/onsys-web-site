import type Stripe from 'stripe';
import { Router } from 'express';
import { z } from 'zod';
import { emergencyRequestSchema } from '@onsys/shared';
import { prisma } from '../lib/prisma';
import { env, org, stripeConfigured } from '../lib/env';
import { logger } from '../lib/logger';
import { asyncHandler } from '../middleware/error';
import { leadLimiter } from '../middleware/security';
import { hashIp } from '../middleware/auth';
import { createEmergencyCheckout, parseWebhook, emergencyPrice } from '../services/stripe.service';
import { sendEmail, renderEmergencyReceipt, renderEmergencyAlert } from '../services/email.service';
import { notifyEmergencyToTeams } from '../services/teams.service';

export const emergencyRouter = Router();

/** What the page needs to render the block without hardcoding a price. */
emergencyRouter.get(
  '/price',
  asyncHandler(async (_req, res) => {
    const price = await emergencyPrice();
    res.json({ configured: stripeConfigured, price });
  }),
);

/**
 * Capture the details and alert the team. No payment step.
 *
 * Someone whose production database is down should reach a person, not a card
 * form — so this records the request, raises it in Teams, emails the team and
 * hands the page back a booking link. It is also a lead: a company reporting an
 * outage without an agreement is exactly who should be followed up afterwards.
 */
emergencyRouter.post(
  '/request',
  leadLimiter,
  asyncHandler(async (req, res) => {
    const input = emergencyRequestSchema.parse(req.body);

    const request = await prisma.emergencyRequest.create({
      data: {
        name: input.name,
        company: input.company || null,
        phone: input.phone,
        email: input.email,
        summary: input.summary || null,
        ipHash: hashIp(req.ip),
      },
    });

    // Also a lead, not just an incident. Someone reporting an outage is a
    // company without a support agreement, which is exactly who the sales
    // pipeline should know about.
    await prisma.lead
      .create({
        data: {
          name: request.name,
          email: request.email,
          phone: request.phone,
          company: request.company,
          service: 'Emergency database support',
          message: request.summary || 'Requested emergency support',
          channel: 'EMERGENCY',
        },
      })
      .catch((err) => logger.error({ err }, 'Failed to record the emergency lead'));

    await Promise.allSettled([
      notifyEmergencyToTeams({
        requestId: request.id,
        name: request.name,
        company: request.company,
        phone: request.phone,
        email: request.email,
        summary: request.summary,
        paid: false,
      }),
      sendEmail({
        to: env.LEAD_NOTIFY_TO,
        subject: `Emergency support request — ${request.company || request.name}`,
        html: renderEmergencyAlert({ ...request, amountCents: null }),
      }),
    ]);

    logger.info({ requestId: request.id }, 'Emergency support request captured');

    res.status(201).json({
      requestId: request.id,
      bookingUrl: org.bookingUrl,
      supportPhone: org.phone,
      supportPhoneE164: org.phoneE164,
    });
  }),
);

/**
 * Turn a captured request into a Stripe checkout.
 *
 * Not currently reached by the page — the emergency flow captures details and
 * books a call instead. It stays wired end to end for the prepaid hour bundles
 * still to be specified, so that work is a content switch plus a price id
 * rather than rebuilding the payment path from scratch.
 */
emergencyRouter.post(
  '/checkout',
  leadLimiter,
  asyncHandler(async (req, res) => {
    const { requestId } = z.object({ requestId: z.string().min(1) }).parse(req.body);

    if (!stripeConfigured) {
      logger.error('Emergency checkout attempted but Stripe is not configured');
      res.status(503).json({
        error: `Online payment is unavailable right now. Please call ${org.phone} and we will take it from there.`,
      });
      return;
    }

    const request = await prisma.emergencyRequest.findUnique({ where: { id: requestId } });
    if (!request) {
      res.status(404).json({ error: 'That request could not be found.' });
      return;
    }
    if (request.status === 'PAID') {
      res.status(409).json({ error: 'That block has already been paid for.' });
      return;
    }

    try {
      const { url, sessionId } = await createEmergencyCheckout({
        requestId: request.id,
        email: request.email,
        name: request.name,
        company: request.company,
        phone: request.phone,
      });

      await prisma.emergencyRequest.update({
        where: { id: request.id },
        data: { stripeSessionId: sessionId },
      });

      res.json({ checkoutUrl: url, requestId: request.id });
    } catch (error) {
      logger.error({ err: error, requestId: request.id }, 'Stripe checkout session failed');
      await prisma.emergencyRequest
        .update({ where: { id: request.id }, data: { status: 'FAILED' } })
        .catch(() => {});
      res.status(502).json({
        error: `We could not open the payment page. Please call ${org.phone} — we will not leave you waiting on this.`,
      });
    }
  }),
);

/**
 * Status for the page the customer lands back on.
 *
 * Reads our own record rather than asking Stripe, so a visitor cannot use this
 * to probe arbitrary Stripe sessions. Until the webhook lands the answer is
 * PENDING, and the page says "confirming" rather than claiming failure.
 */
emergencyRouter.get(
  '/status/:sessionId',
  asyncHandler(async (req, res) => {
    const request = await prisma.emergencyRequest.findUnique({
      where: { stripeSessionId: req.params.sessionId },
      select: { status: true, name: true, hours: true, paidAt: true },
    });

    if (!request) {
      res.status(404).json({ error: 'That payment could not be found.' });
      return;
    }

    res.json({
      status: request.status,
      name: request.name,
      hours: request.hours,
      paidAt: request.paidAt,
      supportPhone: org.phone,
      supportPhoneE164: org.phoneE164,
      bookingUrl: org.bookingUrl,
    });
  }),
);

/**
 * Stripe webhook. Mounted with a raw body in server.ts — Express must not parse
 * it first or the signature can never match.
 *
 * This, not the browser redirect, is what marks a block as paid. A customer who
 * closes the tab on Stripe's success page has still paid, and a redirect is a
 * hint about what happened rather than a statement of fact.
 */
emergencyRouter.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    const signature = req.get('stripe-signature');
    if (!signature || !stripeConfigured) {
      res.status(400).json({ error: 'Not configured' });
      return;
    }

    let event: Stripe.Event;
    try {
      event = parseWebhook(req.body as Buffer, signature);
    } catch (error) {
      logger.warn({ err: error }, 'Rejected a Stripe webhook with a bad signature');
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    // Acknowledge before doing the work. Stripe retries on a slow response, and
    // a duplicate delivery is handled below anyway.
    res.json({ received: true });

    if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.expired') {
      return;
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const requestId = session.metadata?.requestId ?? session.client_reference_id ?? undefined;
    if (!requestId) {
      logger.error({ sessionId: session.id }, 'Stripe session carried no requestId');
      return;
    }

    if (event.type === 'checkout.session.expired') {
      await prisma.emergencyRequest
        .updateMany({ where: { id: requestId, status: 'PENDING' }, data: { status: 'CANCELLED' } })
        .catch(() => {});
      return;
    }

    if (session.payment_status !== 'paid') return;

    // Claim atomically: Stripe delivers a webhook at least once, and the
    // receipt email must not go out twice for one payment.
    const claimed = await prisma.emergencyRequest.updateMany({
      where: { id: requestId, status: { not: 'PAID' } },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        amountCents: session.amount_total ?? undefined,
        currency: session.currency ?? undefined,
        stripePaymentIntentId:
          typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
      },
    });

    if (claimed.count === 0) return;

    const request = await prisma.emergencyRequest.findUnique({ where: { id: requestId } });
    if (!request) return;

    logger.info({ requestId, amount: session.amount_total }, 'Emergency support block paid');

    await Promise.allSettled([
      sendEmail({
        to: request.email,
        subject: `Your Onsys emergency support block — call ${org.phone} now`,
        html: renderEmergencyReceipt(request),
      }),
      sendEmail({
        to: env.LEAD_NOTIFY_TO,
        subject: `PAID emergency support — ${request.company || request.name}`,
        html: renderEmergencyAlert(request),
      }),
      notifyEmergencyToTeams({
        requestId: request.id,
        name: request.name,
        company: request.company,
        phone: request.phone,
        email: request.email,
        summary: request.summary,
        paid: true,
      }),
    ]);
  }),
);
