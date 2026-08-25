import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/error';

/**
 * Public read-only content API consumed by the Next.js app at build/request
 * time. Everything here is cacheable and returns only PUBLISHED records.
 */
export const contentRouter = Router();

const publishedPage = { status: 'PUBLISHED' as const };

contentRouter.get(
  '/pages',
  asyncHandler(async (_req, res) => {
    const pages = await prisma.page.findMany({
      where: publishedPage,
      select: { slug: true, title: true, heading: true, navOrder: true, updatedAt: true },
      orderBy: [{ navOrder: 'asc' }, { title: 'asc' }],
    });
    res.json({ pages });
  }),
);

contentRouter.get(
  '/pages/:slug',
  asyncHandler(async (req, res) => {
    const page = await prisma.page.findFirst({
      where: { slug: req.params.slug, ...publishedPage },
      include: { faqs: { orderBy: { order: 'asc' } } },
    });
    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }
    res.json({ page });
  }),
);

contentRouter.get(
  '/posts',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(50, Math.max(1, Number(req.query.perPage) || 12));
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;

    const where = {
      status: 'PUBLISHED' as const,
      ...(category ? { category: { slug: category } } : {}),
    };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: { category: true },
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.post.count({ where }),
    ]);

    res.json({
      posts: posts.map(({ bodyHtml, bodyMarkdown, ...rest }) => rest), // list view doesn't need the body
      pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
    });
  }),
);

contentRouter.get(
  '/posts/:slug',
  asyncHandler(async (req, res) => {
    const post = await prisma.post.findFirst({
      where: { slug: req.params.slug, status: 'PUBLISHED' },
      include: { category: true, faqs: { orderBy: { order: 'asc' } } },
    });
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    // Lightweight "related" — same category, most recent, excluding self.
    const related = await prisma.post.findMany({
      where: {
        status: 'PUBLISHED',
        id: { not: post.id },
        ...(post.categoryId ? { categoryId: post.categoryId } : {}),
      },
      select: { slug: true, title: true, excerpt: true, coverImage: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
      take: 3,
    });

    res.json({ post, related });
  }),
);

contentRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { posts: { where: { status: 'PUBLISHED' } } } } },
    });
    res.json({ categories });
  }),
);

/** Feeds the dynamic sitemap in the web app. */
contentRouter.get(
  '/sitemap',
  asyncHandler(async (_req, res) => {
    const [pages, posts, categories] = await Promise.all([
      prisma.page.findMany({
        where: { ...publishedPage, noindex: false },
        select: { slug: true, updatedAt: true },
      }),
      prisma.post.findMany({
        where: { status: 'PUBLISHED', noindex: false },
        select: { slug: true, updatedAt: true, publishedAt: true },
      }),
      prisma.category.findMany({ select: { slug: true } }),
    ]);
    res.json({ pages, posts, categories });
  }),
);

/** 301 map consumed by the Next.js middleware. */
contentRouter.get(
  '/redirects',
  asyncHandler(async (_req, res) => {
    const redirects = await prisma.redirect.findMany({
      select: { fromPath: true, toPath: true, statusCode: true },
    });
    res.json({ redirects });
  }),
);
