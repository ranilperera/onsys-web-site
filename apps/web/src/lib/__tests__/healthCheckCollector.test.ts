import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The collector script and the published page must describe the same 20 checks.
 *
 * The page is what a DBA reads before agreeing to run anything, and the script
 * is what they then run. If those two drift, the promise on the page stops
 * being true of the download — which is the one thing this offer cannot afford,
 * because the whole proposition is "read it before you run it".
 */

const WEB = join(__dirname, '..', '..', '..');
const page = readFileSync(join(WEB, 'public', 'onsys-sql-server-health-check.html'), 'utf8');
// Not under public/: the collector is token-gated and served by
// /download/collector, so anything in the served folder would defeat that.
const script = readFileSync(join(WEB, 'content', 'Invoke-OnsysHealthCheck.ps1'), 'utf8');

/** Check number to title, as published. */
function publishedChecks(): Map<number, string> {
  const found = new Map<number, string>();
  const re = /<section class="check" id="c(\d+)">([\s\S]*?)<\/section>/g;
  for (const m of page.matchAll(re)) {
    const title = /<h2>([\s\S]*?)<\/h2>/.exec(m[2])?.[1] ?? '';
    found.set(
      Number(m[1]),
      title
        .replace(/<[^>]+>/g, '')
        .replace(/\s*(PowerShell|T-SQL|Per database)\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    );
  }
  return found;
}

describe('the published page', () => {
  it('defines exactly 20 checks, numbered 1 to 20', () => {
    const checks = publishedChecks();
    expect(checks.size).toBe(20);
    for (let i = 1; i <= 20; i++) expect(checks.has(i)).toBe(true);
  });
});

describe('the collector script', () => {
  it('carries every published check, under the same name', () => {
    for (const [num, title] of publishedChecks()) {
      expect(script, `check ${num} missing from the collector`).toMatch(
        new RegExp(String.raw`Num\s+=\s+${num}\b`),
      );
      expect(script, `check ${num} "${title}" not named in the collector`).toContain(title);
    }
  });

  it('runs read-only statements only', () => {
    // The page promises nothing is written. A collector that violated that
    // would be a breach of the offer, not merely a bug.
    const forbidden = [
      /\bINSERT\s+INTO\b/i,
      /\bUPDATE\s+\w+\s+SET\b/i,
      /\bDELETE\s+FROM\b/i,
      /\bDROP\s+(TABLE|DATABASE|INDEX)\b/i,
      /\bALTER\s+(DATABASE|TABLE|INDEX|SERVER)\b/i,
      /\bTRUNCATE\b/i,
      /\bDBCC\s+(FREEPROCCACHE|DROPCLEANBUFFERS|CHECKDB)\b/i,
      /\bBACKUP\s+(DATABASE|LOG)\b/i,
      // Reconfiguring, not reading, the surface area. Check 20 legitimately
      // *asks* whether xp_cmdshell is enabled by selecting from
      // sys.configurations — naming it is fine, executing it is not.
      /\bEXEC(UTE)?\s*\(?\s*'?(master\.\.)?xp_cmdshell/i,
      /\bsp_configure\s*['(]/i,
      /\bRECONFIGURE\b/i,
    ];
    for (const pattern of forbidden) {
      expect(script, `collector contains ${pattern}`).not.toMatch(pattern);
    }
  });

  it('excludes query text unless the operator opts in', () => {
    // Cached query text can contain literal values, which is the one route by
    // which customer data could leave with the results.
    expect(script).toContain('IncludeQueryText');
    expect(script).toContain('excluded - rerun with -IncludeQueryText');
  });

  it('does not multiply an int page count without casting first', () => {
    // sys.master_files.size/growth/max_size are int page counts: multiplying by
    // 8 overflows for any file with a 2 TB max, which is tempdb's default.
    expect(script).not.toMatch(/mf\.(size|growth|max_size) \* 8/);
  });

  it('leaves no template placeholder unrendered', () => {
    // Company name, phone and contact address come from .env through the
    // generator. An unrendered {{LEGAL_NAME}} would put a literal placeholder
    // into a copyright notice.
    expect(script).not.toMatch(/\{\{[A-Z_]+\}\}/);
    expect(page).not.toMatch(/\{\{[A-Z_]+\}\}/);
  });

  it('names the same legal entity in both artefacts', () => {
    const from = (text: string) => /(?:\(c\)|&copy;)\s*\d{4}\s+([^.]+?)\.\s/.exec(text)?.[1]?.trim();
    const inScript = from(script);
    const inPage = from(page);
    expect(inScript).toBeTruthy();
    expect(inPage).toBeTruthy();
    expect(inScript).toBe(inPage);
  });

  it('does not hand the collector out from the public bundle', () => {
    // The collector is what the contact details are exchanged for, so the
    // freely readable page must not link straight to the download.
    expect(page).not.toContain('/Invoke-OnsysHealthCheck.ps1');
  });

  it('is not published under public/, where anything is downloadable', () => {
    // The regression this guards is the whole point of the gate: a file in
    // public/ is served to anyone who guesses its name, form or no form.
    expect(existsSync(join(WEB, 'public', 'Invoke-OnsysHealthCheck.ps1'))).toBe(false);
  });

  it('declares the parameters the page tells people to use', () => {
    for (const p of ['ServerInstance', 'OutputPath', 'SqlCredential', 'SkipOsChecks']) {
      expect(script).toContain(`$${p}`);
    }
  });

  it('is a complete PowerShell file, not a truncated one', () => {
    expect(script).toContain('[CmdletBinding()]');
    expect(script).toContain('Compress-Archive');
    // Balanced here-strings; an unterminated one silently swallows the rest.
    const open = (script.match(/@'\r?\n/g) ?? []).length;
    const close = (script.match(/\r?\n'@/g) ?? []).length;
    expect(open).toBe(close);
  });
});
