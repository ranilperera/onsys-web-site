import { Router } from 'express';
import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';
import { marked } from 'marked';
import { blocksSchema } from '@onsys/shared';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/error';
import { requireAuth, requireAdmin, verifyCsrf } from '../middleware/auth';
import { sendEmail, renderChatTranscript } from '../services/email.service';

/**
 * Admin CMS API. Every route requires an authenticated session and a valid
 * CSRF token on mutations.
 */
export const adminRouter = Router();

adminRouter.use(requireAuth, verifyCsrf);

const contentStatus = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

/** Strip anything script-ish from CMS-authored HTML before it is stored. */
const sanitise = (html: string): string =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h2', 'h3', 'h4',
      'blockquote', 'code', 'pre', 'img', 'table', 'thead', 'tbody', 'tr', 'th',
      'td', 'hr', 'span', 'div', 'figure', 'figcaption',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel', 'class', 'id', 'width', 'height'],
    ALLOW_DATA_ATTR: false,
  });

// ---------------------------------------------------------------
// Pages
// ---------------------------------------------------------------

const pageSchema = z.object({
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens'),
  title: z.string().min(1).max(200),
  heading: z.string().min(1).max(300),
  eyebrow: z.string().max(120).optional().nullable(),
  lede: z.string().max(2000).optional().nullable(),
  status: contentStatus.default('DRAFT'),
  blocks: blocksSchema.default([]),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  ogImage: z.string().max(500).optional().nullable(),
  canonicalUrl: z.string().max(500).optional().nullable(),
  noindex: z.boolean().default(false),
  navOrder: z.number().int().optional().nullable(),
  faqs: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
});

adminRouter.get(
  '/pages',
  asyncHandler(async (_req, res) => {
    const pages = await prisma.page.findMany({
      orderBy: { updatedAt: 'desc' },
      select: { id: true, slug: true, title: true, status: true, updatedAt: true, navOrder: true },
    });
    res.json({ pages });
  }),
);

adminRouter.get(
  '/pages/:id',
  asyncHandler(async (req, res) => {
    const page = await prisma.page.findUnique({
      where: { id: req.params.id },
      include: { faqs: { orderBy: { order: 'asc' } } },
    });
    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }
    res.json({ page });
  }),
);

adminRouter.post(
  '/pages',
  asyncHandler(async (req, res) => {
    const input = pageSchema.parse(req.body);
    const { faqs, ...data } = input;

    const page = await prisma.page.create({
      data: {
        ...data,
        publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
        faqs: { create: faqs.map((f, i) => ({ ...f, order: i })) },
      },
      include: { faqs: true },
    });
    res.status(201).json({ page });
  }),
);

adminRouter.put(
  '/pages/:id',
  asyncHandler(async (req, res) => {
    const input = pageSchema.parse(req.body);
    const { faqs, ...data } = input;

    const existing = await prisma.page.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }

    // Replace FAQs wholesale — simpler and safe at this scale.
    const page = await prisma.$transaction(async (tx) => {
      await tx.faq.deleteMany({ where: { pageId: req.params.id } });
      return tx.page.update({
        where: { id: req.params.id },
        data: {
          ...data,
          publishedAt:
            data.status === 'PUBLISHED' ? existing.publishedAt ?? new Date() : existing.publishedAt,
          faqs: { create: faqs.map((f, i) => ({ ...f, order: i })) },
        },
        include: { faqs: true },
      });
    });

    res.json({ page });
  }),
);

adminRouter.delete(
  '/pages/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await prisma.page.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------
// Posts
// ---------------------------------------------------------------

const postSchema = z.object({
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(300),
  excerpt: z.string().max(1000).optional().nullable(),
  bodyMarkdown: z.string().optional().nullable(),
  bodyHtml: z.string().optional().nullable(),
  status: contentStatus.default('DRAFT'),
  categoryId: z.string().optional().nullable(),
  authorName: z.string().max(120).default('Onsys Technologies'),
  readMinutes: z.number().int().min(1).max(120).default(5),
  coverImage: z.string().max(500).optional().nullable(),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  ogImage: z.string().max(500).optional().nullable(),
  canonicalUrl: z.string().max(500).optional().nullable(),
  noindex: z.boolean().default(false),
  faqs: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
});

/** Markdown is the source of truth when supplied; HTML is derived and sanitised. */
function resolveBody(input: z.infer<typeof postSchema>): string {
  if (input.bodyMarkdown) return sanitise(marked.parse(input.bodyMarkdown, { async: false }) as string);
  if (input.bodyHtml) return sanitise(input.bodyHtml);
  return '';
}

adminRouter.get(
  '/posts',
  asyncHandler(async (_req, res) => {
    const posts = await prisma.post.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, slug: true, title: true, status: true, updatedAt: true,
        publishedAt: true, category: { select: { name: true } },
      },
    });
    res.json({ posts });
  }),
);

adminRouter.get(
  '/posts/:id',
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: { faqs: { orderBy: { order: 'asc' } }, category: true },
    });
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    res.json({ post });
  }),
);

adminRouter.post(
  '/posts',
  asyncHandler(async (req, res) => {
    const input = postSchema.parse(req.body);
    const { faqs, bodyHtml: _ignored, ...data } = input;

    const post = await prisma.post.create({
      data: {
        ...data,
        bodyHtml: resolveBody(input),
        publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
        faqs: { create: faqs.map((f, i) => ({ ...f, order: i })) },
      },
      include: { faqs: true },
    });
    res.status(201).json({ post });
  }),
);

adminRouter.put(
  '/posts/:id',
  asyncHandler(async (req, res) => {
    const input = postSchema.parse(req.body);
    const { faqs, bodyHtml: _ignored, ...data } = input;

    const existing = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    const post = await prisma.$transaction(async (tx) => {
      await tx.faq.deleteMany({ where: { postId: req.params.id } });
      return tx.post.update({
        where: { id: req.params.id },
        data: {
          ...data,
          bodyHtml: resolveBody(input),
          publishedAt:
            data.status === 'PUBLISHED' ? existing.publishedAt ?? new Date() : existing.publishedAt,
          faqs: { create: faqs.map((f, i) => ({ ...f, order: i })) },
        },
        include: { faqs: true },
      });
    });

    res.json({ post });
  }),
);

adminRouter.delete(
  '/posts/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await prisma.post.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------
// Leads
// ---------------------------------------------------------------

adminRouter.get(
  '/leads',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(100, Number(req.query.perPage) || 25);

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.lead.count(),
    ]);

    res.json({ leads, pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) } });
  }),
);

adminRouter.patch(
  '/leads/:id',
  asyncHandler(async (req, res) => {
    const { status } = z
      .object({ status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED']) })
      .parse(req.body);
    const lead = await prisma.lead.update({ where: { id: req.params.id }, data: { status } });
    res.json({ lead });
  }),
);

// ---------------------------------------------------------------
// Chat transcripts + agent replies from the console
// ---------------------------------------------------------------

adminRouter.get(
  '/chat',
  asyncHandler(async (_req, res) => {
    const sessions = await prisma.chatSession.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: { _count: { select: { messages: true } } },
    });
    res.json({ sessions });
  }),
);

adminRouter.get(
  '/chat/:id',
  asyncHandler(async (req, res) => {
    const session = await prisma.chatSession.findUnique({
      where: { id: req.params.id },
      include: { messages: { orderBy: { createdAt: 'asc' } }, lead: true },
    });
    if (!session) {
      res.status(404).json({ error: 'Chat session not found' });
      return;
    }
    res.json({ session });
  }),
);

/** Reply to a visitor from the admin console (the webhook-transport path). */
adminRouter.post(
  '/chat/:id/reply',
  asyncHandler(async (req, res) => {
    const { message } = z.object({ message: z.string().min(1).max(4000) }).parse(req.body);
    const authed = (req as { user?: { name: string } }).user;

    const session = await prisma.chatSession.findUnique({ where: { id: req.params.id } });
    if (!session) {
      res.status(404).json({ error: 'Chat session not found' });
      return;
    }

    const created = await prisma.chatMessage.create({
      data: {
        sessionId: req.params.id,
        role: 'AGENT',
        content: message,
        authorName: authed?.name ?? 'Onsys',
      },
    });

    await prisma.chatSession.update({ where: { id: req.params.id }, data: { status: 'HUMAN' } });

    res.status(201).json({ message: created });
  }),
);

adminRouter.post(
  '/chat/:id/email-transcript',
  asyncHandler(async (req, res) => {
    const { to } = z.object({ to: z.string().email() }).parse(req.body);

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: req.params.id },
      orderBy: { createdAt: 'asc' },
    });

    const result = await sendEmail({
      to,
      subject: 'Your chat with Onsys Technologies',
      html: renderChatTranscript(messages),
    });

    res.json(result);
  }),
);

// ---------------------------------------------------------------
// Redirects + dashboard
// ---------------------------------------------------------------

adminRouter.get(
  '/redirects',
  asyncHandler(async (_req, res) => {
    const redirects = await prisma.redirect.findMany({ orderBy: { fromPath: 'asc' } });
    res.json({ redirects });
  }),
);

adminRouter.post(
  '/redirects',
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        fromPath: z.string().min(1).startsWith('/'),
        toPath: z.string().min(1),
        statusCode: z.number().int().refine((v) => v === 301 || v === 302).default(301),
      })
      .parse(req.body);

    const redirect = await prisma.redirect.upsert({
      where: { fromPath: input.fromPath },
      create: input,
      update: { toPath: input.toPath, statusCode: input.statusCode },
    });
    res.status(201).json({ redirect });
  }),
);

adminRouter.delete(
  '/redirects/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await prisma.redirect.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);

adminRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalLeads, recentLeads, newLeads, publishedPosts, draftPosts, chatSessions, escalations] =
      await Promise.all([
        prisma.lead.count(),
        prisma.lead.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.lead.count({ where: { status: 'NEW' } }),
        prisma.post.count({ where: { status: 'PUBLISHED' } }),
        prisma.post.count({ where: { status: 'DRAFT' } }),
        prisma.chatSession.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.chatSession.count({ where: { escalatedAt: { not: null }, createdAt: { gte: thirtyDaysAgo } } }),
      ]);

    res.json({
      leads: { total: totalLeads, last30Days: recentLeads, new: newLeads },
      content: { publishedPosts, draftPosts },
      chat: { last30Days: chatSessions, escalations: escalations },
    });
  }),
);
