import crypto from 'node:crypto';
import { Router } from 'express';
import argon2 from 'argon2';
import { z } from 'zod';
import { ROLE_LABELS, userCreateSchema, userEditSchema } from '@onsys/shared';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/error';
import { logger } from '../lib/logger';
import { type AuthedRequest } from '../middleware/auth';

/**
 * Console accounts.
 *
 * Mounted under /api/admin/users behind requireAdmin, so everything here is
 * administrator-only — the router itself carries no further role checks.
 *
 * It exists mainly to create AUTHOR accounts. That was possible before only by
 * SSH-ing to the VM and running create-admin.ts, which in practice meant it
 * never happened and drafts were pasted in by whoever had the admin login.
 *
 * Deliberately NOT here: changing an account's email address. The email is the
 * identity the password, the MFA challenges and every audit line hang off, and
 * changing it from a console form is how one person quietly becomes another.
 * A new address is a new account and the old one is suspended.
 */
export const adminUserRouter = Router();

/** What the console is allowed to see about an account. Never the hashes. */
const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  authorId: true,
  disabledAt: true,
  mustChangePassword: true,
  lastLoginAt: true,
  totpEnabledAt: true,
  createdAt: true,
  author: { select: { id: true, name: true, slug: true } },
} as const;

/**
 * A temporary password an administrator can read down a phone line.
 *
 * Four groups of four from a 31-character alphabet is a shade over 79 bits,
 * which is far beyond anything that gets guessed — and it has to be, because
 * this one is spoken aloud or pasted into a chat window before it is replaced.
 * I, l, 1, O and 0 are left out: this is read by a human to another human, and
 * a password that cannot be transcribed gets written on a sticky note.
 *
 * randomInt is rejection-sampled by Node, so there is no modulo bias.
 */
function temporaryPassword(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const group = () =>
    Array.from({ length: 4 }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
  return [group(), group(), group(), group()].join('-');
}

/** The byline must exist, or the account is created pointing at nothing. */
async function assertAuthorExists(authorId: string | null): Promise<string | null> {
  if (!authorId) return null;
  const author = await prisma.author.findUnique({ where: { id: authorId }, select: { id: true } });
  return author ? null : 'That byline no longer exists. Pick another, or create it under Authors.';
}

adminUserRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: [{ disabledAt: 'asc' }, { name: 'asc' }],
      select: userSelect,
    });
    res.json({ users });
  }),
);

/**
 * Create an account and hand back a temporary password, once.
 *
 * The password is in this response and nowhere else: it is hashed on the way
 * into the database, never logged, and never emailed. Emailing it would put a
 * working credential in a mailbox for as long as that mailbox is kept, which
 * is the one place it should not be. The administrator reads it out, and the
 * holder must replace it before the console will do anything else.
 */
adminUserRouter.post(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = userCreateSchema.parse(req.body);

    const clash = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (clash) {
      res.status(409).json({ error: 'An account already exists for that address.' });
      return;
    }

    const bylineProblem = await assertAuthorExists(input.authorId);
    if (bylineProblem) {
      res.status(400).json({ error: bylineProblem });
      return;
    }

    const password = temporaryPassword();
    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        role: input.role,
        authorId: input.authorId,
        passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
        mustChangePassword: true,
      },
      select: userSelect,
    });

    logger.warn(
      { userId: user.id, role: user.role, by: req.user?.id },
      'Console account created',
    );
    res.status(201).json({ user, temporaryPassword: password });
  }),
);

adminUserRouter.put(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    const input = userEditSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, role: true, disabledAt: true },
    });
    if (!existing) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    /*
     * You cannot change your own role or suspend yourself.
     *
     * Not paternalism: an administrator who demotes themselves by mistake
     * cannot undo it, because undoing it is an administrator action. The
     * recovery is an SSH session and the CLI, at whatever hour it happens.
     */
    if (existing.id === req.user?.id && (input.role !== existing.role || input.disabled)) {
      res.status(400).json({
        error: 'You cannot change your own role or suspend your own account.',
      });
      return;
    }

    /*
     * The last administrator cannot be demoted or suspended either. Counting
     * the enabled ones is the point — an organisation whose only other admin
     * is suspended has exactly one, whatever the table says.
     */
    if (existing.role === 'ADMIN' && (input.role !== 'ADMIN' || input.disabled)) {
      const admins = await prisma.user.count({
        where: { role: 'ADMIN', disabledAt: null, NOT: { id: existing.id } },
      });
      if (admins === 0) {
        res.status(400).json({
          error: 'This is the last administrator account. Promote somebody else first.',
        });
        return;
      }
    }

    const bylineProblem = await assertAuthorExists(input.authorId);
    if (bylineProblem) {
      res.status(400).json({ error: bylineProblem });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        name: input.name,
        role: input.role,
        authorId: input.authorId,
        disabledAt: input.disabled ? existing.disabledAt ?? new Date() : null,
      },
      select: userSelect,
    });

    // Suspension has to reach the open session, not wait for the next sign-in.
    if (input.disabled) {
      await prisma.adminSession.deleteMany({ where: { userId: user.id } });
    }

    logger.warn(
      { userId: user.id, role: user.role, disabled: Boolean(user.disabledAt), by: req.user?.id },
      'Console account changed',
    );
    res.json({ user });
  }),
);

/**
 * Issue a fresh temporary password.
 *
 * The forgotten-password path, and the one after a laptop goes missing. Every
 * open session for that account is dropped: a password reset that leaves the
 * old session working has not reset anything.
 */
adminUserRouter.post(
  '/:id/reset-password',
  asyncHandler(async (req: AuthedRequest, res) => {
    const existing = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!existing) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    const password = temporaryPassword();
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
        mustChangePassword: true,
      },
      select: userSelect,
    });
    await prisma.adminSession.deleteMany({ where: { userId: user.id } });

    logger.warn({ userId: user.id, by: req.user?.id }, 'Console password reset by an administrator');
    res.json({ user, temporaryPassword: password });
  }),
);

/**
 * Delete an account outright.
 *
 * Suspension is nearly always the right answer and the console says so: the
 * row is referenced by the jobs somebody posted and the applications they
 * moved, and those relations are SetNull, so deleting loses the only record of
 * who did what. Kept because an account created by mistake should not have to
 * live on the list forever.
 */
adminUserRouter.delete(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    const { confirm } = z.object({ confirm: z.literal(true) }).parse(req.body ?? {});
    void confirm;

    if (req.params.id === req.user?.id) {
      res.status(400).json({ error: 'You cannot delete your own account.' });
      return;
    }

    const existing = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, email: true, role: true, disabledAt: true },
    });
    if (!existing) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    if (existing.role === 'ADMIN' && !existing.disabledAt) {
      const admins = await prisma.user.count({
        where: { role: 'ADMIN', disabledAt: null, NOT: { id: existing.id } },
      });
      if (admins === 0) {
        res.status(400).json({
          error: 'This is the last administrator account. Promote somebody else first.',
        });
        return;
      }
    }

    await prisma.user.delete({ where: { id: req.params.id } });
    logger.warn(
      { userId: existing.id, role: ROLE_LABELS[existing.role], by: req.user?.id },
      'Console account deleted',
    );
    res.json({ ok: true });
  }),
);
