import { Router } from 'express';
import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';
import { marked } from 'marked';
import { blocksSchema, purgeChatSchema, normalisePastedHtml, isAllowedNavHref } from '@onsys/shared';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../middleware/error';
import { logger } from '../lib/logger';
import { requireAuth, requireAdmin, verifyCsrf } from '../middleware/auth';
import { sendEmail, renderChatTranscript } from '../services/email.service';
import { revalidateInBackground, tags } from '../services/revalidate.service';

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

    revalidateInBackground({
      tags: [tags.page(page.slug), tags.pageList, tags.sitemap],
      paths: [`/${page.slug}`],
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

    revalidateInBackground({
      // Both slugs when the URL changed, so the old path stops serving the
      // page from cache after it has moved.
      tags: [tags.page(page.slug), tags.page(existing.slug), tags.pageList, tags.sitemap],
      paths: [`/${page.slug}`, `/${existing.slug}`],
    });
    res.json({ page });
  }),
);

adminRouter.delete(
  '/pages/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const page = await prisma.page.delete({ where: { id: req.params.id } });
    revalidateInBackground({
      tags: [tags.page(page.slug), tags.pageList, tags.sitemap],
      paths: [`/${page.slug}`],
    });
    res.json({ ok: true });
  }),
);

/**
 * Publish / unpublish without loading and re-submitting the whole page.
 *
 * Mirrors the post equivalent, including the publishedAt rule: the date is set
 * the first time the page goes live and kept thereafter, so unpublishing to
 * fix a typo does not reset the page's age in the index.
 */
adminRouter.patch(
  '/pages/:id/status',
  asyncHandler(async (req, res) => {
    const { status } = z.object({ status: contentStatus }).parse(req.body);

    const existing = await prisma.page.findUnique({
      where: { id: req.params.id },
      select: { publishedAt: true },
    });
    if (!existing) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }

    const page = await prisma.page.update({
      where: { id: req.params.id },
      data: {
        status,
        publishedAt:
          status === 'PUBLISHED' ? existing.publishedAt ?? new Date() : existing.publishedAt,
      },
      select: { id: true, slug: true, status: true, publishedAt: true, updatedAt: true },
    });

    logger.info({ pageId: page.id, status }, 'Page status changed');
    revalidateInBackground({
      tags: [tags.page(page.slug), tags.pageList, tags.sitemap],
      paths: [`/${page.slug}`],
    });
    res.json({ page });
  }),
);

// ---------------------------------------------------------------
// Footer navigation
// ---------------------------------------------------------------

const navLinkSchema = z.object({
  group: z.string().min(1).max(60),
  groupOrder: z.number().int().min(0).max(99).default(0),
  /**
   * A site-relative path or a full URL. Anything else — most importantly a
   * `javascript:` URL — is rejected here rather than relied on to be harmless
   * once React has rendered it into an href.
   */
  label: z.string().min(1).max(80),
  href: z
    .string()
    .min(1)
    .max(500)
    .refine(isAllowedNavHref, 'Link must start with /, https://, mailto: or tel:'),
  order: z.number().int().min(0).max(999).default(0),
  visible: z.boolean().default(true),
});

/**
 * Stray whitespace around a pasted link is invisible in the admin table but
 * makes the stored href differ from the one the validator approved.
 */
function trimNavLink<T extends { label: string; href: string; group: string }>(input: T): T {
  return { ...input, group: input.group.trim(), label: input.label.trim(), href: input.href.trim() };
}

adminRouter.get(
  '/nav',
  asyncHandler(async (_req, res) => {
    const links = await prisma.navLink.findMany({
      orderBy: [{ groupOrder: 'asc' }, { group: 'asc' }, { order: 'asc' }],
    });
    res.json({ links });
  }),
);

adminRouter.post(
  '/nav',
  asyncHandler(async (req, res) => {
    const input = navLinkSchema.parse(req.body);
    const link = await prisma.navLink.create({ data: trimNavLink(input) });
    // The footer is on every page, so this purges the whole site rather than
    // one path — a tag is the only thing that can express that.
    revalidateInBackground({ tags: [tags.footerNav] });
    res.status(201).json({ link });
  }),
);

adminRouter.put(
  '/nav/:id',
  asyncHandler(async (req, res) => {
    const input = navLinkSchema.parse(req.body);
    const existing = await prisma.navLink.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Link not found' });
      return;
    }
    const link = await prisma.navLink.update({
      where: { id: req.params.id },
      data: trimNavLink(input),
    });
    revalidateInBackground({ tags: [tags.footerNav] });
    res.json({ link });
  }),
);

/**
 * Persist a whole group's ordering in one write.
 *
 * Dragging a link up moves every link below it, so sending one request per
 * changed row would leave the footer in a half-reordered state if any single
 * request failed. The transaction makes the reorder all-or-nothing.
 */
adminRouter.patch(
  '/nav/reorder',
  asyncHandler(async (req, res) => {
    const { ids } = z.object({ ids: z.array(z.string()).max(200) }).parse(req.body);
    await prisma.$transaction(
      ids.map((id, order) => prisma.navLink.update({ where: { id }, data: { order } })),
    );
    revalidateInBackground({ tags: [tags.footerNav] });
    res.json({ ok: true });
  }),
);

adminRouter.delete(
  '/nav/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await prisma.navLink.delete({ where: { id: req.params.id } });
    revalidateInBackground({ tags: [tags.footerNav] });
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
  /// The Author row that drives the Person node in the article's JSON-LD.
  authorId: z.string().optional().nullable(),
  /**
   * Denormalised byline.
   *
   * An empty string has to become "absent" before zod sees it, or `.default()`
   * never fires — an empty value is still a value, and it silently overwrites
   * the byline with nothing. A form that posts every field on every save sends
   * exactly that for any input the author left blank.
   */
  authorName: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().max(120).default('Onsys Technologies'),
  ),
  readMinutes: z.number().int().min(1).max(120).default(5),
  coverImage: z.string().max(500).optional().nullable(),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  ogImage: z.string().max(500).optional().nullable(),
  canonicalUrl: z.string().max(500).optional().nullable(),
  noindex: z.boolean().default(false),
  faqs: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
});

/**
 * Markdown is the source of truth when supplied; HTML is derived and sanitised.
 *
 * Pasted HTML additionally goes through normalisePastedHtml, which is what
 * makes "draft it in ChatGPT, paste it in, save" produce something that
 * matches the rest of the blog. Done here rather than only in the editor so it
 * applies however the content arrives — a direct API call included.
 *
 * Markdown does not need it: marked emits clean, predictable HTML, and its
 * headings are the author's own rather than a foreign document's.
 */
function resolveBody(input: z.infer<typeof postSchema>): string {
  if (input.bodyMarkdown) return sanitise(marked.parse(input.bodyMarkdown, { async: false }) as string);
  if (input.bodyHtml) return normalisePastedHtml(input.bodyHtml, sanitise);
  return '';
}


/**
 * Keep the denormalised byline in step with the linked Author.
 *
 * The two can only disagree by someone editing one and not the other, and the
 * copy that renders under every article is the denormalised one — so it is
 * derived here rather than trusted from the request.
 */
async function withAuthorName<T extends { authorId?: string | null; authorName: string }>(
  data: T,
): Promise<T> {
  if (!data.authorId) return data;
  const author = await prisma.author.findUnique({
    where: { id: data.authorId },
    select: { name: true },
  });
  return author ? { ...data, authorName: author.name } : data;
}

// ---------------------------------------------------------------
// Authors
// ---------------------------------------------------------------

/**
 * A form posts "" for every field left blank, and an empty string is not a
 * valid URL — so it has to become null before the URL check runs, or clearing
 * a LinkedIn field would fail validation instead of clearing it.
 */
const blankToNull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : v), schema);

const authorSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens'),
  name: z.string().min(1, 'Name is required').max(120),
  role: blankToNull(z.string().max(160).nullable().optional()),
  bio: blankToNull(z.string().max(4000).nullable().optional()),
  photo: blankToNull(z.string().max(500).nullable().optional()),
  /// Rendered as chips on the profile and emitted as schema.org hasCredential.
  credentials: z.array(z.string().min(1).max(200)).max(20).default([]),
  /// sameAs on the Person node. Without at least one the author entity is
  /// unverifiable, which is most of the point of having authors at all.
  linkedIn: blankToNull(z.string().url('Enter a full URL').max(500).nullable().optional()),
  website: blankToNull(z.string().url('Enter a full URL').max(500).nullable().optional()),
});

adminRouter.get(
  '/authors',
  asyncHandler(async (_req, res) => {
    const authors = await prisma.author.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        role: true,
        linkedIn: true,
        photo: true,
        _count: { select: { posts: true } },
      },
    });
    res.json({ authors });
  }),
);

adminRouter.get(
  '/authors/:id',
  asyncHandler(async (req, res) => {
    const author = await prisma.author.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { posts: true } } },
    });
    if (!author) {
      res.status(404).json({ error: 'Author not found' });
      return;
    }
    res.json({ author });
  }),
);

adminRouter.post(
  '/authors',
  asyncHandler(async (req, res) => {
    const input = authorSchema.parse(req.body);

    const clash = await prisma.author.findUnique({ where: { slug: input.slug } });
    if (clash) {
      // Caught here rather than let through as a unique-constraint 500, which
      // would surface to the editor as "something went wrong".
      res.status(409).json({ error: `The slug "${input.slug}" is already in use.` });
      return;
    }

    const author = await prisma.author.create({ data: input });
    logger.info({ authorId: author.id, slug: author.slug }, 'Author created');
    res.status(201).json({ author });
  }),
);

adminRouter.put(
  '/authors/:id',
  asyncHandler(async (req, res) => {
    const input = authorSchema.parse(req.body);

    const existing = await prisma.author.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Author not found' });
      return;
    }

    const clash = await prisma.author.findUnique({ where: { slug: input.slug } });
    if (clash && clash.id !== existing.id) {
      res.status(409).json({ error: `The slug "${input.slug}" is already in use.` });
      return;
    }

    /**
     * The name is denormalised onto every post as authorName, which is what
     * renders under the article. Renaming an author has to carry through, or
     * the byline keeps showing the old name until each post is re-saved.
     */
    const author = await prisma.$transaction(async (tx) => {
      const updated = await tx.author.update({ where: { id: req.params.id }, data: input });
      if (existing.name !== input.name) {
        await tx.post.updateMany({
          where: { authorId: updated.id },
          data: { authorName: input.name },
        });
      }
      return updated;
    });

    logger.info({ authorId: author.id, renamed: existing.name !== input.name }, 'Author updated');
    revalidateInBackground({
      tags: [
        tags.author(author.slug),
        tags.author(existing.slug),
        // A rename rewrites the byline on every post, so the article pages and
        // the index have to be dropped too.
        ...(existing.name !== input.name ? [tags.postList] : []),
      ],
      paths: [`/about/${author.slug}`, ...(existing.name !== input.name ? ['/blog'] : [])],
    });
    res.json({ author });
  }),
);

adminRouter.delete(
  '/authors/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const author = await prisma.author.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { posts: true } } },
    });
    if (!author) {
      res.status(404).json({ error: 'Author not found' });
      return;
    }

    /**
     * Posts survive: the relation is SetNull and authorName is denormalised,
     * so the byline text stays on the article. What is lost is the Person node
     * in its JSON-LD and the link to /about/<slug>, which will then 404 — so
     * an author still holding posts has to be reassigned deliberately rather
     * than deleted by accident.
     */
    if (author._count.posts > 0) {
      res.status(409).json({
        error:
          `${author.name} is the author of ${author._count.posts} post(s). ` +
          'Reassign those posts to another author first — deleting now would leave them ' +
          'linking to a profile page that no longer exists.',
        postCount: author._count.posts,
      });
      return;
    }

    await prisma.author.delete({ where: { id: req.params.id } });
    logger.warn({ authorId: req.params.id, slug: author.slug }, 'Author deleted');
    res.json({ ok: true });
  }),
);

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
        ...(await withAuthorName(data)),
        bodyHtml: resolveBody(input),
        publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
        faqs: { create: faqs.map((f, i) => ({ ...f, order: i })) },
      },
      include: { faqs: true },
    });

    revalidateInBackground({
      tags: [tags.post(post.slug), tags.postList, tags.sitemap],
      paths: [`/blog/${post.slug}`, '/blog'],
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
          ...(await withAuthorName(data)),
          bodyHtml: resolveBody(input),
          publishedAt:
            data.status === 'PUBLISHED' ? existing.publishedAt ?? new Date() : existing.publishedAt,
          faqs: { create: faqs.map((f, i) => ({ ...f, order: i })) },
        },
        include: { faqs: true },
      });
    });

    revalidateInBackground({
      tags: [
        tags.post(post.slug),
        tags.post(existing.slug),
        tags.postList,
        tags.sitemap,
      ],
      paths: [`/blog/${post.slug}`, `/blog/${existing.slug}`, '/blog'],
    });
    res.json({ post });
  }),
);

/**
 * Change only the status.
 *
 * The full PUT requires every field the post schema declares, which is the
 * wrong shape for a dropdown in a list — it would mean fetching the post,
 * merging one value and posting it all back, and any field the list did not
 * carry would be silently blanked on the way through.
 *
 * publishedAt is set the first time a post goes live and kept thereafter, so
 * unpublishing and republishing does not rewrite the original publication
 * date and reset its age in the index.
 */
adminRouter.patch(
  '/posts/:id/status',
  asyncHandler(async (req, res) => {
    const { status } = z.object({ status: contentStatus }).parse(req.body);

    const existing = await prisma.post.findUnique({
      where: { id: req.params.id },
      select: { publishedAt: true },
    });
    if (!existing) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    const post = await prisma.post.update({
      where: { id: req.params.id },
      data: {
        status,
        publishedAt:
          status === 'PUBLISHED' ? existing.publishedAt ?? new Date() : existing.publishedAt,
      },
      select: { id: true, slug: true, status: true, publishedAt: true, updatedAt: true },
    });

    logger.info({ postId: post.id, status }, 'Post status changed');
    revalidateInBackground({
      tags: [tags.post(post.slug), tags.postList, tags.sitemap],
      paths: [`/blog/${post.slug}`, '/blog'],
    });
    res.json({ post });
  }),
);

adminRouter.delete(
  '/posts/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const post = await prisma.post.delete({ where: { id: req.params.id } });
    revalidateInBackground({
      tags: [tags.post(post.slug), tags.postList, tags.sitemap],
      paths: [`/blog/${post.slug}`, '/blog'],
    });
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

/**
 * Delete conversations that have not been touched in a while.
 *
 * Chat transcripts hold names, email addresses, IPs and whatever a visitor
 * chose to type, so keeping them forever is a liability rather than an asset.
 * Messages go with the session through the cascade, and so do the embeddings
 * chunks — no orphans to sweep up afterwards.
 *
 * Open conversations are never touched regardless of age: a session someone is
 * still waiting on is not old, however long it has been sitting there.
 */
adminRouter.post(
  '/chat/purge',
  asyncHandler(async (req, res) => {
    const { olderThanDays } = purgeChatSchema.parse(req.body);
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60_000);

    const { count } = await prisma.chatSession.deleteMany({
      where: {
        updatedAt: { lt: cutoff },
        status: { in: ['CLOSED', 'BOT'] },
      },
    });

    logger.info({ olderThanDays, count }, 'Purged old chat sessions');
    res.json({ ok: true, deleted: count, olderThanDays });
  }),
);

/** How many sessions a purge would remove, so the button can say so first. */
adminRouter.get(
  '/chat/purge-preview',
  asyncHandler(async (req, res) => {
    const { olderThanDays } = purgeChatSchema.parse(req.query);
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60_000);

    const count = await prisma.chatSession.count({
      where: { updatedAt: { lt: cutoff }, status: { in: ['CLOSED', 'BOT'] } },
    });

    res.json({ count, olderThanDays });
  }),
);

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
