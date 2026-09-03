import Stripe from 'stripe';
import { env, stripeConfigured } from '../lib/env';
import { logger } from '../lib/logger';

/**
 * Stripe Checkout for prepaid emergency support blocks.
 *
 * We never build the price here. STRIPE_EMERGENCY_PRICE_ID points at a Price
 * object in Stripe, and Stripe is the only place the amount lives — a number
 * duplicated into page content or into this file is one that can silently
 * disagree with what the customer is actually charged, and the charge is the
 * side that has to be right.
 */

let client: Stripe | null = null;

function stripe(): Stripe {
  if (!client) {
    client = new Stripe(env.STRIPE_SECRET_KEY!, {
      // Pinned to the version this SDK was built against, so an account-level
      // API upgrade in the Stripe dashboard cannot change the shape of a
      // webhook this code parses without someone choosing it here first.
      apiVersion: '2026-08-26.dahlia',
      typescript: true,
    });
  }
  return client;
}

export interface CheckoutInput {
  requestId: string;
  email: string;
  name: string;
  company?: string | null;
  phone: string;
}

export interface CheckoutResult {
  url: string;
  sessionId: string;
}

export async function createEmergencyCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const returnTo = `${env.SITE_URL}/emergency-database-support`;

  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: env.STRIPE_EMERGENCY_PRICE_ID!, quantity: 1 }],
    customer_email: input.email,
    client_reference_id: input.requestId,
    // Read back by the webhook. Stripe is the source of truth for the charge;
    // this is how we tie the charge to the enquiry that started it.
    metadata: {
      requestId: input.requestId,
      name: input.name,
      company: input.company ?? '',
      phone: input.phone,
    },
    payment_intent_data: {
      description: 'Onsys emergency database support — 4 hour block',
      metadata: { requestId: input.requestId },
    },
    // session_id is what the return page uses to show the right next steps.
    success_url: `${returnTo}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnTo}?cancelled=1`,
    // An outage is a bad time to be told a session timed out. Stripe's default
    // is 24 hours; this is long enough to find a company card and short enough
    // that a stale link cannot be paid days later.
    expires_at: Math.floor(Date.now() / 1000) + 2 * 60 * 60,
  });

  if (!session.url) throw new Error('Stripe did not return a checkout URL');
  return { url: session.url, sessionId: session.id };
}

/**
 * Verify and parse a webhook.
 *
 * Requires the raw request body — Express must not have parsed it into an
 * object first, or the signature will never match. See server.ts, where this
 * route is mounted with express.raw() ahead of express.json().
 */
export function parseWebhook(rawBody: Buffer, signature: string): Stripe.Event {
  return stripe().webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET!);
}

/** The publicly quotable price, read from Stripe so the page cannot drift. */
export async function emergencyPrice(): Promise<{
  amountCents: number;
  currency: string;
  label: string;
} | null> {
  if (!stripeConfigured) return null;

  try {
    const price = await stripe().prices.retrieve(env.STRIPE_EMERGENCY_PRICE_ID!);
    if (price.unit_amount == null) return null;

    return {
      amountCents: price.unit_amount,
      currency: price.currency,
      label: new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: price.currency.toUpperCase(),
        minimumFractionDigits: 0,
      }).format(price.unit_amount / 100),
    };
  } catch (error) {
    logger.error({ err: error }, 'Could not read the emergency price from Stripe');
    return null;
  }
}
