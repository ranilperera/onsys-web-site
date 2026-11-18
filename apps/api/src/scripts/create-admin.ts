/**
 * Create or reset a console account.
 *   npm run create:admin -- --email=you@onsys.com.au --name="Your Name" --password='...'
 * Omit --password to be prompted (safer: keeps it out of shell history).
 *
 * The console's own Accounts screen (/admin/users) is the normal way to do
 * this now. This script stays for the two cases that screen cannot cover: the
 * very first administrator on a fresh database, and getting back in when
 * nobody can sign in to use it.
 */
import readline from 'node:readline/promises';
import argon2 from 'argon2';
import { ROLES, type Role } from '@onsys/shared';
import { prisma } from '../lib/prisma';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const get = (n: string) => args.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');

  const email = get('email');
  const name = get('name') || 'Administrator';
  let password = get('password');
  const role = (get('role') || 'ADMIN').toUpperCase() as Role;
  /// The byline an author writes under, by slug — ids are not memorable and
  /// this is typed by hand on a server.
  const authorSlug = get('author');

  if (!email) {
    console.error(`Usage:
  npm run create:admin -- --email=you@onsys.com.au --name="Your Name" [--role=ADMIN]

Roles: ${ROLES.join(', ')}. An AUTHOR writes blog articles under one byline and
can reach nothing else, so it needs that byline:

  npx tsx src/scripts/create-admin.ts --email=a.writer@onsys.com.au \\
      --name="A Writer" --role=AUTHOR --author=<author-slug>

On Windows PowerShell npm eats the flags before the script sees them
("Unknown cli config"). Run the script directly instead:
  npx tsx src/scripts/create-admin.ts --email=you@onsys.com.au --name="Your Name" --role=ADMIN

Omit --password to be prompted, which keeps it out of your shell history.`);
    process.exit(1);
  }

  if (!ROLES.includes(role)) {
    console.error(`✗ Unknown role "${role}". One of: ${ROLES.join(', ')}.`);
    process.exit(1);
  }

  /*
   * An author with no byline can sign in and do nothing: the post list is
   * scoped to a byline, and creating an article is refused without one. Better
   * to fail here than to hand somebody a login that looks broken.
   */
  let authorId: string | null = null;
  if (authorSlug) {
    const author = await prisma.author.findUnique({ where: { slug: authorSlug } });
    if (!author) {
      const known = await prisma.author.findMany({ select: { slug: true, name: true }, orderBy: { name: 'asc' } });
      console.error(`✗ No byline with the slug "${authorSlug}".`);
      console.error(
        known.length
          ? `  Known bylines: ${known.map((a) => `${a.slug} (${a.name})`).join(', ')}`
          : '  There are no bylines yet — create one in /admin/authors first.',
      );
      process.exit(1);
    }
    authorId = author.id;
  } else if (role === 'AUTHOR') {
    console.error('✗ An AUTHOR account needs --author=<author-slug>, the byline it writes under.');
    process.exit(1);
  }

  if (!password) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    password = await rl.question('Password (min 12 chars): ');
    rl.close();
  }

  if (!password || password.length < 12) {
    console.error('✗ Password must be at least 12 characters.');
    process.exit(1);
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    create: { email: email.toLowerCase(), name, passwordHash, role, authorId },
    // A password set here is one somebody chose deliberately, so it does not
    // carry the "change it before you start" lock that the console's generated
    // temporary passwords do. Clearing the flag matters: this script is also
    // the way back in when a forced change has gone wrong.
    update: { passwordHash, name, role, authorId, mustChangePassword: false, disabledAt: null },
  });

  console.log(`✓ Console account ready: ${user.email} (${user.role})`);
  if (user.role === 'AUTHOR') {
    console.log(`  Byline: ${authorSlug}. They can write blog articles and nothing else.`);
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('✗ Failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
