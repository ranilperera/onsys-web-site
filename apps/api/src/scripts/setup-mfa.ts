/**
 * Enrol an authenticator app for an admin from the command line, and reset MFA.
 *
 *   npm run setup:mfa -- --email=you@onsys.com.au
 *   npm run setup:mfa -- --email=you@onsys.com.au --reset
 *
 * This is the break-glass path. Sign-in requires a second factor, and for an
 * admin with no authenticator that factor is an emailed code — so a Graph
 * outage would otherwise lock every administrator out of the console with no
 * way back in. Anyone who can run this already has a shell on the VM and the
 * database credentials, so it grants nothing they did not already have.
 *
 * --reset clears the authenticator and recovery codes for an admin who has
 * lost their phone and used up their recovery codes.
 */
import QRCode from 'qrcode';
import { prisma } from '../lib/prisma';
import {
  newTotpSecret,
  totpEnrolmentUri,
  verifyTotp,
  generateRecoveryCodes,
  hashRecoveryCode,
} from '../lib/totp';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const get = (n: string) => args.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');
  const has = (n: string) => args.includes(`--${n}`);

  const email = get('email');
  if (!email) {
    console.error(`Usage:
  npm run setup:mfa -- --email=you@onsys.com.au           enrol an authenticator app
  npm run setup:mfa -- --email=you@onsys.com.au --reset   clear it and start again

Inside Docker:
  docker compose -f docker-compose.prod.yml exec api \\
    npm run setup:mfa -w @onsys/api -- --email=you@onsys.com.au`);
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    console.error(`✗ No admin found with the email ${email}.`);
    process.exit(1);
  }

  if (has('reset')) {
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: null, totpEnabledAt: null, recoveryCodes: [] },
    });
    console.log(`✓ Authenticator and recovery codes cleared for ${user.email}.`);
    console.log('  Their next sign-in will use an emailed code.');
    await prisma.$disconnect();
    return;
  }

  if (user.totpEnabledAt) {
    console.error(
      `✗ ${user.email} already has an authenticator app.\n  Re-run with --reset first if they have lost it.`,
    );
    process.exit(1);
  }

  const secret = newTotpSecret();
  const uri = totpEnrolmentUri(secret, user.email);

  console.log(`\nScan this with Microsoft Authenticator, Google Authenticator or 1Password:\n`);
  console.log(await QRCode.toString(uri, { type: 'terminal', small: true }));
  console.log(`Or enter the key by hand: ${secret}\n`);

  const readline = await import('node:readline/promises');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = await rl.question('Enter the 6-digit code the app shows: ');
  rl.close();

  // Confirm before switching it on. Storing a secret the app never actually
  // received would leave an admin facing a factor nobody can satisfy — the
  // exact lockout this script exists to prevent.
  if (!verifyTotp(secret, code)) {
    console.error('\n✗ That code is not right. Nothing has been changed — run this again.');
    process.exit(1);
  }

  const recoveryCodes = generateRecoveryCodes();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      totpSecret: secret,
      totpEnabledAt: new Date(),
      recoveryCodes: recoveryCodes.map(hashRecoveryCode),
    },
  });

  console.log(`\n✓ Authenticator enabled for ${user.email}.\n`);
  console.log('Recovery codes — each works once, and this is the only time they are shown:\n');
  for (const c of recoveryCodes) console.log(`    ${c}`);
  console.log('\nStore them somewhere other than the phone holding the authenticator.\n');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('✗ Failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
