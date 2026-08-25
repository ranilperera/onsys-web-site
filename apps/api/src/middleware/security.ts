import type { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { env, isProd, org } from '../lib/env';
import { logger } from '../lib/logger';

/** Generous default — protects against scripted abuse, invisible to humans. */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

/** Contact form: tight. A real person submits once or twice. */
export const leadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: `Too many submissions. Please try again later or call us on ${org.phone}.` },
});

/** Chat: chatty by nature, but bounded so nobody burns our model budget. */
export const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'You are sending messages very quickly. Please slow down.' },
});

/** Login: brute-force protection. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

/**
 * Cloudflare Turnstile verification. Skipped when no secret is configured so
 * local development is not blocked, but required in production.
 */
export const verifyCaptcha: RequestHandler = async (req, res, next) => {
  if (!env.TURNSTILE_SECRET) {
    if (isProd) logger.warn('TURNSTILE_SECRET not set — captcha verification skipped in production');
    return next();
  }

  const token = (req.body?.captchaToken as string) || '';
  if (!token) {
    res.status(400).json({ error: 'Captcha verification required.' });
    return;
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token, remoteip: req.ip }),
    });
    const result = (await response.json()) as { success: boolean };
    if (!result.success) {
      res.status(400).json({ error: 'Captcha verification failed. Please try again.' });
      return;
    }
    next();
  } catch (error) {
    logger.error({ err: error }, 'Turnstile verification error');
    // Fail open rather than lose a genuine lead to a captcha outage.
    next();
  }
};

/** Honeypot: bots fill hidden fields, humans never see them. */
export const honeypot: RequestHandler = (req, res, next) => {
  if (req.body?.website) {
    logger.info({ ip: req.ip }, 'Honeypot triggered — silently discarding');
    // Pretend it worked so the bot does not adapt.
    res.status(201).json({ ok: true });
    return;
  }
  next();
};
