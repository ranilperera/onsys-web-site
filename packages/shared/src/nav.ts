/**
 * Footer navigation helpers, shared by the admin write path and the public
 * read path so the two cannot disagree about what a valid link is or what
 * order the columns come out in.
 */

export interface NavLinkInput {
  group: string;
  groupOrder: number;
  label: string;
  href: string;
  order: number;
}

export type FooterGroups = Record<string, Array<{ label: string; href: string }>>;

/**
 * Whether a footer link target is one we are willing to render.
 *
 * The admin console is authenticated, so this is not the primary defence — but
 * these values are written straight into an href on every page of the site,
 * and `javascript:` in that position is stored XSS that survives until someone
 * notices. An allow-list of four prefixes costs nothing and closes it. Scheme-
 * relative `//evil.test` is rejected too: it looks like a path but is not one.
 */
export function isAllowedNavHref(href: string): boolean {
  const value = href.trim();
  if (value.startsWith('//')) return false;
  return (
    value.startsWith('/') ||
    value.startsWith('https://') ||
    value.startsWith('mailto:') ||
    value.startsWith('tel:')
  );
}

/**
 * Turn a flat link table into the footer's columns, in render order.
 *
 * Column order comes from groupOrder rather than the group name: sorting by
 * name alone puts Company before Services, which is not the order the footer
 * reads in. The group name is only a tie-breaker so the output is stable when
 * two columns share an order.
 */
export function groupFooterLinks(links: NavLinkInput[]): FooterGroups {
  const sorted = [...links].sort(
    (a, b) =>
      a.groupOrder - b.groupOrder || a.group.localeCompare(b.group) || a.order - b.order,
  );

  const groups: FooterGroups = {};
  for (const { group, label, href } of sorted) {
    (groups[group] ??= []).push({ label, href });
  }
  return groups;
}
