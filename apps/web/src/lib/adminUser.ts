'use client';

import { useEffect, useState } from 'react';
import type { Role } from '@onsys/shared';
import { siteConfig } from './config';

/**
 * Who is signed in to the console.
 *
 * Added with the author role. Until then every screen could assume the person
 * reading it could do everything on it, so nothing needed to know who they
 * were — the navigation was a constant and the editors offered every control.
 *
 * Worth being plain about what this is for: it decides what the console
 * *shows*. It is not a permission check. Every restriction is enforced by the
 * API, which is the only place a check is worth anything — this hook just
 * stops the console offering a writer a link that would 403, which reads as a
 * broken console rather than as a boundary.
 */
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  authorId: string | null;
  author: { id: string; name: string; slug: string } | null;
  mustChangePassword: boolean;
  totpEnabled: boolean;
  recoveryCodesLeft: number;
  lastLoginAt: string | null;
}

export interface AdminUserState {
  user: AdminUser | null;
  loading: boolean;
}

export function useAdminUser(): AdminUserState {
  const [state, setState] = useState<AdminUserState>({ user: null, loading: true });

  useEffect(() => {
    let live = true;
    fetch(`${siteConfig.apiUrl}/api/auth/me`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!live) return;
        setState({ user: (d?.user as AdminUser) ?? null, loading: false });
      })
      .catch(() => {
        // Silent: an unauthenticated visitor is already being redirected by
        // whichever screen they landed on, and a console that shouts about a
        // failed /me on the sign-in page is noise.
        if (live) setState({ user: null, loading: false });
      });
    return () => {
      live = false;
    };
  }, []);

  return state;
}

/** Everything but the blog is closed to an author. */
export function isAuthorOnly(user: AdminUser | null): boolean {
  return user?.role === 'AUTHOR';
}
