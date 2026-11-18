import crypto from 'node:crypto';
import type { RequestHandler, Request } from 'express';
import { type Role, isAuthorPath } from '@onsys/shared';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { env, isProd } from '../lib/env';

export const ADMIN_COOKIE = 'onsys_admin';

export interface AuthedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: Role;
    /// The byline an AUTHOR writes under. Their whole view of the console is
    /// defined by it, so it is carried on the request rather than re-read in
    /// every handler that needs to scope a query.
    authorId: string | null;
    mustChangePassword: boolean;
  };
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

  /*
   * Suspension takes effect on the next request, not the next sign-in.
   *
   * Checking this only at login would leave someone who has just been walked
   * out with a working console for the rest of an eight-hour session, which is
   * the window that matters. Their sessions go with them.
   */
  if (user.disabledAt) {
    await prisma.adminSession.deleteMany({ where: { userId: user.id } }).catch(() => {});
    res.clearCookie(ADMIN_COOKIE, cookieOptions);
    logger.warn({ userId: user.id }, 'Request from a suspended account rejected');
    res.status(401).json({ error: 'This account has been suspended.' });
    return;
  }

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    authorId: user.authorId,
    mustChangePassword: user.mustChangePassword,
  };
  next();
};

export const requireAdmin: RequestHandler = (req: AuthedRequest, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Administrator access required' });
    return;
  }
  next();
};

/** Requires one of the named roles. requireAdmin is the common case of this. */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req: AuthedRequest, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'You do not have access to that.' });
      return;
    }
    next();
  };

/**
 * Close the console to an AUTHOR except for the handful of paths they need.
 *
 * Default-deny, and deliberately so. The admin router carries leads, candidate
 * CVs, chat transcripts and on-call enrolments; a blocklist would have to be
 * extended every time one of those grew a route, and the cost of forgetting
 * once is a writer reading somebody's CV. With an allowlist, a route nobody
 * has thought about is closed.
 *
 * This is coarse on purpose — it answers "may authors call the posts routes",
 * not "is this post theirs". Ownership is checked inside each handler, where
 * the row is in hand.
 */
export const restrictAuthors: RequestHandler = (req: AuthedRequest, res, next) => {
  if (req.user?.role !== 'AUTHOR') {
    next();
    return;
  }

  // req.path within a router is the path after its mount point, without the
  // query string — '/posts/abc', not '/api/admin/posts/abc?draft=1'.
  if (isAuthorPath(req.method, req.path)) {
    next();
    return;
  }

  logger.info(
    { userId: req.user.id, method: req.method, path: req.path },
    'Author blocked from a path outside the blog',
  );
  res.status(403).json({ error: 'Your account covers blog articles only.' });
};

/**
 * Block everything while a temporary password is still in use.
 *
 * An account created by an administrator starts with a password that was read
 * out over the phone or typed into a chat window. Until it is replaced, the
 * session is only as private as that handover was, so it may do exactly two
 * things: read its own account, and change the password. Both live on the auth
 * router, which is why this guard sits on the admin router alone.
 *
 * The code is what the console keys on to send the person to the right screen;
 * a bare 403 would read as "you do not have access" and be reported as a bug.
 */
export const requirePasswordChanged: RequestHandler = (req: AuthedRequest, res, next) => {
  if (req.user?.mustChangePassword) {
    res.status(403).json({
      error: 'Choose a password of your own before you start.',
      code: 'PASSWORD_CHANGE_REQUIRED',
    });
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
