import crypto from 'node:crypto';
import { Router } from 'express';
import { chatStartSchema, chatMessageSchema, chatEscalateSchema, chatCloseSchema } from '@onsys/shared';
import { prisma } from '../lib/prisma';
import { env, org } from '../lib/env';
import { logger } from '../lib/logger';
import { asyncHandler } from '../middleware/error';
import { chatLimiter } from '../middleware/security';
import { hashIp } from '../middleware/auth';
import { answerQuestion } from '../services/rag.service';
import { wantsHuman } from '../lib/escalation';
import { escalateToTeams, fetchThreadReplies } from '../services/teams.service';
import { sendEmail, renderChatTranscript } from '../services/email.service';

export const chatRouter = Router();

/** Start a conversation. Returns the session id the widget holds onto. */
chatRouter.post(
  '/start',
  chatLimiter,
  asyncHandler(async (req, res) => {
    const input = chatStartSchema.parse(req.body ?? {});

    const session = await prisma.chatSession.create({
      data: {
        entryUrl: input.entryUrl?.slice(0, 500) || null,
        userAgent: req.get('user-agent')?.slice(0, 300) || null,
        ipHash: hashIp(req.ip),
        visitorName: input.name?.slice(0, 120) || null,
        visitorEmail: input.email?.slice(0, 200) || null,
      },
    });

    const greeting =
      "Hi — I'm the Onsys assistant. I can answer questions about our database, cloud, software and security services. What can I help with?";

    await prisma.chatMessage.create({
      data: { sessionId: session.id, role: 'ASSISTANT', content: greeting },
    });

    res.status(201).json({
      sessionId: session.id,
      status: session.status,
      messages: [{ role: 'ASSISTANT', content: greeting, createdAt: new Date() }],
    });
  }),
);

/** Send a visitor message and get the assistant's reply (or a handoff). */
chatRouter.post(
  '/message',
  chatLimiter,
  asyncHandler(async (req, res) => {
    const { sessionId, message } = chatMessageSchema.parse(req.body);

    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 40 } },
    });

    if (!session || session.status === 'CLOSED') {
      res.status(404).json({ error: 'Chat session not found or closed. Please refresh to start a new one.' });
      return;
    }

    await prisma.chatMessage.create({
      data: { sessionId, role: 'VISITOR', content: message },
    });

    // Already with a human — just record it and let Teams carry the conversation.
    if (session.status === 'HUMAN' || session.status === 'WAITING_HUMAN') {
      res.json({
        sessionId,
        reply: null,
        citations: [],
        status: session.status,
        escalated: true,
        note:
          session.status === 'WAITING_HUMAN'
            ? "Thanks — I've passed this to the team and someone will reply here shortly."
            : null,
      });
      return;
    }

    // Deterministic escalation check before spending a model call.
    if (wantsHuman(message)) {
      const result = await doEscalate(sessionId, 'Visitor asked for a human or reported an urgent issue');
      res.json({
        sessionId,
        reply: result.reply,
        citations: [],
        status: result.status,
        escalated: true,
      });
      return;
    }

    const history = session.messages.map((m) => ({ role: m.role, content: m.content }));
    const answer = await answerQuestion(message, history);

    if (answer.needsHuman) {
      const result = await doEscalate(sessionId, 'Assistant could not answer confidently', answer.answer);
      res.json({
        sessionId,
        reply: result.reply,
        citations: answer.citations,
        status: result.status,
        escalated: true,
      });
      return;
    }

    await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content: answer.answer,
        citations: answer.citations.length ? (answer.citations as unknown as object) : undefined,
      },
    });

    res.json({
      sessionId,
      reply: answer.answer,
      citations: answer.citations,
      status: 'BOT',
      escalated: false,
    });
  }),
);

/** Explicit "talk to a human" button in the widget. */
chatRouter.post(
  '/escalate',
  chatLimiter,
  asyncHandler(async (req, res) => {
    const input = chatEscalateSchema.parse(req.body);

    const session = await prisma.chatSession.findUnique({ where: { id: input.sessionId } });
    if (!session) {
      res.status(404).json({ error: 'Chat session not found' });
      return;
    }

    if (input.name || input.email) {
      await prisma.chatSession.update({
        where: { id: input.sessionId },
        data: {
          visitorName: input.name?.slice(0, 120) || session.visitorName,
          visitorEmail: input.email?.slice(0, 200) || session.visitorEmail,
        },
      });

      // A named visitor asking for a human is a lead — capture it.
      if (input.email) {
        await prisma.lead
          .upsert({
            where: { sessionId: input.sessionId },
            create: {
              name: input.name || 'Chat visitor',
              email: input.email,
              message: input.reason || 'Requested a human via live chat',
              channel: 'CHAT',
              sessionId: input.sessionId,
            },
            update: {},
          })
          .catch((err) => logger.error({ err }, 'Failed to upsert chat lead'));
      }
    }

    const result = await doEscalate(input.sessionId, input.reason || 'Visitor requested a human');
    res.json({ sessionId: input.sessionId, reply: result.reply, status: result.status, escalated: true });
  }),
);

/**
 * Visitor ends the conversation, and gets the transcript by email if we hold
 * an address for them.
 *
 * Deliberately idempotent and never fails on the email: someone clicking "end
 * chat" wants the conversation closed, and a Graph outage must not leave them
 * staring at an error on the way out. The send result is reported so the
 * widget can say whether the transcript actually went.
 */
chatRouter.post(
  '/close',
  chatLimiter,
  asyncHandler(async (req, res) => {
    const input = chatCloseSchema.parse(req.body);

    const session = await prisma.chatSession.findUnique({ where: { id: input.sessionId } });
    if (!session) {
      res.status(404).json({ error: 'Chat session not found' });
      return;
    }

    if (session.status === 'CLOSED') {
      res.json({ ok: true, status: 'CLOSED', transcriptSent: false, alreadyClosed: true });
      return;
    }

    const recipient = input.email || session.visitorEmail;

    await prisma.chatSession.update({
      where: { id: input.sessionId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        visitorEmail: recipient ?? session.visitorEmail,
      },
    });

    let transcriptSent = false;
    if (recipient) {
      const messages = await prisma.chatMessage.findMany({
        where: { sessionId: input.sessionId },
        orderBy: { createdAt: 'asc' },
      });

      try {
        const result = await sendEmail({
          to: recipient,
          subject: 'Your chat with Onsys Technologies',
          html: renderChatTranscript(messages),
        });
        transcriptSent = result.sent;
        if (!result.sent) {
          logger.warn({ sessionId: input.sessionId, reason: result.reason }, 'Chat transcript not sent');
        }
      } catch (error) {
        logger.error({ err: error, sessionId: input.sessionId }, 'Chat transcript email failed');
      }
    }

    res.json({ ok: true, status: 'CLOSED', transcriptSent, email: recipient ?? null });
  }),
);

/**
 * Widget polls this for new agent messages. Also pulls replies out of the
 * Teams thread when Graph two-way mode is configured.
 */
chatRouter.get(
  '/:sessionId/messages',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const since = req.query.since ? new Date(String(req.query.since)) : undefined;

    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      res.status(404).json({ error: 'Chat session not found' });
      return;
    }

    // Pull anything new from Teams into our own message log first.
    if (session.teamsThreadId && (session.status === 'WAITING_HUMAN' || session.status === 'HUMAN')) {
      await syncTeamsReplies(sessionId, session.teamsThreadId);
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId, ...(since && !Number.isNaN(since.getTime()) ? { createdAt: { gt: since } } : {}) },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    const current = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { status: true },
    });

    res.json({ messages, status: current?.status ?? session.status });
  }),
);

/**
 * Inbound webhook for a Teams bot or Power Automate flow to push an agent's
 * reply back to the visitor without us polling Graph.
 *
 * Secured with a shared secret compared in constant time.
 */
chatRouter.post(
  '/teams-reply',
  asyncHandler(async (req, res) => {
    const provided = req.get('x-onsys-signature') || '';
    const expected = env.TEAMS_INBOUND_SECRET || '';

    if (!expected) {
      res.status(503).json({ error: 'Inbound Teams replies are not configured' });
      return;
    }
    if (
      provided.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
    ) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const { sessionId, message, authorName } = req.body ?? {};
    if (typeof sessionId !== 'string' || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'sessionId and message are required' });
      return;
    }

    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      res.status(404).json({ error: 'Chat session not found' });
      return;
    }

    await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'AGENT',
        content: message.slice(0, 4000),
        authorName: typeof authorName === 'string' ? authorName.slice(0, 120) : 'Onsys',
      },
    });

    await prisma.chatSession.update({ where: { id: sessionId }, data: { status: 'HUMAN' } });

    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

async function doEscalate(
  sessionId: string,
  reason: string,
  precedingAnswer?: string,
): Promise<{ reply: string; status: 'WAITING_HUMAN' | 'HUMAN' | 'BOT' }> {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
  });
  if (!session) return { reply: 'Session not found.', status: 'BOT' };

  if (session.status === 'CLOSED') {
    return {
      reply: "That chat has already ended. Start a new one and we'll pick it up from there.",
      status: 'BOT',
    };
  }

  /**
   * Claim the escalation atomically.
   *
   * This is a single UPDATE ... WHERE status = 'BOT', so two requests racing —
   * a double-click, a second tab, a retry after a slow response — cannot both
   * win. Checking the status we read above and then updating would leave a gap
   * between the two queries wide enough for both to pass, which is exactly how
   * one conversation ends up posting two cards into Teams and two people start
   * answering the same visitor.
   */
  const claim = await prisma.chatSession.updateMany({
    where: { id: sessionId, status: 'BOT' },
    data: { status: 'WAITING_HUMAN', escalatedAt: new Date() },
  });

  if (claim.count === 0) {
    // Someone already escalated this conversation. Tell the visitor where
    // things stand, but do not send the team a second copy. Not persisted —
    // repeated clicks would otherwise fill the transcript with system noise.
    const alreadyWithHuman = session.status === 'HUMAN';
    return {
      reply: alreadyWithHuman
        ? "You're already connected to one of our team — they can see your messages here."
        : `Your chat is already with the team — someone will reply here shortly. If it's urgent, call ${org.phone}.`,
      status: alreadyWithHuman ? 'HUMAN' : 'WAITING_HUMAN',
    };
  }

  // Record the assistant's partial answer before the handoff, if there was one.
  if (precedingAnswer) {
    await prisma.chatMessage.create({
      data: { sessionId, role: 'ASSISTANT', content: precedingAnswer },
    });
  }

  const result = await escalateToTeams({
    sessionId,
    visitorName: session.visitorName,
    visitorEmail: session.visitorEmail,
    entryUrl: session.entryUrl,
    reason,
    transcript: session.messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const reply = result.delivered
    ? `I've passed this to our team — someone will reply here shortly. If it's urgent, call ${org.phone}.`
    : `I'm not able to reach the team automatically right now. Please email ${org.email} or call ${org.phone} and we'll pick it up straight away.`;

  await prisma.chatMessage.create({ data: { sessionId, role: 'SYSTEM', content: reply } });

  if (result.delivered) {
    // Status and escalatedAt were already set by the claim above; only the
    // thread id is new, and only in Graph two-way mode.
    if (result.threadId) {
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { teamsThreadId: result.threadId },
      });
    }
    return { reply, status: 'WAITING_HUMAN' };
  }

  // Nothing reached the team, so release the claim. Leaving the session
  // WAITING_HUMAN would hide the "talk to a human" button behind a handoff
  // that never happened, and the visitor has just been told to call instead.
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { status: 'BOT', escalatedAt: null },
  });

  return { reply, status: 'BOT' };
}

/** Idempotently copy Teams thread replies into our message log. */
async function syncTeamsReplies(sessionId: string, threadId: string): Promise<void> {
  try {
    const replies = await fetchThreadReplies(threadId);
    if (replies.length === 0) return;

    const existing = await prisma.chatMessage.findMany({
      where: { sessionId, role: 'AGENT' },
      select: { content: true, createdAt: true },
    });
    const seen = new Set(existing.map((m) => `${m.content}|${m.createdAt.getTime()}`));

    for (const reply of replies) {
      const key = `${reply.content}|${reply.createdAt.getTime()}`;
      if (seen.has(key)) continue;

      await prisma.chatMessage.create({
        data: {
          sessionId,
          role: 'AGENT',
          content: reply.content,
          authorName: reply.authorName,
          createdAt: reply.createdAt,
        },
      });
    }

    await prisma.chatSession.update({ where: { id: sessionId }, data: { status: 'HUMAN' } });
  } catch (error) {
    logger.error({ err: error, sessionId }, 'Failed to sync Teams replies');
  }
}
