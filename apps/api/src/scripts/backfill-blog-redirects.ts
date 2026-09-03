/**
 * Restore the legacy blog URLs.
 *
 *   npm run redirects:blog -- --dry-run
 *   npm run redirects:blog
 *
 * WordPress served posts at the site root (`/my-post`); this platform serves
 * them under `/blog/my-post`. The migration moved the content without leaving
 * anything at the old address, so roughly fifty ranking URLs have been
 * returning 404 — and a 404 sheds the link equity that took years to earn.
 *
 * Rows are written to the Redirect table rather than into middleware.ts, so
 * they can be corrected in /admin without a deploy.
 *
 * Idempotent: re-running changes nothing that already points somewhere.
 */
import { prisma } from '../lib/prisma';

/**
 * Paths middleware.ts already claims in its STATIC_REDIRECTS map.
 *
 * That map is consulted before the database, so a row written for one of these
 * would never be reached — and would quietly disagree with the code for anyone
 * reading /admin to work out where a URL goes.
 */
const MIDDLEWARE_OWNED = new Set<string>([
  '/how-to-save-with-onsys-remote-database-services',
  '/how-to-save-with-onsys-managed-database-services',
]);

interface Candidate {
  fromPath: string;
  toPath: string;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  console.log(`\nBackfilling legacy blog redirects${dryRun ? ' (dry run — nothing will be written)' : ''}\n`);

  const [posts, pages, existing] = await Promise.all([
    prisma.post.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, title: true } }),
    prisma.page.findMany({ select: { slug: true } }),
    prisma.redirect.findMany({ select: { fromPath: true, toPath: true } }),
  ]);

  const pageSlugs = new Set(pages.map((p) => `/${p.slug}`));
  const existingFrom = new Map(existing.map((r) => [r.fromPath, r.toPath]));

  const toWrite: Candidate[] = [];
  const skipped: Array<{ path: string; reason: string }> = [];

  for (const post of posts) {
    const fromPath = `/${post.slug}`;
    const toPath = `/blog/${post.slug}`;

    // --- Loop and collision guards -------------------------------------
    // Each of these has produced a real outage somewhere. A redirect that
    // points at itself is an infinite loop; one whose target is another
    // redirect's source is a chain that browsers give up on.

    if (fromPath === toPath) {
      skipped.push({ path: fromPath, reason: 'source and target are identical' });
      continue;
    }

    if (toPath.endsWith('/')) {
      skipped.push({ path: fromPath, reason: 'target has a trailing slash' });
      continue;
    }

    if (pageSlugs.has(fromPath)) {
      skipped.push({ path: fromPath, reason: 'a Page already serves this path' });
      continue;
    }

    if (MIDDLEWARE_OWNED.has(fromPath)) {
      skipped.push({ path: fromPath, reason: 'middleware.ts already redirects this' });
      continue;
    }

    if (existingFrom.has(fromPath)) {
      skipped.push({
        path: fromPath,
        reason: `already redirects to ${existingFrom.get(fromPath)}`,
      });
      continue;
    }

    if (existingFrom.has(toPath)) {
      skipped.push({ path: fromPath, reason: `target ${toPath} is itself redirected` });
      continue;
    }

    toWrite.push({ fromPath, toPath });
  }

  for (const s of skipped) console.log(`  · skip ${s.path} — ${s.reason}`);
  if (skipped.length) console.log('');

  if (toWrite.length === 0) {
    console.log('Nothing to add — every published post already has a legacy redirect.\n');
    await prisma.$disconnect();
    return;
  }

  for (const r of toWrite) console.log(`  + ${r.fromPath}  →  ${r.toPath}`);

  if (dryRun) {
    console.log(`\n${toWrite.length} redirects would be created. Re-run without --dry-run to apply.\n`);
    await prisma.$disconnect();
    return;
  }

  // upsert rather than createMany: a row added by hand in /admin between the
  // read above and this write should not fail the whole run.
  let created = 0;
  for (const r of toWrite) {
    await prisma.redirect.upsert({
      where: { fromPath: r.fromPath },
      create: { fromPath: r.fromPath, toPath: r.toPath, statusCode: 301 },
      update: {},
    });
    created += 1;
  }

  console.log(`\n✓ ${created} redirects in place, ${skipped.length} skipped\n`);
  console.log('Next: cross-check Search Console (Indexing → Pages → Not found) for slugs that');
  console.log('drifted during the import — those need adding by hand in /admin.\n');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('✗ Failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
