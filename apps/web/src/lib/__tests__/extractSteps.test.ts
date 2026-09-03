import { describe, it, expect } from 'vitest';
import { extractSteps } from '../seo';

const h2 = (heading: string, body = 'Some instruction text for this step.') =>
  `<h2>${heading}</h2><p>${body}</p>`;

describe('extractSteps', () => {
  it('matches explicit "Step N" headings', () => {
    const html = h2('Step 1: Create the master key') + h2('Step 2: Back up the certificate') + h2('Step 3: Enable encryption');
    expect(extractSteps(html).map((s) => s.name)).toEqual([
      'Step 1: Create the master key',
      'Step 2: Back up the certificate',
      'Step 3: Enable encryption',
    ]);
  });

  it('matches bare numbered headings', () => {
    // The original matcher accepted only "Step N", so these emitted nothing —
    // the HowTo markup was wired up and never fired once.
    const html = h2('1. Create the master key') + h2('2) Back up the certificate') + h2('3. Enable encryption');
    expect(extractSteps(html)).toHaveLength(3);
  });

  it('matches the gerund house style', () => {
    const html =
      h2('Creating the master key') + h2('Backing up the certificate') + h2('Enabling encryption');
    expect(extractSteps(html)).toHaveLength(3);
  });

  it('does not treat a question heading as a step', () => {
    // A post whose headings are questions is an FAQ. Marking it up as a
    // procedure describes the page as something it is not.
    const html =
      h2('Enabling TDE on a secondary?') + h2('Backing up the certificate?') + h2('Rotating the key?');
    expect(extractSteps(html)).toEqual([]);
  });

  it('ignores ordinary prose headings', () => {
    const html = h2('Introduction') + h2('Why this matters') + h2('Conclusion');
    expect(extractSteps(html)).toEqual([]);
  });

  it('requires at least three steps before claiming a procedure', () => {
    // Google treats inaccurate HowTo as a markup violation, not a near miss.
    const two = h2('Creating the master key') + h2('Backing up the certificate');
    expect(extractSteps(two)).toEqual([]);
  });

  it('strips inline markup from the heading and body', () => {
    const html =
      '<h2><strong>Step 1:</strong> Create the <code>master key</code></h2><p>Run <code>CREATE MASTER KEY</code> first.</p>' +
      h2('Step 2: Back it up') +
      h2('Step 3: Turn it on');
    const steps = extractSteps(html);
    expect(steps[0].name).toBe('Step 1: Create the master key');
    expect(steps[0].text).toBe('Run CREATE MASTER KEY first.');
  });

  it('caps step text so one long section cannot bloat the payload', () => {
    const html =
      `<h2>Step 1: Long one</h2><p>${'word '.repeat(400)}</p>` + h2('Step 2: Two') + h2('Step 3: Three');
    expect(extractSteps(html)[0].text.length).toBeLessThanOrEqual(500);
  });

  it('returns nothing for a post with no headings at all', () => {
    expect(extractSteps('<p>Just prose.</p>')).toEqual([]);
  });
});
