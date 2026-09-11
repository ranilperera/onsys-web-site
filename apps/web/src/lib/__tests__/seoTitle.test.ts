import { describe, it, expect } from 'vitest';
import { buildMetadata } from '../seo';
import { siteConfig } from '../config';

/**
 * The root layout sets `template: '%s | Onsys'`, so every title a route returns
 * gets the brand appended. A title that already ends in the brand therefore has
 * to opt out of the template, or it ships doubled.
 *
 * This is not a theoretical edge: /on-call-dba-services — the URL that ranks
 * for seven of the queries this site appears for at all — shipped as
 * "… | $100 Per Instance | Onsys | Onsys" because a CMS author typed the brand
 * by hand and nothing refused it.
 */

const SUFFIX = ` | ${siteConfig.shortName}`;

/** Next accepts a string or a TemplateString; only the latter opts out. */
const isAbsolute = (t: unknown): t is { absolute: string } =>
  typeof t === 'object' && t !== null && 'absolute' in t;

const build = (title: string) =>
  buildMetadata({ title, description: 'd', path: '/x' }).title;

describe('buildMetadata title', () => {
  it('leaves an ordinary title to the layout template', () => {
    const t = build('Remote Database Support Australia');
    expect(isAbsolute(t)).toBe(false);
    expect(t).toBe('Remote Database Support Australia');
  });

  it('opts a title that already carries the brand out of the template', () => {
    const t = build(`Standby SQL Server DBA Cover | $100 Per Instance${SUFFIX}`);
    expect(isAbsolute(t)).toBe(true);
    expect(isAbsolute(t) && t.absolute).toBe(
      `Standby SQL Server DBA Cover | $100 Per Instance${SUFFIX}`,
    );
  });

  it('never yields a title ending in the brand twice', () => {
    // What the reader would actually see, template applied where it applies.
    const render = (title: string) => {
      const t = build(title);
      return isAbsolute(t) ? t.absolute : `${t as string}${SUFFIX}`;
    };
    for (const title of [
      'Remote Database Support Australia',
      `Standby SQL Server DBA Cover${SUFFIX}`,
      `Something${SUFFIX}  `,
    ]) {
      expect(render(title).endsWith(`${SUFFIX}${SUFFIX}`)).toBe(false);
      expect(render(title).endsWith(SUFFIX)).toBe(true);
    }
  });

  it('tolerates trailing whitespace after the brand', () => {
    // A CMS field is a text box; a stray space must not defeat the guard.
    const t = build(`Standby SQL Server DBA Cover${SUFFIX}   `);
    expect(isAbsolute(t)).toBe(true);
  });

  it('does not fire on a brand mention that is not the close', () => {
    const t = build('Why Onsys runs your SQL Server');
    expect(isAbsolute(t)).toBe(false);
  });

  it('does not fire on a title merely ending with the brand word, unseparated', () => {
    // "…by Onsys" is not the "%s | Onsys" close and still needs the template.
    const t = build('Managed SQL Server support by Onsys');
    expect(isAbsolute(t)).toBe(false);
  });

  it('still sets description, canonical and og:title alongside', () => {
    const m = buildMetadata({ title: `X${SUFFIX}`, description: 'd', path: '/x' });
    expect(m.description).toBe('d');
    expect(m.alternates?.canonical).toBe(`${siteConfig.url}/x`);
    expect(m.openGraph?.title).toBe(`X${SUFFIX}`);
  });
});
