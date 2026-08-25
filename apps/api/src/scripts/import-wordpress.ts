/**
 * WordPress → Postgres importer.
 *
 * Two input modes:
 *
 *   1. REST API (default) — reads https://<site>/wp-json/wp/v2/{posts,pages,categories}.
 *      Works against any WordPress with the REST API enabled (it is, by default).
 *
 *        npm run import:wp -- --source=https://www.onsys.com.au
 *
 *   2. WXR export file — Tools → Export → All content in wp-admin.
 *      Use this if the REST API is disabled or behind auth.
 *
 *        npm run import:wp -- --file=./onsys.WordPress.xml
 *
 * Flags:
 *   --dry-run        Parse and report, write nothing.
 *   --status=DRAFT   Import status (default DRAFT so you can review before publishing).
 *   --limit=50       Cap the number of posts (useful for a first trial run).
 *
 * The importer is idempotent: posts are matched on `legacyUrl`, so re-running
 * updates rather than duplicating. Every imported post also gets a 301 from its
 * old WordPress path to the new one.
 */
import fs from 'node:fs/promises';
import DOMPurify from 'isomorphic-dompurify';
import { prisma } from '../lib/prisma';

interface WpRendered {
  rendered: string;
}

interface WpPost {
  id: number;
  date: string;
  slug: string;
  status: string;
  link: string;
  title: WpRendered;
  content: WpRendered;
  excerpt: WpRendered;
  categories?: number[];
  yoast_head_json?: {
    title?: string;
    description?: string;
    og_image?: Array<{ url: string }>;
    canonical?: string;
  };
  _embedded?: { 'wp:featuredmedia'?: Array<{ source_url?: string }> };
}

interface WpCategory {
  id: number;
  slug: string;
  name: string;
  description: string;
}

interface Options {
  source?: string;
  file?: string;
  dryRun: boolean;
  status: 'DRAFT' | 'PUBLISHED';
  limit?: number;
  postsOnly: boolean;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const get = (name: string): string | undefined =>
    args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

  const status = (get('status') || 'DRAFT').toUpperCase();
  if (status !== 'DRAFT' && status !== 'PUBLISHED') {
    throw new Error('--status must be DRAFT or PUBLISHED');
  }

  return {
    source: get('source'),
    file: get('file'),
    dryRun: args.includes('--dry-run'),
    status,
    limit: get('limit') ? Number(get('limit')) : undefined,
    postsOnly: args.includes('--posts-only'),
  };
}

const decodeEntities = (text: string): string =>
  text
    .replace(/&#8217;|&#039;|&apos;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&hellip;/g, '…')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

const stripHtml = (html: string): string =>
  decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** WordPress emits a lot of editor cruft that we do not want in the new CMS. */
function cleanContent(html: string): string {
  const cleaned = html
    .replace(/<!--\s*\/?wp:[^>]*-->/g, '')        // Gutenberg block comments
    .replace(/\sclass="wp-[^"]*"/g, '')            // wp-* utility classes
    .replace(/<p>\s*(&nbsp;)?\s*<\/p>/g, '')       // empty paragraphs
    .replace(/\sstyle="[^"]*"/g, '')               // inline styles — our CSS owns presentation
    .trim();

  return DOMPurify.sanitize(cleaned, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h2', 'h3', 'h4',
      'blockquote', 'code', 'pre', 'img', 'table', 'thead', 'tbody', 'tr', 'th',
      'td', 'hr', 'figure', 'figcaption',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel', 'width', 'height'],
  });
}

const estimateReadMinutes = (html: string): number =>
  Math.max(1, Math.round(stripHtml(html).split(/\s+/).length / 220));

const pathFromUrl = (url: string): string => {
  try {
    return new URL(url).pathname;
  } catch {
    return url.startsWith('/') ? url : `/${url}`;
  }
};

async function fetchAll<T>(baseUrl: string, resource: string, limit?: number): Promise<T[]> {
  const results: T[] = [];
  let page = 1;

  for (;;) {
    const url = `${baseUrl.replace(/\/$/, '')}/wp-json/wp/v2/${resource}?per_page=100&page=${page}&_embed=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'OnsysImporter/1.0' } });

    if (res.status === 400 || res.status === 404) break; // past the last page
    if (!res.ok) throw new Error(`WordPress API returned ${res.status} for ${resource} page ${page}`);

    const batch = (await res.json()) as T[];
    if (!Array.isArray(batch) || batch.length === 0) break;

    results.push(...batch);
    if (limit && results.length >= limit) return results.slice(0, limit);

    const totalPages = Number(res.headers.get('x-wp-totalpages') || '1');
    if (page >= totalPages) break;
    page += 1;
  }

  return results;
}

/** Minimal WXR reader — enough for title/slug/content/date/category. */
async function parseWxr(filePath: string): Promise<{ posts: WpPost[]; categories: WpCategory[] }> {
  const xml = await fs.readFile(filePath, 'utf8');

  const items = xml.split('<item>').slice(1);
  const posts: WpPost[] = [];

  const pick = (block: string, tag: string): string => {
    const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`).exec(block);
    if (cdata) return cdata[1];
    const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(block);
    return plain ? plain[1] : '';
  };

  for (const [index, raw] of items.entries()) {
    const block = raw.split('</item>')[0];
    const postType = pick(block, 'wp:post_type');
    const status = pick(block, 'wp:status');
    if (postType !== 'post' && postType !== 'page') continue;
    if (status === 'trash') continue;

    const categoryMatch = /<category domain="category" nicename="([^"]+)"><!\[CDATA\[([\s\S]*?)\]\]><\/category>/.exec(block);

    posts.push({
      id: Number(pick(block, 'wp:post_id')) || index,
      date: pick(block, 'wp:post_date_gmt') || pick(block, 'pubDate') || new Date().toISOString(),
      slug: pick(block, 'wp:post_name'),
      status,
      link: pick(block, 'link'),
      title: { rendered: pick(block, 'title') },
      content: { rendered: pick(block, 'content:encoded') },
      excerpt: { rendered: pick(block, 'excerpt:encoded') },
      categories: [],
      // Stash the category slug so the caller can map it.
      ...(categoryMatch ? { _wxrCategory: { slug: categoryMatch[1], name: categoryMatch[2] } } : {}),
    } as WpPost);
  }

  const categorySlugs = new Map<string, string>();
  const categoryBlocks = xml.matchAll(
    /<category domain="category" nicename="([^"]+)"><!\[CDATA\[([\s\S]*?)\]\]><\/category>/g,
  );
  for (const m of categoryBlocks) categorySlugs.set(m[1], m[2]);

  const categories: WpCategory[] = Array.from(categorySlugs.entries()).map(([slug, name], i) => ({
    id: i + 1,
    slug,
    name,
    description: '',
  }));

  return { posts, categories };
}

const CATEGORY_COLOURS: Record<string, string> = {
  database: '#0E336A',
  'infrastructure-cloud': '#1E529D',
  'infrastructure-and-cloud': '#1E529D',
  cloud: '#1E529D',
  'software-development': '#0E7C4A',
  security: '#D87600',
  'cyber-security': '#D87600',
};

async function main(): Promise<void> {
  const opts = parseArgs();

  if (!opts.source && !opts.file) {
    console.error(`
Usage:
  npm run import:wp -- --source=https://www.onsys.com.au [--dry-run] [--posts-only] [--status=DRAFT] [--limit=50]
  npm run import:wp -- --file=./export.xml [--dry-run]
`);
    process.exit(1);
  }

  console.log(`\nOnsys WordPress importer`);
  console.log(`  Mode:    ${opts.file ? `WXR file (${opts.file})` : `REST API (${opts.source})`}`);
  console.log(`  Status:  ${opts.status}`);
  console.log(`  Dry run: ${opts.dryRun ? 'yes — nothing will be written' : 'no'}\n`);

  let wpPosts: WpPost[] = [];
  let wpCategories: WpCategory[] = [];

  if (opts.file) {
    const parsed = await parseWxr(opts.file);
    wpPosts = parsed.posts;
    wpCategories = parsed.categories;
  } else {
    console.log('Fetching categories…');
    wpCategories = await fetchAll<WpCategory>(opts.source!, 'categories');
    console.log(`  ${wpCategories.length} categories`);

    console.log('Fetching posts…');
    wpPosts = await fetchAll<WpPost>(opts.source!, 'posts', opts.limit);
    console.log(`  ${wpPosts.length} posts`);

    // Marketing pages are authored in the CMS now, so pulling them in as blog
    // posts would duplicate live pages under /blog/. Opt in only if you need them.
    if (opts.postsOnly) {
      console.log('Skipping pages (--posts-only)');
    } else {
      console.log('Fetching pages…');
      const wpPages = await fetchAll<WpPost>(opts.source!, 'pages');
      console.log(`  ${wpPages.length} pages (imported as posts for review; convert in the admin)`);
      wpPosts = wpPosts.concat(wpPages);
    }
  }

  if (opts.limit) wpPosts = wpPosts.slice(0, opts.limit);

  if (opts.dryRun) {
    console.log('\n--- DRY RUN — would import ---');
    for (const p of wpPosts) {
      console.log(`  • ${stripHtml(p.title.rendered)}  →  /blog/${p.slug}`);
    }
    console.log(`\n${wpPosts.length} items, ${wpCategories.length} categories. Nothing written.`);
    await prisma.$disconnect();
    return;
  }

  // --- Categories ---
  const categoryIdBySlug = new Map<string, string>();
  const categoryIdByWpId = new Map<number, string>();

  for (const cat of wpCategories) {
    if (cat.slug === 'uncategorised' || cat.slug === 'uncategorized') continue;

    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      create: {
        slug: cat.slug,
        name: decodeEntities(cat.name),
        description: stripHtml(cat.description) || null,
        color: CATEGORY_COLOURS[cat.slug] ?? '#0E336A',
      },
      update: { name: decodeEntities(cat.name) },
    });

    categoryIdBySlug.set(cat.slug, record.id);
    categoryIdByWpId.set(cat.id, record.id);
  }
  console.log(`\n✓ ${categoryIdBySlug.size} categories upserted`);

  // --- Posts ---
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const wp of wpPosts) {
    const title = decodeEntities(stripHtml(wp.title.rendered));
    if (!title || !wp.slug) {
      skipped += 1;
      continue;
    }

    const bodyHtml = cleanContent(wp.content.rendered || '');
    if (!bodyHtml) {
      console.log(`  ⚠ skipping "${title}" — empty body`);
      skipped += 1;
      continue;
    }

    const excerpt = stripHtml(wp.excerpt?.rendered || '').slice(0, 400) || stripHtml(bodyHtml).slice(0, 300);
    const legacyUrl = wp.link || undefined;

    const wxrCategory = (wp as unknown as { _wxrCategory?: { slug: string } })._wxrCategory;
    const categoryId =
      (wp.categories?.length ? categoryIdByWpId.get(wp.categories[0]) : undefined) ??
      (wxrCategory ? categoryIdBySlug.get(wxrCategory.slug) : undefined) ??
      null;

    const data = {
      title,
      excerpt,
      bodyHtml,
      status: opts.status,
      categoryId,
      readMinutes: estimateReadMinutes(bodyHtml),
      coverImage: wp._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? null,
      seoTitle: wp.yoast_head_json?.title ?? null,
      seoDescription: wp.yoast_head_json?.description ?? null,
      ogImage: wp.yoast_head_json?.og_image?.[0]?.url ?? null,
      legacyId: wp.id,
      publishedAt: opts.status === 'PUBLISHED' ? new Date(wp.date) : null,
    };

    const existing = legacyUrl
      ? await prisma.post.findFirst({ where: { OR: [{ legacyUrl }, { slug: wp.slug }] } })
      : await prisma.post.findUnique({ where: { slug: wp.slug } });

    if (existing) {
      await prisma.post.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.post.create({ data: { ...data, slug: wp.slug, legacyUrl: legacyUrl ?? null } });
      created += 1;
    }

    // Preserve link equity: old WordPress path → new /blog/<slug>.
    if (legacyUrl) {
      const fromPath = pathFromUrl(legacyUrl).replace(/\/$/, '') || '/';
      const toPath = `/blog/${wp.slug}`;
      if (fromPath !== toPath) {
        await prisma.redirect.upsert({
          where: { fromPath },
          create: { fromPath, toPath, statusCode: 301 },
          update: { toPath },
        });
      }
    }
  }

  console.log(`\n✓ Import complete`);
  console.log(`   created: ${created}`);
  console.log(`   updated: ${updated}`);
  console.log(`   skipped: ${skipped}`);
  console.log(`\nNext steps:`);
  console.log(`   1. Review imported content in the admin console (/admin/posts)`);
  console.log(`   2. Publish what looks right (imported as ${opts.status})`);
  console.log(`   3. Run "npm run embeddings:build" so the chatbot can cite the new content\n`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('\n✗ Import failed:', error instanceof Error ? error.message : error);
  await prisma.$disconnect();
  process.exit(1);
});
