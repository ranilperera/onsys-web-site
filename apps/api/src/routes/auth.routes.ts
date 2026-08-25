import argon2 from 'argon2';
import { Router } from 'express';
import { loginSchema } from '@onsys/shared';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/error';
import { authLimiter } from '../middleware/security';
import {
  ADMIN_COOKIE,
  CSRF_COOKIE,
  cookieOptions,
  issueCsrfToken,
  requireAuth,
  type AuthedRequest,
} from '../middleware/auth';
import { isProd } from '../lib/env';

export const authRouter = Router();

authRouter.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    // Verify against a dummy hash when the user is missing so response timing
    // does not reveal which emails exist.
    const hash =
      user?.passwordHash ??
      '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHRzb21lc2FsdA$3hHU9K1M0Q3kQ0kZ1p0Kx8Zz4wV6Xz1yQ2sT4uV6Xz0';

    let valid = false;
    try {
      valid = await argon2.verify(hash, password);
    } catch {
      valid = false;
    }

    if (!user || !valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const session = await prisma.adminSession.create({
      data: { userId: user.id, expiresAt: new Date(Date.now() + cookieOptions.maxAge) },
    });

    const csrfToken = issueCsrfToken();

    res.cookie(ADMIN_COOKIE, session.id, cookieOptions);
    // Readable by JS so the client can echo it back in the header.
    res.cookie(CSRF_COOKIE, csrfToken, { ...cookieOptions, httpOnly: false });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, csrfToken });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const sessionId = req.cookies?.[ADMIN_COOKIE];
    if (sessionId) {
      await prisma.adminSession.delete({ where: { id: sessionId } }).catch(() => {});
    }
    res.clearCookie(ADMIN_COOKIE, cookieOptions);
    res.clearCookie(CSRF_COOKIE, { ...cookieOptions, httpOnly: false });
    res.json({ ok: true });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json({ user: req.user });
  }),
);
