import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { rankRelated } from '../lib/related';
import { groupFooterLinks } from '@onsys/shared';
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
      /**
       * lede, seoDescription, noindex and contentUpdatedAt are here for
       * llms.txt: it lists every page, and a list of bare links tells a
       * retrieval layer nothing about which one answers the question. The
       * route is a public index, so only fields already visible on the page
       * itself are exposed.
       */
      select: {
        slug: true,
        title: true,
        heading: true,
        lede: true,
        seoDescription: true,
        noindex: true,
        navOrder: true,
        updatedAt: true,
        contentUpdatedAt: true,
      },
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
        include: { category: true, author: true },
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
      include: { category: true, author: true, faqs: { orderBy: { order: 'asc' } } },
    });
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    /**
     * Topically related posts, not just recent ones.
     *
     * Category alone was too coarse: almost everything sits in "Database", so
     * the three newest posts appeared under every article and a piece on TDE
     * recommended an Oracle RMAN guide. Titles are scored on shared
     * significant words, and recency only breaks ties.
     *
     * Done in application code rather than SQL because the corpus is ~50 rows.
     * Postgres full-text search would be the right answer at 500.
     */
    const candidates = await prisma.post.findMany({
      where: { status: 'PUBLISHED', id: { not: post.id } },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        coverImage: true,
        publishedAt: true,
        readMinutes: true,
        categoryId: true,
        category: { select: { name: true, color: true } },
      },
      orderBy: { publishedAt: 'desc' },
    });

    const related = rankRelated(post, candidates).map(
      ({ categoryId: _categoryId, ...rest }) => rest,
    );

    res.json({ post, related });
  }),
);

/**
 * One author with their published posts, for /about/[author].
 *
 * The page exists so the Person in each article's JSON-LD resolves to
 * something a search engine can read. A `sameAs` link pointing at a 404 is
 * worse than no author markup at all.
 */
contentRouter.get(
  '/authors/:slug',
  asyncHandler(async (req, res) => {
    const author = await prisma.author.findUnique({
      where: { slug: req.params.slug },
      include: {
        posts: {
          where: { status: 'PUBLISHED' },
          select: {
            slug: true,
            title: true,
            excerpt: true,
            coverImage: true,
            publishedAt: true,
            readMinutes: true,
            category: { select: { name: true, slug: true, color: true } },
          },
          orderBy: { publishedAt: 'desc' },
        },
      },
    });

    if (!author) {
      res.status(404).json({ error: 'Author not found' });
      return;
    }

    res.json({ author });
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

/**
 * Open vacancies for /careers.
 *
 * "Open" is published AND not past its closing date, so a job drops off the
 * listing on its own rather than waiting for someone to remember to unpublish
 * it. The date filter is `gte` on the start of today rather than on `now`,
 * because closesAt means end of that day — a job closing today is open today.
 */
contentRouter.get(
  '/jobs',
  asyncHandler(async (_req, res) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const jobs = await prisma.job.findMany({
      where: { status: 'PUBLISHED', closesAt: { gte: startOfToday } },
      orderBy: [{ closesAt: 'asc' }, { publishedAt: 'desc' }],
      select: {
        id: true, slug: true, title: true, summary: true, type: true,
        location: true, workArrangement: true, salaryRange: true,
        closesAt: true, applyEmail: true, seoTitle: true, seoDescription: true,
        publishedAt: true, updatedAt: true,
      },
    });
    res.json({ jobs });
  }),
);

/**
 * One vacancy.
 *
 * A closed job still resolves: a candidate who follows a link from an email or
 * a job board should be told the role has closed, not handed a 404. The page
 * decides how to present that; the API just reports it.
 */
contentRouter.get(
  '/jobs/:slug',
  asyncHandler(async (req, res) => {
    const job = await prisma.job.findFirst({
      where: { slug: req.params.slug, status: 'PUBLISHED' },
    });
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json({ job });
  }),
);

/** Published case studies for /case-studies, newest delivery first. */
contentRouter.get(
  '/case-studies',
  asyncHandler(async (_req, res) => {
    const caseStudies = await prisma.caseStudy.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ deliveredYear: 'desc' }, { title: 'asc' }],
      select: {
        id: true, slug: true, title: true, summary: true, sector: true,
        region: true, deliveredYear: true, platforms: true, publishedAt: true,
        updatedAt: true, contentUpdatedAt: true,
      },
    });
    res.json({ caseStudies });
  }),
);

contentRouter.get(
  '/case-studies/:slug',
  asyncHandler(async (req, res) => {
    const caseStudy = await prisma.caseStudy.findFirst({
      where: { slug: req.params.slug, status: 'PUBLISHED' },
    });
    if (!caseStudy) {
      res.status(404).json({ error: 'Case study not found' });
      return;
    }
    res.json({ caseStudy });
  }),
);

/** Feeds the dynamic sitemap in the web app. */
contentRouter.get(
  '/sitemap',
  asyncHandler(async (_req, res) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [pages, posts, categories, authors, jobs, caseStudies] = await Promise.all([
      prisma.page.findMany({
        where: { ...publishedPage, noindex: false },
        select: { slug: true, updatedAt: true, contentUpdatedAt: true },
      }),
      prisma.post.findMany({
        where: { status: 'PUBLISHED', noindex: false },
        select: { slug: true, updatedAt: true, publishedAt: true, contentUpdatedAt: true },
      }),
      prisma.category.findMany({ select: { slug: true } }),
      /**
       * Author profiles, but only those with something to show. An author
       * page with no published articles is a thin page, and asking a crawler
       * to index one is asking for the wrong kind of attention.
       */
      prisma.author.findMany({
        where: { posts: { some: { status: 'PUBLISHED', noindex: false } } },
        select: { slug: true, updatedAt: true },
      }),
      /**
       * Open vacancies only. A closed job still resolves for anyone holding
       * the link, but asking Google to index a role nobody can apply for
       * earns the site a page that disappoints every visitor it gets.
       */
      prisma.job.findMany({
        where: { status: 'PUBLISHED', closesAt: { gte: startOfToday } },
        select: { slug: true, updatedAt: true },
      }),
      prisma.caseStudy.findMany({
        where: { status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true, contentUpdatedAt: true },
      }),
    ]);
    res.json({ pages, posts, categories, authors, jobs, caseStudies });
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

/**
 * Footer navigation, grouped and ordered ready to render.
 *
 * Grouping here rather than in the web app keeps the ordering rule — group
 * name, then explicit order — in one place, and means the footer component
 * does no work beyond iterating what it is given. An empty table returns an
 * empty object, which the web app treats as "fall back to the built-in list"
 * rather than rendering a footer with no links in it.
 */
contentRouter.get(
  '/nav/footer',
  asyncHandler(async (_req, res) => {
    const links = await prisma.navLink.findMany({
      where: { visible: true },
      select: { group: true, groupOrder: true, label: true, href: true, order: true },
    });

    res.json({ groups: groupFooterLinks(links) });
  }),
);
