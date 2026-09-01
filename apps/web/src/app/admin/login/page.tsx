'use client';

import { useState, useRef, type FormEvent } from 'react';
import { siteConfig } from '@/lib/config';

type Step = 'password' | 'code';

export default function AdminLogin() {
  const [step, setStep] = useState<Step>('password');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  const challengeRef = useRef<string | null>(null);
  const methodRef = useRef<'totp' | 'email'>('email');

  /**
   * Where to go once signed in. Same-origin paths only — an open redirect on a
   * login page hands an attacker a just-authenticated admin, and the Teams
   * escalation card links straight into a conversation, so this is a real path
   * rather than a hypothetical one.
   */
  function destination(): string {
    const next = new URLSearchParams(window.location.search).get('next');
    return next && /^\/[^/\\]/.test(next) ? next : '/admin';
  }

  async function submitPassword(e: FormEvent<HTMLFormElement>) {
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

      challengeRef.current = data.challengeId;
      methodRef.current = data.method;
      setStep('code');
      setNotice(
        data.method === 'totp'
          ? 'Enter the 6-digit code from your authenticator app.'
          : data.emailSent
            ? `We've emailed a code to ${data.emailHint}.`
            : `We couldn't email a code. Call ${siteConfig.phone} for help signing in.`,
      );
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!challengeRef.current) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/auth/mfa/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: challengeRef.current, code: code.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'That code did not work.');
        if (data.expired) {
          // The challenge is gone; there is nothing to retry against.
          setStep('password');
          setCode('');
          challengeRef.current = null;
        }
        return;
      }

      if (data.usedRecoveryCode) {
        // Not a toast: they are now one code down and should know before they
        // navigate away and forget.
        window.alert(
          `Signed in with a recovery code. You have ${data.recoveryCodesLeft} left — ` +
            'generate a new set from My account when you have your phone back.',
        );
      }

      window.location.href = destination();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  async function emailACode() {
    if (!challengeRef.current) return;
    setEmailSending(true);
    setError(null);
    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/auth/mfa/send-email`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: challengeRef.current }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not send a code.');
        return;
      }
      setNotice(
        data.emailSent
          ? 'A code is on its way to your inbox. It expires in 5 minutes.'
          : `We couldn't email a code. Call ${siteConfig.phone} for help signing in.`,
      );
    } catch {
      setError('Could not reach the server.');
    } finally {
      setEmailSending(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '60px auto' }}>
      <div className="form-card">
        <h1 style={{ fontSize: 22, marginBottom: 6 }}>Admin sign in</h1>
        <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 20 }}>
          {step === 'password' ? 'Onsys staff only.' : 'Step 2 of 2 — confirm it&rsquo;s you.'}
        </p>

        {error && (
          <div className="form-status error" role="alert">
            {error}
          </div>
        )}

        {step === 'password' ? (
          <form onSubmit={submitPassword}>
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
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Checking…' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode}>
            {notice && (
              <p style={{ fontSize: 13.5, color: 'var(--gray)', marginBottom: 14 }}>{notice}</p>
            )}

            <div className="form-row">
              <div className="form-field full">
                <label htmlFor="code">Verification code</label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  maxLength={20}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  style={{ fontSize: 20, letterSpacing: '.24em', textAlign: 'center' }}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={busy || !code.trim()}>
              {busy ? 'Verifying…' : 'Sign in'}
            </button>

            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {methodRef.current === 'totp' && (
                <button
                  type="button"
                  className="chat-skip-btn"
                  onClick={() => void emailACode()}
                  disabled={emailSending}
                  style={{ textAlign: 'left' }}
                >
                  {emailSending ? 'Sending…' : 'Email me a code instead'}
                </button>
              )}
              <p style={{ fontSize: 12, color: 'var(--gray)', margin: 0 }}>
                Lost your phone? Enter one of your recovery codes above.
              </p>
              <button
                type="button"
                className="chat-skip-btn"
                onClick={() => {
                  setStep('password');
                  setCode('');
                  setError(null);
                  setNotice(null);
                  challengeRef.current = null;
                }}
                style={{ textAlign: 'left' }}
              >
                Start again
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
