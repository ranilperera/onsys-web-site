import crypto from 'node:crypto';
import type { RequestHandler, Request } from 'express';
import { prisma } from '../lib/prisma';
import { env, isProd } from '../lib/env';

export const ADMIN_COOKIE = 'onsys_admin';

export interface AuthedRequest extends Request {
  user?: { id: string; email: string; name: string; role: 'ADMIN' | 'EDITOR' };
}

export const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 1000 * 60 * 60 * 8, // 8 hours
};

/** Requires a valid, unexpired admin session cookie. */
export const requireAuth: RequestHandler = async (req: AuthedRequest, res, next) => {
  const sessionId = req.cookies?.[ADMIN_COOKIE];
  if (!sessionId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const session = await prisma.adminSession.findUnique({ where: { id: sessionId } });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.adminSession.delete({ where: { id: session.id } }).catch(() => {});
    res.clearCookie(ADMIN_COOKIE, cookieOptions);
    res.status(401).json({ error: 'Session expired' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
  next();
};

export const requireAdmin: RequestHandler = (req: AuthedRequest, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Administrator access required' });
    return;
  }
  next();
};

/**
 * Double-submit CSRF check for cookie-authenticated mutations.
 * The web app reads the `onsys_csrf` cookie and echoes it in `x-csrf-token`.
 * An attacker's site can force the cookie to be sent but cannot read it to
 * set the matching header.
 */
export const CSRF_COOKIE = 'onsys_csrf';

export const issueCsrfToken = (): string => crypto.randomBytes(32).toString('hex');

export const verifyCsrf: RequestHandler = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get('x-csrf-token');

  if (!cookieToken || !headerToken || cookieToken.length !== headerToken.length) {
    res.status(403).json({ error: 'Invalid CSRF token' });
    return;
  }

  // Constant-time compare avoids leaking the token through timing.
  const match = crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
  if (!match) {
    res.status(403).json({ error: 'Invalid CSRF token' });
    return;
  }

  next();
};

/** Hash IPs before storage — we want abuse signals, not a log of who visited. */
export const hashIp = (ip: string | undefined): string | null =>
  ip ? crypto.createHmac('sha256', env.SESSION_SECRET).update(ip).digest('hex').slice(0, 32) : null;
