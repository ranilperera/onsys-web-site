import { siteConfig } from './config';

/**
 * Shared client helpers for the admin console.
 *
 * The CSRF read and the 401 redirect were copied into every admin page, which
 * meant six near-identical fetch preambles and six chances to forget the
 * header on a new mutation. Centralising them makes the auth behaviour one
 * thing to get right rather than one per screen.
 */

/** Reads the CSRF cookie set at login so mutations pass the double-submit check. */
export function csrfToken(): string {
  return document.cookie.match(/(?:^|;\s*)onsys_csrf=([^;]+)/)?.[1] ?? '';
}

export class AdminRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminRequestError';
    this.status = status;
  }
}

/**
 * Fetch against the admin API with the session cookie and CSRF header applied.
 *
 * A 401 sends the operator to the sign-in page carrying the path they were on,
 * so logging back in returns them to the screen they lost rather than to the
 * dashboard. That redirect never resolves — the promise is left pending on
 * purpose so callers do not run their success path during the navigation.
 */
export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method ?? 'GET';
  const res = await fetch(`${siteConfig.apiUrl}/api/admin${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(method === 'GET' ? {} : { 'x-csrf-token': csrfToken() }),
      ...init.headers,
    },
  });

  if (res.status === 401) {
    const next = encodeURIComponent(window.location.pathname);
    window.location.href = `/admin/login?next=${next}`;
    return new Promise<never>(() => {});
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new AdminRequestError(body.error ?? `Request failed (${res.status})`, res.status);
  }

  return (await res.json()) as T;
}
