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
  limit: env.LEAD_RATE_LIMIT,
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
/**
 * Enforcement needs BOTH halves of the Turnstile pair.
 *
 * The secret alone is worse than no captcha at all: the browser has no site key,
 * so no form can produce a token, so every contact-form and booking submission
 * is rejected with 400 before it reaches the handler. That failure is silent
 * from the server's side — no email is attempted, so nothing appears in the log
 * except a 400 — and it took a production outage to spot. Requiring the site key
 * too means a half-configured deployment degrades to "no captcha" rather than
 * "no submissions".
 */
const captchaEnforced = Boolean(env.TURNSTILE_SECRET && env.TURNSTILE_SITE_KEY);

if (isProd && env.TURNSTILE_SECRET && !env.TURNSTILE_SITE_KEY) {
  logger.warn(
    'TURNSTILE_SECRET is set but TURNSTILE_SITE_KEY is not. Captcha is DISABLED: ' +
      'without a site key the front end cannot produce a token, and enforcing the ' +
      'secret alone would reject every form submission.',
  );
}

/** Turn Cloudflare's siteverify error codes into the thing to go and check. */
function explainSiteverify(codes: string[]): string {
  if (codes.includes('invalid-input-secret') || codes.includes('missing-input-secret')) {
    return 'TURNSTILE_SECRET is wrong, stale after a rotation, or has stray whitespace. It must be the 35-character secret from the same widget that issued the site key.';
  }
  if (codes.includes('timeout-or-duplicate')) {
    return 'The token was already used or is older than about five minutes. Tokens are single-use; the widget must mint a fresh one per submission.';
  }
  if (codes.includes('invalid-input-response')) {
    return 'The token does not belong to this secret — usually the site key and secret come from two different widgets.';
  }
  if (codes.includes('bad-request')) return 'Cloudflare rejected the request shape.';
  if (codes.includes('internal-error')) return 'Cloudflare-side error; retrying usually succeeds.';
  return 'See the Cloudflare siteverify error-code reference.';
}

export const verifyCaptcha: RequestHandler = async (req, res, next) => {
  if (!captchaEnforced) {
    if (isProd && !env.TURNSTILE_SECRET) {
      logger.warn('TURNSTILE_SECRET not set — captcha verification skipped in production');
    }
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
    const result = (await response.json()) as { success: boolean; 'error-codes'?: string[] };
    if (!result.success) {
      const codes = result['error-codes'] ?? [];
      // Cloudflare's error-codes are the whole diagnosis, and every cause looks
      // identical from the browser. Without them the only way to tell a stale
      // secret from a reused token is to guess.
      logger.warn(
        { codes, ip: req.ip },
        `Turnstile rejected a token: ${codes.join(', ') || 'no codes returned'}. ${explainSiteverify(codes)}`,
      );
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
