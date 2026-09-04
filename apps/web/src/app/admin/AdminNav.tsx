'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Admin navigation.
 *
 * Hidden on the sign-in page: linking to the console's sections from a form
 * nobody has authenticated to advertises its shape to anyone who finds the
 * URL, and every link is a bounce straight back to this page.
 *
 * Grouped rather than one flat row, because the list has outgrown the point
 * where a reader can scan it. The three groups are the three jobs someone
 * signs in to do: publish something, follow up on an enquiry, or change how
 * the site is put together.
 */
export function AdminNav() {
  const pathname = usePathname();
  if (pathname === '/admin/login') return null;

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  const groups: Array<{ name: string; links: Array<{ href: string; label: string }> }> = [
    {
      name: 'Content',
      links: [
        { href: '/admin', label: 'Dashboard' },
        { href: '/admin/pages', label: 'Pages' },
        { href: '/admin/posts', label: 'Posts' },
        { href: '/admin/authors', label: 'Authors' },
      ],
    },
    {
      name: 'Enquiries',
      links: [
        { href: '/admin/leads', label: 'Leads' },
        { href: '/admin/chat', label: 'Chat' },
      ],
    },
    {
      name: 'Site',
      links: [
        { href: '/admin/nav', label: 'Footer' },
        { href: '/admin/profile', label: 'My account' },
      ],
    },
  ];

  return (
    <nav aria-label="Admin navigation" className="admin-nav">
      {groups.map((group) => (
        <div className="admin-nav-group" key={group.name}>
          {group.links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? 'page' : undefined}
              className={isActive(l.href) ? 'active' : undefined}
            >
              {l.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
