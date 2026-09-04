import { describe, it, expect } from 'vitest';
import { isAllowedNavHref, groupFooterLinks, type NavLinkInput } from '@onsys/shared';

const link = (over: Partial<NavLinkInput>): NavLinkInput => ({
  group: 'Services',
  groupOrder: 0,
  label: 'A link',
  href: '/a',
  order: 0,
  ...over,
});

describe('isAllowedNavHref', () => {
  it('accepts the shapes a footer link legitimately takes', () => {
    expect(isAllowedNavHref('/about')).toBe(true);
    expect(isAllowedNavHref('/expertise#certifications')).toBe(true);
    expect(isAllowedNavHref('https://learn.microsoft.com/x')).toBe(true);
    expect(isAllowedNavHref('mailto:info@onsys.com.au')).toBe(true);
    expect(isAllowedNavHref('tel:1800431416')).toBe(true);
  });

  it('rejects javascript: URLs', () => {
    // These render into an href on every page of the site, so a stored one is
    // XSS that survives until a human notices it.
    expect(isAllowedNavHref('javascript:alert(1)')).toBe(false);
    expect(isAllowedNavHref('  javascript:alert(1)')).toBe(false);
    expect(isAllowedNavHref('JavaScript:alert(1)')).toBe(false);
  });

  it('rejects data: and other schemes', () => {
    expect(isAllowedNavHref('data:text/html,<script>')).toBe(false);
    expect(isAllowedNavHref('http://insecure.test')).toBe(false);
    expect(isAllowedNavHref('ftp://files.test')).toBe(false);
  });

  it('rejects scheme-relative URLs that look like paths', () => {
    // '//evil.test' starts with '/' but navigates off-site.
    expect(isAllowedNavHref('//evil.test')).toBe(false);
  });

  it('rejects an empty or whitespace href', () => {
    expect(isAllowedNavHref('')).toBe(false);
    expect(isAllowedNavHref('   ')).toBe(false);
  });
});

describe('groupFooterLinks', () => {
  it('orders columns by groupOrder, not alphabetically', () => {
    // The regression this guards: ordering by group name alone puts Company
    // before Services and silently rearranges the footer.
    const groups = groupFooterLinks([
      link({ group: 'Company', groupOrder: 1 }),
      link({ group: 'Services', groupOrder: 0 }),
      link({ group: 'Legal', groupOrder: 3 }),
      link({ group: 'Support', groupOrder: 2 }),
    ]);
    expect(Object.keys(groups)).toEqual(['Services', 'Company', 'Support', 'Legal']);
  });

  it('orders links within a column by their order field', () => {
    const groups = groupFooterLinks([
      link({ label: 'Third', order: 2 }),
      link({ label: 'First', order: 0 }),
      link({ label: 'Second', order: 1 }),
    ]);
    expect(groups.Services.map((l) => l.label)).toEqual(['First', 'Second', 'Third']);
  });

  it('falls back to the group name when two columns share an order', () => {
    const groups = groupFooterLinks([
      link({ group: 'Zebra', groupOrder: 0 }),
      link({ group: 'Alpha', groupOrder: 0 }),
    ]);
    expect(Object.keys(groups)).toEqual(['Alpha', 'Zebra']);
  });

  it('returns an empty object for no links, so the caller can fall back', () => {
    expect(groupFooterLinks([])).toEqual({});
  });

  it('does not mutate the array it is given', () => {
    const input = [link({ label: 'B', order: 1 }), link({ label: 'A', order: 0 })];
    groupFooterLinks(input);
    expect(input.map((l) => l.label)).toEqual(['B', 'A']);
  });

  it('keeps only label and href on the rendered link', () => {
    const groups = groupFooterLinks([link({ label: 'About', href: '/about' })]);
    expect(groups.Services[0]).toEqual({ label: 'About', href: '/about' });
  });
});
