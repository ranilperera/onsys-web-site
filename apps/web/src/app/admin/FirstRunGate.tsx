'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAdminUser } from '@/lib/adminUser';

/**
 * Sends someone still using an administrator-issued password to change it.
 *
 * The temporary password was read down a phone line or pasted into a chat
 * window, so until it is replaced the account is only as private as that
 * handover was. The API already refuses every admin route while the flag is
 * set; without this the new author would meet a 403 on the dashboard and
 * reasonably conclude the account is broken.
 *
 * The profile page is the one screen left open, because it is where the
 * password form lives.
 */
export function FirstRunGate() {
  const { user, loading } = useAdminUser();
  const pathname = usePathname();
  const router = useRouter();

  const needsChange = Boolean(user?.mustChangePassword);
  const onProfile = pathname === '/admin/profile';

  useEffect(() => {
    if (needsChange && !onProfile) router.replace('/admin/profile');
  }, [needsChange, onProfile, router]);

  if (loading || !needsChange) return null;

  return (
    <div className="form-status error" style={{ marginBottom: 20 }} role="status">
      <strong>Choose a password of your own before you start.</strong> The one you were given was
      handed over by somebody else, so the console stays closed until it is replaced.
    </div>
  );
}
