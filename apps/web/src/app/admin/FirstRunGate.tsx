'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminUser } from '@/lib/adminUser';

/**
 * Holds the console shut for someone still using an administrator-issued
 * password, and sends them to the form that replaces it.
 *
 * The temporary password was read down a phone line, so until it is replaced
 * the account is only as private as that handover was. The API refuses every
 * /api/admin route while the flag is set.
 *
 * This withholds the screen rather than just redirecting over the top of it,
 * because a redirect is not instant: the screen underneath mounts first, fires
 * its own fetch, and meets that 403 before the router has moved. The first
 * thing a new writer saw was the dashboard crashing on an error body it had
 * mistaken for statistics.
 *
 * The profile page is the one screen left open, because the password form
 * lives on it and it reads only /api/auth, which the gate does not cover.
 */
export function FirstRunGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAdminUser();
  const pathname = usePathname();
  const router = useRouter();

  const needsChange = Boolean(user?.mustChangePassword);
  const onProfile = pathname === '/admin/profile';

  useEffect(() => {
    if (needsChange && !onProfile) router.replace('/admin/profile');
  }, [needsChange, onProfile, router]);

  /*
   * Nothing is withheld until we know who is reading. The sign-in and MFA
   * screens live under this layout too, and they have no session to ask about
   * — blocking on /me would leave them blank.
   */
  if (loading || !needsChange) return <>{children}</>;

  const banner = (
    <div className="form-status error" style={{ marginBottom: 20 }} role="status">
      <strong>Choose a password of your own before you start.</strong> The one you were given was
      handed over by somebody else, so the console stays closed until it is replaced.
    </div>
  );

  if (onProfile) {
    return (
      <>
        {banner}
        {children}
      </>
    );
  }

  // On the way to the profile page. Say so rather than flashing an empty page.
  return (
    <>
      {banner}
      <p style={{ color: 'var(--gray)' }}>Taking you to your account&hellip;</p>
    </>
  );
}
