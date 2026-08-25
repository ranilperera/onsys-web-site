/**
 * Create or reset an admin user.
 *   npm run create:admin -- --email=you@onsys.com.au --name="Your Name" --password='...'
 * Omit --password to be prompted (safer: keeps it out of shell history).
 */
import readline from 'node:readline/promises';
import argon2 from 'argon2';
import { prisma } from '../lib/prisma';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const get = (n: string) => args.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');

  const email = get('email');
  const name = get('name') || 'Administrator';
  let password = get('password');
  const role = (get('role') || 'ADMIN').toUpperCase() as 'ADMIN' | 'EDITOR';

  if (!email) {
    console.error(`Usage:
  npm run create:admin -- --email=you@onsys.com.au --name="Your Name" [--role=ADMIN]

On Windows PowerShell npm eats the flags before the script sees them
("Unknown cli config"). Run the script directly instead:
  npx tsx src/scripts/create-admin.ts --email=you@onsys.com.au --name="Your Name" --role=ADMIN

Omit --password to be prompted, which keeps it out of your shell history.`);
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
    create: { email: email.toLowerCase(), name, passwordHash, role },
    update: { passwordHash, name, role },
  });

  console.log(`✓ Admin user ready: ${user.email} (${user.role})`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('✗ Failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
