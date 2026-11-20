import { describe, expect, it } from 'vitest';
import { extractCvText, matchRequirements, requirementTerms } from '../services/cvInsight.service';
import { cvPath } from '../services/cvStorage.service';

/**
 * The CV reader.
 *
 * What is worth testing here is the part that makes a claim about somebody:
 * which terms we say an advert asks for, and whether we report a CV as
 * mentioning them. Getting that wrong does not crash anything — it quietly
 * tells a reviewer that a candidate lacks a skill they have, which is the
 * failure that matters and the one nothing else would catch.
 */

const ADVERT = `
  <h2>Senior SQL Server DBA</h2>
  <p>You will look after Always On availability groups and tune queries that
     have been running for years. You will work with Azure, Power BI and our
     own monitoring. You should have strong experience with replication and
     with backup strategy. The team is excellent and you will be supported.</p>
`;

describe('requirementTerms', () => {
  const terms = requirementTerms(ADVERT, 'Senior SQL Server DBA');
  const lower = terms.map((t) => t.toLowerCase());

  it('finds the technologies the advert names', () => {
    expect(lower).toContain('always on');
    expect(lower).toContain('azure');
    expect(lower).toContain('power bi');
  });

  it('keeps a product name whole instead of splitting it across pairs', () => {
    // "Senior SQL Server DBA" once produced "Senior SQL" and "Server DBA",
    // neither of which is a technology and neither of which any CV contains.
    const t = requirementTerms('<p>Work on SQL Server every day.</p>', 'Senior SQL Server DBA');
    expect(t.map((x) => x.toLowerCase())).toContain('sql server');
    expect(t.map((x) => x.toLowerCase())).not.toContain('server dba');
  });

  it('keeps hyphenated acronyms', () => {
    const t = requirementTerms('<p>Strong T-SQL and CI/CD.</p>', 'Engineer');
    expect(t).toContain('T-SQL');
  });

  it('never offers a place as if it were a skill', () => {
    // Where somebody lives is on the application form. Putting "does this CV
    // say Melbourne?" beside "does it say SQL Server?" treats the two as the
    // same kind of question, and they are not.
    const t = requirementTerms(
      '<p>Join our Melbourne team, working across Australia.</p>',
      'DBA, Sydney',
    ).map((x) => x.toLowerCase());
    for (const place of ['melbourne', 'sydney', 'australia', 'colombo']) {
      expect(t).not.toContain(place);
    }
  });

  it('drops the words every advert contains', () => {
    // These appear in the advert above and say nothing about a candidate.
    for (const noise of ['you', 'will', 'team', 'excellent', 'experience', 'years']) {
      expect(lower).not.toContain(noise);
    }
  });

  it('strips the markup rather than matching inside it', () => {
    expect(lower).not.toContain('h2');
    expect(lower).not.toContain('p');
  });

  it('caps the list so the panel stays readable', () => {
    const wordy = requirementTerms(
      Array.from({ length: 200 }, (_, i) => `<p>Technology${i} Matters</p>`).join(''),
      'Engineer',
    );
    expect(wordy.length).toBeLessThanOrEqual(14);
  });

  it('returns nothing rather than throwing on an empty advert', () => {
    expect(requirementTerms('', '')).toEqual([]);
  });
});

describe('matchRequirements', () => {
  it('matches regardless of how the CV capitalises a term', () => {
    const result = matchRequirements('Ten years of azure and POWER BI.', ['Azure', 'Power BI']);
    expect(result.every((r) => r.present)).toBe(true);
  });

  it('reports a term the CV does not use as absent, not as a failure', () => {
    const result = matchRequirements('I write Python.', ['Azure']);
    expect(result).toEqual([{ term: 'Azure', present: false }]);
  });

  it('keeps the advert order, so the panel is stable between candidates', () => {
    const terms = ['Azure', 'Replication', 'Power BI'];
    const result = matchRequirements('azure replication power bi', terms);
    expect(result.map((r) => r.term)).toEqual(terms);
  });
});

describe('extractCvText', () => {
  it('says plainly that a legacy .doc cannot be read here', async () => {
    const result = await extractCvText('2026-11/x.doc', 'application/msword', 'cv.doc');
    expect(result.text).toBe('');
    expect(result.problem).toMatch(/download it/i);
  });

  it('reports a missing file without throwing', async () => {
    const result = await extractCvText(
      '2026-11/definitely-not-here.pdf',
      'application/pdf',
      'cv.pdf',
    );
    expect(result.text).toBe('');
    expect(result.problem).toMatch(/missing from storage/i);
  });

  it('refuses a storage key that climbs out of the CV volume', () => {
    // The key reaches this code from a database row. "The database is trusted"
    // is how every path-traversal write-up opens.
    expect(() => cvPath('../../../../etc/passwd')).toThrow(/escapes the storage root/);
  });
});
