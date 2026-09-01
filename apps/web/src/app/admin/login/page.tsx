'use client';

import { useState, type FormEvent } from 'react';
import { siteConfig } from '@/lib/config';

export default function AdminLogin() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Login failed');
        return;
      }
      // Return to whatever sent us here — the Teams escalation card links
      // straight to a conversation, and bouncing the agent to the dashboard
      // would make them hunt for it by session id.
      const next = new URLSearchParams(window.location.search).get('next');
      // Same-origin paths only: an open redirect here would let a crafted link
      // bounce a just-authenticated admin to an attacker's page. Both `//host`
      // and `/\host` are treated as protocol-relative by browsers, so the
      // character after the slash has to be neither.
      window.location.href = next && /^\/[^/\\]/.test(next) ? next : '/admin';
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '60px auto' }}>
      <div className="form-card">
        <h1 style={{ fontSize: 22, marginBottom: 20 }}>Admin sign in</h1>
        {error && (
          <div className="form-status error" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={onSubmit}>
          <div className="form-row">
            <div className="form-field full">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required autoComplete="username" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field full">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
