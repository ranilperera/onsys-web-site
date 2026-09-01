'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Admin navigation.
 *
 * Hidden on the sign-in page: linking to Dashboard, Posts, Leads and Chat from
 * a form nobody has authenticated to advertises the console's shape to anyone
 * who finds the URL, and every link is a bounce straight back to this page.
 */
export function AdminNav() {
  const pathname = usePathname();
  if (pathname === '/admin/login') return null;

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  const links = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/posts', label: 'Posts' },
    { href: '/admin/leads', label: 'Leads' },
    { href: '/admin/chat', label: 'Chat' },
    { href: '/admin/profile', label: 'My account' },
  ];

  return (
    <nav aria-label="Admin navigation" className="admin-nav">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={isActive(l.href) ? 'page' : undefined}
          className={isActive(l.href) ? 'active' : undefined}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
