'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminUser } from '@/lib/adminUser';

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
 *
 * What each role sees is decided here, but not *enforced* here. The API
 * refuses an author every path outside the blog whatever this file renders;
 * hiding the links only keeps the console honest about what it can do. An
 * author who types /admin/leads gets a screen saying so, not a list of
 * enquiries.
 */
export function AdminNav() {
  const pathname = usePathname();
  const { user } = useAdminUser();

  if (pathname === '/admin/login') return null;

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  /*
   * Rendered before /me answers, so the bar does not appear a beat after the
   * page. An author sees the full set for that moment — which is why none of
   * this is load-bearing — and it settles to their four links on the first
   * render after the fetch.
   */
  const role = user?.role ?? 'EDITOR';

  const groups: Array<{ name: string; links: Array<{ href: string; label: string }> }> =
    role === 'AUTHOR'
      ? [
          {
            name: 'Writing',
            links: [
              { href: '/admin', label: 'Dashboard' },
              { href: '/admin/posts', label: 'Posts' },
            ],
          },
          {
            name: 'You',
            links: [{ href: '/admin/profile', label: 'My account' }],
          },
        ]
      : [
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
              { href: '/admin/case-studies', label: 'Case studies' },
              { href: '/admin/jobs', label: 'Jobs' },
              { href: '/admin/applications', label: 'Applications' },
              { href: '/admin/leads', label: 'Leads' },
              { href: '/admin/chat', label: 'Chat' },
            ],
          },
          {
            name: 'Site',
            links: [
              { href: '/admin/nav', label: 'Footer' },
              // Accounts are administrator-only. An editor who follows a
              // guessed URL gets the API's refusal, not a user list.
              ...(role === 'ADMIN' ? [{ href: '/admin/users', label: 'Accounts' }] : []),
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
