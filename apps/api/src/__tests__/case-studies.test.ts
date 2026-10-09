import { describe, it, expect } from 'vitest';
import { findForbiddenIdentifiers, caseStudyInputSchema } from '@onsys/shared';

/**
 * The anonymisation guard.
 *
 * The source material is commercial-in-confidence client documentation, and the
 * realistic failure is not malice — it is a hostname or a build number pasted
 * out of a design document along with the sentence around it. Every pattern
 * here was found in those documents.
 */

describe('findForbiddenIdentifiers', () => {
  it('passes clean copy', () => {
    expect(
      findForbiddenIdentifiers(
        'An Australian healthcare group running a clinical system on SQL Server with no DBA on staff.',
      ),
    ).toEqual([]);
  });

  it('catches the hostnames in the source documents', () => {
    for (const host of [
      'AUMELPPSQL001',
      'AUMELPSSQL001',
      'DC1DARPN2',
      'DC1DARLIS3',
      'DC1DARPV1AG2',
      'mpvl-gsn-ora02',
      'tci-mysql01',
    ]) {
      expect(findForbiddenIdentifiers(`Failover to ${host} was tested.`).length).toBeGreaterThan(0);
    }
  });

  it('catches IP addresses', () => {
    expect(findForbiddenIdentifiers('The listener answers on 10.20.30.40.')[0]).toContain('IP address');
  });

  it('catches build numbers', () => {
    expect(findForbiddenIdentifiers('Running 13.0.2164.0 at the time.').length).toBeGreaterThan(0);
  });

  it('catches prices in any of the currencies these documents use', () => {
    for (const money of ['$42,000', 'AUD 18,500', 'USD 9,000', 'FJD 25,000']) {
      expect(findForbiddenIdentifiers(`Quoted at ${money}.`).length).toBeGreaterThan(0);
    }
  });

  it('catches port numbers', () => {
    expect(findForbiddenIdentifiers('Clients connect on port 3306.')[0]).toContain('port');
  });

  it('does not false-positive on ordinary prose a case study needs', () => {
    const copy = [
      'Mapped to ISO 27001, the ACSC Essential Eight and APRA CPS 234.',
      'PostgreSQL and MariaDB are covered by the same team.',
      'Two data centres, with a listener in front of both.',
      'Synchronous commit means a transaction is on both replicas before the application is told it committed.',
      'Delivered in 2024 for a Sri Lankan manufacturing group.',
      'Group replication in single-primary mode, with automatic promotion.',
      'Transparent Data Encryption was enabled on the data files and on the backups.',
      'The DR test runs while production stays open to applications.',
    ];
    for (const line of copy) {
      expect(findForbiddenIdentifiers(line)).toEqual([]);
    }
  });

  it('reports every distinct problem it finds, not just the first', () => {
    const out = findForbiddenIdentifiers('Host DC1DARPN2 at 10.0.0.5 cost $9,000.');
    expect(out.length).toBeGreaterThanOrEqual(3);
  });
});

describe('caseStudyInputSchema', () => {
  const valid = {
    title: 'High availability for an Australian healthcare group',
    slug: 'healthcare-sql-server-high-availability',
    summary: 'Synchronous replication with automatic failover, and encryption at rest.',
    sector: 'Healthcare',
    region: 'Australia' as const,
    deliveredYear: 2016,
    blocks: [{ type: 'richText', html: '<p>What was built.</p>' }],
    platforms: ['SQL Server', 'Windows Server'],
  };

  it('accepts a complete case study', () => {
    expect(caseStudyInputSchema.safeParse(valid).success).toBe(true);
  });

  it('defaults to DRAFT so nothing publishes by accident', () => {
    expect(caseStudyInputSchema.parse(valid).status).toBe('DRAFT');
  });

  it('rejects a region that is not on the approved list', () => {
    // Free-text regions are how "Fiji" ends up published.
    expect(caseStudyInputSchema.safeParse({ ...valid, region: 'Fiji' }).success).toBe(false);
    expect(caseStudyInputSchema.safeParse({ ...valid, region: 'Melbourne' }).success).toBe(false);
  });

  it('rejects a future delivery year', () => {
    expect(
      caseStudyInputSchema.safeParse({ ...valid, deliveredYear: new Date().getFullYear() + 1 })
        .success,
    ).toBe(false);
  });

  it('accepts a year posted as a string, as a form sends it', () => {
    expect(caseStudyInputSchema.safeParse({ ...valid, deliveredYear: '2024' }).success).toBe(true);
  });

  it('rejects blocks that are not valid blocks', () => {
    expect(caseStudyInputSchema.safeParse({ ...valid, blocks: [{ type: 'nonsense' }] }).success).toBe(
      false,
    );
  });
});
