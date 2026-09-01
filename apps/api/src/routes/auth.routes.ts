import argon2 from 'argon2';
import QRCode from 'qrcode';
import { Router } from 'express';
import {
  loginSchema,
  mfaVerifySchema,
  mfaSendEmailSchema,
  mfaEnableSchema,
  mfaDisableSchema,
  changePasswordSchema,
} from '@onsys/shared';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { asyncHandler } from '../middleware/error';
import { authLimiter } from '../middleware/security';
import {
  ADMIN_COOKIE,
  CSRF_COOKIE,
  cookieOptions,
  issueCsrfToken,
  requireAuth,
  verifyCsrf,
  type AuthedRequest,
} from '../middleware/auth';
import {
  newTotpSecret,
  totpEnrolmentUri,
  verifyTotp,
  generateRecoveryCodes,
  hashRecoveryCode,
} from '../lib/totp';
import { generateCode, hashCode, codeMatches, OTP_RESEND_COOLDOWN_MS } from '../lib/otp';
import { sendEmail, renderAdminCode } from '../services/email.service';

export const authRouter = Router();

/** A password is only half a login, so the window to finish is short. */
const CHALLENGE_TTL_MS = 5 * 60_000;
const CHALLENGE_MAX_ATTEMPTS = 5;
const EMAIL_OTP_TTL_MINUTES = 5;

/**
 * Verified against this when the account does not exist, so response timing
 * does not reveal which addresses are real.
 */
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHRzb21lc2FsdA$3hHU9K1M0Q3kQ0kZ1p0Kx8Zz4wV6Xz1yQ2sT4uV6Xz0';

async function issueSession(userId: string, res: import('express').Response) {
  const session = await prisma.adminSession.create({
    data: { userId, expiresAt: new Date(Date.now() + cookieOptions.maxAge) },
  });
  const csrfToken = issueCsrfToken();

  res.cookie(ADMIN_COOKIE, session.id, cookieOptions);
  // Readable by JS so the client can echo it back in the header.
  res.cookie(CSRF_COOKIE, csrfToken, { ...cookieOptions, httpOnly: false });

  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  return csrfToken;
}

async function sendChallengeEmail(challengeId: string, email: string, name: string): Promise<boolean> {
  const code = generateCode();

  await prisma.mfaChallenge.update({
    where: { id: challengeId },
    data: { emailOtpHash: hashCode(challengeId, code), emailOtpSentAt: new Date() },
  });

  const result = await sendEmail({
    to: email,
    subject: `${code} is your Onsys admin sign-in code`,
    html: renderAdminCode(code, name, EMAIL_OTP_TTL_MINUTES),
  });

  // Same reasoning as the chat gate: without Graph configured there is no
  // inbox to read, and local development would have no way in. Never in
  // production, where a delivery failure must not put a live code in the log.
  if (!result.sent && process.env.NODE_ENV !== 'production') {
    logger.warn({ challengeId, code }, 'Email not configured — admin code logged for local development only');
    return true;
  }
  return result.sent;
}

/**
 * Step one: the password. Never issues a session on its own.
 *
 * A correct password produces a challenge, nothing more. If the account has an
 * authenticator enrolled that is the expected factor; otherwise a code is
 * emailed straight away, so MFA applies to every admin rather than only the
 * ones who got round to enrolling.
 */
authRouter.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    let valid = false;
    try {
      valid = await argon2.verify(user?.passwordHash ?? DUMMY_HASH, password);
    } catch {
      valid = false;
    }

    if (!user || !valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const challenge = await prisma.mfaChallenge.create({
      data: { userId: user.id, expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS) },
    });

    const totpEnrolled = Boolean(user.totpEnabledAt && user.totpSecret);
    let emailSent = false;
    if (!totpEnrolled) {
      emailSent = await sendChallengeEmail(challenge.id, user.email, user.name);
    }

    logger.info({ userId: user.id, totpEnrolled }, 'Admin password accepted, awaiting second factor');

    res.json({
      mfaRequired: true,
      challengeId: challenge.id,
      method: totpEnrolled ? 'totp' : 'email',
      emailSent,
      // So the UI can say where the code went without us echoing the address.
      emailHint: user.email.replace(/^(.).*(@.*)$/, '$1•••$2'),
      expiresInSeconds: Math.floor(CHALLENGE_TTL_MS / 1000),
    });
  }),
);

/** Email a code for an outstanding challenge — the "lost my phone" path. */
authRouter.post(
  '/mfa/send-email',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { challengeId } = mfaSendEmailSchema.parse(req.body);

    const challenge = await prisma.mfaChallenge.findUnique({
      where: { id: challengeId },
      include: { user: true },
    });

    if (!challenge || challenge.expiresAt < new Date()) {
      res.status(400).json({ error: 'That sign-in attempt has expired. Start again.', expired: true });
      return;
    }

    const since = challenge.emailOtpSentAt ? Date.now() - challenge.emailOtpSentAt.getTime() : Infinity;
    if (since < OTP_RESEND_COOLDOWN_MS) {
      res.status(429).json({
        error: 'A code was just sent. Give it a moment before asking for another.',
        retryAfterSeconds: Math.ceil((OTP_RESEND_COOLDOWN_MS - since) / 1000),
      });
      return;
    }

    const emailSent = await sendChallengeEmail(challenge.id, challenge.user.email, challenge.user.name);
    res.json({ ok: true, emailSent });
  }),
);

/**
 * Step two. One field accepts an authenticator code, an emailed code, or a
 * recovery code — whichever the person actually has to hand.
 */
authRouter.post(
  '/mfa/verify',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { challengeId, code } = mfaVerifySchema.parse(req.body);

    const challenge = await prisma.mfaChallenge.findUnique({
      where: { id: challengeId },
      include: { user: true },
    });

    if (!challenge || challenge.expiresAt < new Date()) {
      res.status(400).json({ error: 'That sign-in attempt has expired. Start again.', expired: true });
      return;
    }

    if (challenge.attempts >= CHALLENGE_MAX_ATTEMPTS) {
      // Burn the challenge, not the account. Locking the user out here would
      // let anyone with a leaked password deny them access at will.
      await prisma.mfaChallenge.delete({ where: { id: challenge.id } }).catch(() => {});
      res.status(429).json({ error: 'Too many incorrect codes. Start again.', expired: true });
      return;
    }

    const user = challenge.user;
    let accepted = false;
    let usedRecoveryCode: string | null = null;

    if (user.totpSecret && user.totpEnabledAt && verifyTotp(user.totpSecret, code)) {
      accepted = true;
    }

    if (!accepted && challenge.emailOtpHash && codeMatches(challenge.id, code.replace(/\s/g, ''), challenge.emailOtpHash)) {
      const age = challenge.emailOtpSentAt ? Date.now() - challenge.emailOtpSentAt.getTime() : Infinity;
      if (age <= EMAIL_OTP_TTL_MINUTES * 60_000) accepted = true;
    }

    if (!accepted && user.recoveryCodes.length > 0) {
      const candidate = hashRecoveryCode(code);
      if (user.recoveryCodes.includes(candidate)) {
        accepted = true;
        usedRecoveryCode = candidate;
      }
    }

    if (!accepted) {
      const { attempts } = await prisma.mfaChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
        select: { attempts: true },
      });
      res.status(401).json({
        error: 'That code is not right.',
        attemptsLeft: Math.max(CHALLENGE_MAX_ATTEMPTS - attempts, 0),
      });
      return;
    }

    // Single use: spend the recovery code before the session exists, so a
    // failure issuing the session cannot leave it usable a second time.
    if (usedRecoveryCode) {
      await prisma.user.update({
        where: { id: user.id },
        data: { recoveryCodes: user.recoveryCodes.filter((c) => c !== usedRecoveryCode) },
      });
      logger.warn(
        { userId: user.id, remaining: user.recoveryCodes.length - 1 },
        'Admin signed in with a recovery code',
      );
    }

    await prisma.mfaChallenge.delete({ where: { id: challenge.id } }).catch(() => {});
    const csrfToken = await issueSession(user.id, res);

    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      csrfToken,
      usedRecoveryCode: Boolean(usedRecoveryCode),
      recoveryCodesLeft: usedRecoveryCode ? user.recoveryCodes.length - 1 : user.recoveryCodes.length,
    });
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
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        lastLoginAt: true,
        totpEnabledAt: true,
        recoveryCodes: true,
      },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const { recoveryCodes, ...rest } = user;
    res.json({
      user: {
        ...rest,
        totpEnabled: Boolean(user.totpEnabledAt),
        // The count, never the codes — they exist only as hashes now anyway.
        recoveryCodesLeft: recoveryCodes.length,
      },
    });
  }),
);

// ---------------------------------------------------------------
// Enrolment and account management (signed in)
// ---------------------------------------------------------------

/**
 * Begin authenticator enrolment: mint a secret and render the QR server-side.
 *
 * Nothing is switched on here. The secret is stored but totpEnabledAt stays
 * null until a code proves the app actually holds it — otherwise a scan that
 * silently failed would leave an admin facing a factor they cannot satisfy.
 */
authRouter.post(
  '/mfa/setup',
  requireAuth,
  verifyCsrf,
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.totpEnabledAt) {
      res.status(409).json({ error: 'An authenticator is already set up. Turn it off before adding a new one.' });
      return;
    }

    const secret = newTotpSecret();
    await prisma.user.update({ where: { id: user.id }, data: { totpSecret: secret } });

    const uri = totpEnrolmentUri(secret, user.email);
    const qrDataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 240 });

    // The secret is returned for manual entry when a camera is unavailable.
    res.json({ secret, uri, qrDataUrl });
  }),
);

/** Confirm enrolment with a live code, and hand back the recovery codes once. */
authRouter.post(
  '/mfa/enable',
  requireAuth,
  verifyCsrf,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { code } = mfaEnableSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user?.totpSecret) {
      res.status(400).json({ error: 'Start the setup again — no pending authenticator was found.' });
      return;
    }

    if (!verifyTotp(user.totpSecret, code)) {
      res.status(400).json({ error: 'That code is not right. Check the app and try again.' });
      return;
    }

    const recoveryCodes = generateRecoveryCodes();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpEnabledAt: new Date(),
        recoveryCodes: recoveryCodes.map(hashRecoveryCode),
      },
    });

    logger.info({ userId: user.id }, 'Admin enrolled an authenticator app');

    // The only time these are ever readable. They are hashed in the database,
    // so a lost list means regenerating, not recovering.
    res.json({ ok: true, recoveryCodes });
  }),
);

authRouter.post(
  '/mfa/disable',
  requireAuth,
  verifyCsrf,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { password } = mfaDisableSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Re-authenticate: turning off a factor from an unattended session is
    // exactly what an attacker who found a logged-in laptop would do.
    let valid = false;
    try {
      valid = await argon2.verify(user.passwordHash, password);
    } catch {
      valid = false;
    }
    if (!valid) {
      res.status(401).json({ error: 'That password is not right.' });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: null, totpEnabledAt: null, recoveryCodes: [] },
    });

    logger.warn({ userId: user.id }, 'Admin turned off their authenticator app');
    res.json({ ok: true });
  }),
);

authRouter.post(
  '/change-password',
  requireAuth,
  verifyCsrf,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    let valid = false;
    try {
      valid = await argon2.verify(user.passwordHash, currentPassword);
    } catch {
      valid = false;
    }
    if (!valid) {
      res.status(401).json({ error: 'Your current password is not right.' });
      return;
    }

    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    const currentSessionId = req.cookies?.[ADMIN_COOKIE];

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      // Sign out everywhere else. A password change is how someone responds to
      // a suspected compromise, and it is worth little if the other session
      // stays live.
      prisma.adminSession.deleteMany({
        where: { userId: user.id, ...(currentSessionId ? { id: { not: currentSessionId } } : {}) },
      }),
    ]);

    logger.info({ userId: user.id }, 'Admin changed their password');
    res.json({ ok: true });
  }),
);

/** Housekeeping — expired challenges are noise, and one per failed login. */
export async function purgeExpiredChallenges(): Promise<number> {
  const { count } = await prisma.mfaChallenge.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 60 * 60_000) } },
  });
  return count;
}

// Not worth a scheduler: a handful of rows an hour, cleared opportunistically.
setInterval(
  () => {
    void purgeExpiredChallenges().catch(() => {});
  },
  60 * 60_000,
).unref();
