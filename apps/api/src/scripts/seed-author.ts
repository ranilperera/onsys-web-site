/**
 * Create the site's byline and attach every post to it.
 *
 *   npm run seed:author -- --dry-run
 *   npm run seed:author
 *   npm run seed:author -- --role="Principal DBA"
 *   npm run seed:author -- --prune          # also drop authors left with no posts
 *
 * Posts carried three inconsistent corporate bylines, and their JSON-LD named
 * the Organization as author. An Organization in an author slot resolves to no
 * entity, so none of the expertise signals in the writing attach to anybody.
 *
 * Idempotent: re-running updates the author in place and re-points any post
 * that has drifted, without touching anything already correct.
 */
import { prisma } from '../lib/prisma';

/**
 * The site's byline.
 *
 * The full name matters: initials and handles are name strings a crawler
 * cannot corroborate, whereas a full name paired with a matching LinkedIn
 * profile in `sameAs` is what lets a search engine resolve an entity and
 * attach expertise signals to it. The name here and the name on the linked
 * profile should stay identical for the same reason.
 *
 * `role` and `bio` are shown publicly under every article. They are claims
 * about a real person, so they are left for the business to confirm rather
 * than invented here — the script warns while they are unset.
 */
const DEFAULT_AUTHOR = {
  slug: 'ranil-perera',
  name: 'Ranil Perera',
  role: null as string | null,
  bio:
    'Ranil Perera works with Australian organisations running production SQL Server, '
    + 'Oracle, PostgreSQL and MySQL estates, and writes here about the incidents, '
    + 'migrations and health checks that come out of that work.',
  credentials: [] as string[],
  linkedIn: 'https://www.linkedin.com/in/ranilpperera/' as string | null,
  website: null as string | null,
};

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const get = (n: string) => args.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');
  const dryRun = args.includes('--dry-run');

  const author = {
    ...DEFAULT_AUTHOR,
    ...(get('slug') ? { slug: get('slug')! } : {}),
    ...(get('name') ? { name: get('name')! } : {}),
    ...(get('role') ? { role: get('role')! } : {}),
    ...(get('linkedin') ? { linkedIn: get('linkedin')! } : {}),
  };

  console.log(`\nAuthor identity${dryRun ? ' (dry run — nothing will be written)' : ''}\n`);
  console.log(`  slug     : ${author.slug}`);
  console.log(`  name     : ${author.name}`);
  console.log(`  role     : ${author.role}`);
  console.log(`  linkedIn : ${author.linkedIn ?? '— none, so sameAs will be omitted'}`);
  console.log(`  page     : /about/${author.slug}\n`);

  if (!author.linkedIn) {
    console.log('  ⚠ Without a linkedIn (or website) URL the Person node has no sameAs, which is');
    console.log('    most of what makes an author entity verifiable. Re-run with --linkedin=...');
    console.log('    once there is a profile to point at.\n');
  }

  if (!author.role) {
    console.log('  ⚠ No job title set, so the byline and the Person schema omit one. A title is');
    console.log('    a real claim about a real person, so it is not guessed here. Set it with:');
    console.log(`      npm run seed:author -- --role="Your Title"\n`);
  }

  console.log('  ⚠ The bio appears publicly under every article. Read it before publishing —');
  console.log('    it describes a named individual and nobody has approved this wording.\n');

  const posts = await prisma.post.findMany({
    select: { id: true, slug: true, authorName: true, authorId: true },
  });

  const distinctBylines = [...new Set(posts.map((p) => p.authorName))];
  console.log(`Posts: ${posts.length}, currently carrying ${distinctBylines.length} distinct byline(s):`);
  for (const b of distinctBylines) console.log(`  · ${b}`);

  const needsUpdate = posts.filter((p) => p.authorId === null || p.authorName !== author.name);
  console.log(`\nPosts to re-point: ${needsUpdate.length}\n`);

  if (dryRun) {
    console.log('Dry run complete — re-run without --dry-run to apply.\n');
    await prisma.$disconnect();
    return;
  }

  const record = await prisma.author.upsert({
    where: { slug: author.slug },
    create: author,
    update: {
      name: author.name,
      role: author.role,
      bio: author.bio,
      linkedIn: author.linkedIn,
      website: author.website,
    },
  });

  // authorName is denormalised so a post still renders a byline if the Author
  // row is ever deleted; both are set together to keep them in step.
  const { count } = await prisma.post.updateMany({
    where: { OR: [{ authorId: null }, { authorName: { not: author.name } }] },
    data: { authorId: record.id, authorName: author.name },
  });

  console.log(`✓ Author "${record.name}" ready at /about/${record.slug}`);
  console.log(`✓ ${count} post(s) re-pointed\n`);

  /**
   * Authors left holding nothing.
   *
   * Changing the slug creates a new row rather than renaming the old one, so
   * an earlier byline is left behind with zero posts — and its /about/<slug>
   * page still renders, still gets crawled, and still says someone writes here
   * who does not. Reported rather than deleted by default: removing an author
   * row is not something a seed script should decide on its own.
   */
  const orphans = await prisma.author.findMany({
    where: { id: { not: record.id }, posts: { none: {} } },
    select: { id: true, slug: true, name: true },
  });

  if (orphans.length) {
    console.log(`⚠ ${orphans.length} author(s) now have no posts:`);
    for (const o of orphans) console.log(`  · ${o.name} — /about/${o.slug}`);

    if (args.includes('--prune')) {
      await prisma.author.deleteMany({ where: { id: { in: orphans.map((o) => o.id) } } });
      console.log('  Removed (--prune).\n');
    } else {
      console.log('  Re-run with --prune to remove them, or leave them if they are intentional.\n');
    }
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('✗ Failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
