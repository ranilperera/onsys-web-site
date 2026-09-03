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

  // --- 3. Placeholder audit (reported, never auto-edited) ------------------
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
