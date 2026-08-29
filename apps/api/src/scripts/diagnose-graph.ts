/**
 * Microsoft Graph mail diagnostic.
 *
 * Outbound mail is deliberately fire-and-forget — a failure must never break a
 * visitor's form submission — so a broken configuration is invisible from the
 * site and only ever appears in the API log. This walks the same path
 * email.service.ts takes and reports exactly which step fails.
 *
 *   docker compose -f docker-compose.prod.yml exec api \
 *     npx tsx apps/api/src/scripts/diagnose-graph.ts
 *
 * Add --to=someone@example.com to actually send a test message. Without it
 * nothing is sent and every check is read-only.
 */
import { ClientSecretCredential } from '@azure/identity';
import { env, graphConfigured } from '../lib/env';

const ok = (m: string) => console.log(`  [ OK ] ${m}`);
const no = (m: string) => console.log(`  [FAIL] ${m}`);
const info = (m: string) => console.log(`         ${m}`);

const arg = (name: string): string | undefined =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

/**
 * Describe a value without printing it. A trailing carriage return is the
 * failure this is really looking for: a .env saved on Windows and copied to the
 * VM keeps CRLF line endings, and Docker Compose's env_file parser passes the
 * \r straight through into the value. The secret then looks correct in every
 * editor and is rejected by Entra as malformed.
 */
function describe(name: string, value: string | undefined): boolean {
  if (!value) {
    no(`${name} is empty or unset`);
    return false;
  }
  const problems: string[] = [];
  if (/\r/.test(value)) problems.push('contains CR (\\r) — .env has CRLF line endings');
  if (value !== value.trim()) problems.push('has leading or trailing whitespace');
  if (/^["'].*["']$/.test(value)) problems.push('is wrapped in quotes that were not stripped');

  if (problems.length) {
    no(`${name}: ${problems.join('; ')}`);
    info(`raw length ${value.length}, trimmed length ${value.trim().length}`);
    info(`last 4 bytes: ${[...value.slice(-4)].map((c) => '0x' + c.charCodeAt(0).toString(16)).join(' ')}`);
    return false;
  }
  ok(`${name} looks clean (${value.length} chars)`);
  return true;
}

// apps/api compiles as CommonJS, so top-level await is not available. The body
// lives in main() rather than the file being renamed to .mts, which would make
// this the only script in the directory with a different extension.
async function main() {
console.log('\n=== 1. Values as the process actually sees them ===');
let clean = true;
clean = describe('GRAPH_TENANT_ID', env.GRAPH_TENANT_ID) && clean;
clean = describe('GRAPH_CLIENT_ID', env.GRAPH_CLIENT_ID) && clean;
clean = describe('GRAPH_CLIENT_SECRET', env.GRAPH_CLIENT_SECRET) && clean;
clean = describe('GRAPH_SENDER_UPN', env.GRAPH_SENDER_UPN) && clean;
clean = describe('LEAD_NOTIFY_TO', env.LEAD_NOTIFY_TO) && clean;
console.log(`         graphConfigured = ${graphConfigured}`);
if (!clean) {
  info('Fix the values above first — everything below will fail while they are malformed.');
  info("On the VM:  sed -i 's/\\r$//' /opt/onsys/.env   then  docker compose ... up -d api");
}

console.log('\n=== 2. Token acquisition ===');
let token = '';
try {
  const cred = new ClientSecretCredential(
    env.GRAPH_TENANT_ID!,
    env.GRAPH_CLIENT_ID!,
    env.GRAPH_CLIENT_SECRET!,
  );
  token = (await cred.getToken('https://graph.microsoft.com/.default'))!.token;
  ok('acquired an app-only access token');
} catch (error) {
  const message = (error as Error).message ?? String(error);
  no('could not acquire a token');
  info(message.split('\n')[0].slice(0, 300));
  // The AADSTS code is the whole diagnosis.
  const code = message.match(/AADSTS\d+/)?.[0];
  if (code === 'AADSTS7000215') info('AADSTS7000215 = invalid client secret. Wrong value, or it expired, or a stray \\r.');
  if (code === 'AADSTS700016') info('AADSTS700016 = application not found in this tenant. Check GRAPH_CLIENT_ID.');
  if (code === 'AADSTS90002') info('AADSTS90002 = tenant not found. Check GRAPH_TENANT_ID.');
  if (/getaddrinfo|ENOTFOUND|ETIMEDOUT|ECONNREFUSED/.test(message)) {
    info('This is a network failure, not a credential one — the container cannot reach login.microsoftonline.com.');
  }
  process.exit(1);
}

const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
const roles: string[] = claims.roles ?? [];
console.log('\n=== 3. Application permissions granted ===');
if (roles.length === 0) no('the token carries no application roles at all');
else roles.slice().sort().forEach((r) => info(r));
(roles.includes('Mail.Send') ? ok : no)('Mail.Send');

const call = async (label: string, url: string, init?: RequestInit) => {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = await res.text();
  if (res.ok) {
    ok(`${label} -> ${res.status}`);
    // Same shape on both paths so callers can read .code / .message without
    // TypeScript needing a discriminated union to narrow through.
    return { ok: true, code: '', message: body };
  }
  let message = body;
  let code = '';
  try {
    const parsed = JSON.parse(body).error;
    message = parsed?.message ?? body;
    code = parsed?.code ?? '';
  } catch { /* keep the raw body */ }
  no(`${label} -> ${res.status} ${code}`);
  info(String(message).slice(0, 300));
  return { ok: false, code, message: String(message) };
};

console.log('\n=== 4. Can the app reach the sending mailbox? (read-only) ===');
const probe = await call(
  `GET /users/${env.GRAPH_SENDER_UPN}/mailFolders/inbox`,
  `https://graph.microsoft.com/v1.0/users/${env.GRAPH_SENDER_UPN}/mailFolders/inbox?$select=id`,
);
if (!probe.ok) {
  if (probe.code === 'ErrorAccessDenied' || /ApplicationAccessPolicy/i.test(probe.message)) {
    info('An Application Access Policy is scoping this app to a different set of mailboxes.');
    info(`Add ${env.GRAPH_SENDER_UPN} to the policy's scope group, or the policy will keep blocking it.`);
    info(`Check with: Test-ApplicationAccessPolicy -Identity ${env.GRAPH_SENDER_UPN} -AppId ${env.GRAPH_CLIENT_ID}`);
  }
  if (probe.code === 'ResourceNotFound' || probe.code === 'Request_ResourceNotFound') {
    info(`${env.GRAPH_SENDER_UPN} does not resolve to a mailbox in this tenant.`);
    info('Mail.Send needs a real mailbox — a user with a licence, or a shared mailbox.');
  }
  if (probe.code === 'MailboxNotEnabledForRESTAPI') {
    info('The mailbox exists but is not REST-enabled — usually an unlicensed account.');
  }
}

const to = arg('to');
console.log('\n=== 5. Send a real test message ===');
if (!to) {
  info('Skipped. Re-run with --to=you@example.com to actually send one.');
} else {
  const result = await call(
    `POST /users/${env.GRAPH_SENDER_UPN}/sendMail`,
    `https://graph.microsoft.com/v1.0/users/${env.GRAPH_SENDER_UPN}/sendMail`,
    {
      method: 'POST',
      body: JSON.stringify({
        message: {
          subject: 'Onsys platform — Graph mail test',
          body: { contentType: 'Text', content: 'If you are reading this, outbound mail from the Onsys platform works.' },
          toRecipients: [{ emailAddress: { address: to } }],
        },
        saveToSentItems: true,
      }),
    },
  );
  if (result.ok) info(`Sent to ${to}. Check the inbox, and the junk folder.`);
}
console.log('');
}

main().catch((error) => {
  console.error('\n  diagnostic itself failed:', error);
  process.exit(1);
});
