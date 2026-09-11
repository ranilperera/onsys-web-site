/**
 * Repair two artefacts of the WordPress import.
 *
 *   npm run fix:imported -- --dry-run
 *   npm run fix:imported
 *
 * 1. Title suffixes. Imported titles still carry the old theme's suffix
 *    ("… - Onsys Technologies"), and the layout appends its own brand close,
 *    so search results read "… - Onsys Technologies | Onsys". Stripping it
 *    frees roughly 22 characters before Google truncates the title.
 *
 * 2. Sitemap lastmod. The import wrote every row in one transaction, so every
 *    Post and Page shares an updatedAt to the second. A sitemap where all
 *    fifty entries changed at the same instant tells a crawler nothing about
 *    what is actually fresh. Where a publishedAt exists it is the better
 *    signal, so updatedAt is moved back to it.
 *
 * 3. Duplicated words. The import carried "Remote Remote Database Support"
 *    into both the excerpt and the body of the savings article, and the
 *    excerpt is what the meta description falls back to, so the stutter was
 *    showing in search results.
 *
 * 4. Missing meta descriptions. A post with no seoDescription falls back to
 *    its excerpt, which on an imported article is the opening 300-odd words —
 *    a description Google truncates mid-sentence. Only the articles listed in
 *    META_DESCRIPTIONS below get one, because a description is editorial and
 *    generating them wholesale is how you end up with fifty bland duplicates.
 *
 * Rows edited since the import are left alone — that is the whole point of
 * the freshness signal, and overwriting a genuine edit would destroy it.
 */
import { prisma } from '../lib/prisma';

/**
 * Longest first: "- Onsys Technologies Pty Ltd" has to be tried before
 * "- Onsys Technologies", or the shorter pattern leaves " Pty Ltd" behind.
 */
const TITLE_SUFFIXES = [
  /\s*[-–—|]\s*Onsys Technologies Pty Ltd\s*$/i,
  /\s*[-–—|]\s*Onsys Technologies\s*$/i,
  /\s*[-–—|]\s*Onsys Pty Ltd\s*$/i,
  /\s*[-–—|]\s*Onsys\s*$/i,
];

function stripSuffix(title: string): string {
  let out = title;
  for (const pattern of TITLE_SUFFIXES) out = out.replace(pattern, '');
  return out.trim();
}

/**
 * How close two timestamps have to be to count as "written by the same import".
 * The import loop takes a few seconds across fifty posts, so a strict equality
 * check would miss most of them.
 */
const IMPORT_WINDOW_MS = 10 * 60_000;

/**
 * Words the import duplicated. Matched case-insensitively on a word boundary
 * so "Remote Remote" is caught but "had had" in quoted prose is not — this
 * list is deliberately explicit rather than a general doubled-word regex,
 * which would rewrite legitimate English.
 */
const DOUBLED_WORDS: Array<[RegExp, string]> = [
  [/\bRemote\s+Remote\b/gi, 'Remote'],
];

/**
 * Hand-written meta descriptions, by slug.
 *
 * Only for articles whose fallback is demonstrably bad. Each is written to sit
 * inside the ~155 character band Google renders, and to say what the article
 * actually delivers rather than repeating its opening sentence.
 */
const META_DESCRIPTIONS: Record<string, string> = {
  'how-to-save-with-onsys-remote-database-services':
    'How Australian businesses cut DBA costs by up to 50% with remote database support — what the model covers, where the savings come from, and when it fits.',
};

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`\nRepairing imported content${dryRun ? ' (dry run — nothing will be written)' : ''}\n`);

  // --- 1. Title suffixes ---------------------------------------------------
  const posts = await prisma.post.findMany({
    select: { id: true, slug: true, title: true, seoTitle: true, publishedAt: true, updatedAt: true },
  });

  const titleFixes = posts
    .map((p) => ({
      post: p,
      title: stripSuffix(p.title),
      seoTitle: p.seoTitle ? stripSuffix(p.seoTitle) : null,
    }))
    .filter((f) => f.title !== f.post.title || f.seoTitle !== f.post.seoTitle);

  console.log(`Titles carrying a legacy suffix: ${titleFixes.length}`);
  for (const f of titleFixes) {
    console.log(`  · ${f.post.title}`);
    console.log(`    → ${f.title}`);
  }

  if (!dryRun) {
    for (const f of titleFixes) {
      await prisma.post.update({
        where: { id: f.post.id },
        data: { title: f.title, ...(f.seoTitle !== null ? { seoTitle: f.seoTitle } : {}) },
      });
    }
  }

  // --- 2. Sitemap freshness ------------------------------------------------
  // Find the timestamp the bulk of the rows share, and treat only rows within
  // the window around it as untouched-since-import.
  const counts = new Map<number, number>();
  for (const p of posts) {
    const bucket = Math.floor(p.updatedAt.getTime() / IMPORT_WINDOW_MS);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }

  const [importBucket, bucketSize] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];

  if (importBucket === null || bucketSize < 3) {
    console.log('\nNo bulk-import timestamp cluster found — updatedAt already looks organic.\n');
  } else {
    const clustered = posts.filter(
      (p) => Math.floor(p.updatedAt.getTime() / IMPORT_WINDOW_MS) === importBucket,
    );
    const datable = clustered.filter(
      (p) => p.publishedAt && p.publishedAt.getTime() < p.updatedAt.getTime(),
    );

    console.log(`\nPosts sharing the import timestamp: ${clustered.length}`);
    console.log(`  of those with an earlier publishedAt to restore: ${datable.length}`);
    console.log(`  left alone (edited since, or no publish date): ${posts.length - datable.length}`);

    if (!dryRun) {
      for (const p of datable) {
        // updatedAt is @updatedAt, so Prisma overwrites it on a normal update.
        // Raw SQL is the only way to set it deliberately.
        await prisma.$executeRaw`
          UPDATE posts SET "updatedAt" = ${p.publishedAt} WHERE id = ${p.id}
        `;
      }
    }
  }

  // --- 3. Duplicated words ------------------------------------------------
  const wordFixes: Array<{ id: string; slug: string; field: string }> = [];
  const candidates = await prisma.post.findMany({
    select: { id: true, slug: true, title: true, excerpt: true, bodyHtml: true, seoTitle: true, seoDescription: true },
  });

  for (const post of candidates) {
    const patch: Record<string, string> = {};
    for (const field of ['title', 'excerpt', 'bodyHtml', 'seoTitle', 'seoDescription'] as const) {
      const value = post[field];
      if (typeof value !== 'string' || !value) continue;
      let next = value;
      for (const [pattern, replacement] of DOUBLED_WORDS) next = next.replace(pattern, replacement);
      if (next !== value) {
        patch[field] = next;
        wordFixes.push({ id: post.id, slug: post.slug, field });
      }
    }
    if (Object.keys(patch).length && !dryRun) {
      await prisma.post.update({ where: { id: post.id }, data: patch });
    }
  }

  if (wordFixes.length) {
    console.log(`\n${dryRun ? 'Would fix' : '✓ Fixed'} ${wordFixes.length} duplicated word(s):`);
    for (const f of wordFixes) console.log(`  · /blog/${f.slug} (${f.field})`);
  } else {
    console.log('\n✓ No duplicated words found.');
  }

  // --- 4. Missing meta descriptions ---------------------------------------
  const metaFixes: string[] = [];
  for (const [slug, description] of Object.entries(META_DESCRIPTIONS)) {
    const post = await prisma.post.findUnique({
      where: { slug },
      select: { id: true, seoDescription: true },
    });
    if (!post) {
      console.log(`\n⚠ No post at /blog/${slug} — meta description skipped.`);
      continue;
    }
    // An existing description is somebody's editorial decision; leave it.
    if (post.seoDescription && post.seoDescription.trim()) continue;
    metaFixes.push(slug);
    if (!dryRun) {
      await prisma.post.update({ where: { id: post.id }, data: { seoDescription: description } });
    }
  }

  if (metaFixes.length) {
    console.log(`\n${dryRun ? 'Would add' : '✓ Added'} ${metaFixes.length} meta description(s):`);
    for (const slug of metaFixes) {
      console.log(`  · /blog/${slug} (${META_DESCRIPTIONS[slug].length} chars)`);
    }
  }

  // --- 5. Placeholder audit (reported, never auto-edited) ------------------
  // Rewriting a published article is an editorial decision, so this only
  // reports. Inventing replacement prose for a technical post is exactly the
  // kind of "helpful" that puts something wrong in front of a customer.
  const suspects = await prisma.post.findMany({
    where: {
      OR: [
        { bodyHtml: { contains: 'Pharm Ltd', mode: 'insensitive' } },
        { bodyHtml: { contains: 'Lorem', mode: 'insensitive' } },
        { bodyHtml: { contains: 'placeholder', mode: 'insensitive' } },
        { bodyHtml: { contains: 'sample text', mode: 'insensitive' } },
      ],
    },
    select: { slug: true, title: true, status: true },
  });

  if (suspects.length) {
    console.log(`\n⚠ ${suspects.length} post(s) contain placeholder text — these need a human:`);
    for (const s of suspects) console.log(`  · [${s.status}] /blog/${s.slug}`);
    console.log('  Rewrite or unpublish in /admin/posts. Nothing has been changed here.');
  } else {
    console.log('\n✓ No placeholder text found in any post.');
  }

  console.log(dryRun ? '\nDry run complete — re-run without --dry-run to apply.\n' : '\n✓ Done\n');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('✗ Failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
