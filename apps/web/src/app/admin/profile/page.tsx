'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { siteConfig } from '@/lib/config';

interface Me {
  id: string;
  email: string;
  name: string;
  role: string;
  lastLoginAt: string | null;
  totpEnabled: boolean;
  recoveryCodesLeft: number;
}

interface Setup {
  secret: string;
  qrDataUrl: string;
}

/** Reads the CSRF cookie set at login so mutations pass the double-submit check. */
function csrfToken(): string {
  return document.cookie.match(/(?:^|;\s*)onsys_csrf=([^;]+)/)?.[1] ?? '';
}

function post(path: string, body: unknown) {
  return fetch(`${siteConfig.apiUrl}/api/auth/${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() },
    body: JSON.stringify(body ?? {}),
  });
}

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const [pwStatus, setPwStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  const [setup, setSetup] = useState<Setup | null>(null);
  const [enrolCode, setEnrolCode] = useState('');
  const [mfaStatus, setMfaStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [mfaBusy, setMfaBusy] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  const load = useCallback(() => {
    fetch(`${siteConfig.apiUrl}/api/auth/me`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 401) {
          const next = encodeURIComponent(window.location.pathname);
          window.location.href = `/admin/login?next=${next}`;
          return null;
        }
        return r.json();
      })
      .then((d) => d && setMe(d.user))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const confirmPassword = String(data.get('confirmPassword') ?? '');
    const newPassword = String(data.get('newPassword') ?? '');

    if (newPassword !== confirmPassword) {
      setPwStatus({ ok: false, text: 'The two new passwords do not match.' });
      return;
    }

    setPwBusy(true);
    setPwStatus(null);
    try {
      const res = await post('change-password', {
        currentPassword: data.get('currentPassword'),
        newPassword,
      });
      const body = await res.json();
      if (!res.ok) {
        setPwStatus({ ok: false, text: body.error ?? 'Could not change your password.' });
        return;
      }
      // Reset here rather than before the await: clearing a form that then
      // failed leaves someone retyping a long password for no reason.
      form.reset();
      setPwStatus({
        ok: true,
        text: 'Password changed. Any other sessions you had open have been signed out.',
      });
    } catch {
      setPwStatus({ ok: false, text: 'Could not reach the server.' });
    } finally {
      setPwBusy(false);
    }
  }

  async function startSetup() {
    setMfaBusy(true);
    setMfaStatus(null);
    try {
      const res = await post('mfa/setup', {});
      const body = await res.json();
      if (!res.ok) {
        setMfaStatus({ ok: false, text: body.error ?? 'Could not start setup.' });
        return;
      }
      setSetup({ secret: body.secret, qrDataUrl: body.qrDataUrl });
    } catch {
      setMfaStatus({ ok: false, text: 'Could not reach the server.' });
    } finally {
      setMfaBusy(false);
    }
  }

  async function confirmSetup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMfaBusy(true);
    setMfaStatus(null);
    try {
      const res = await post('mfa/enable', { code: enrolCode.trim() });
      const body = await res.json();
      if (!res.ok) {
        setMfaStatus({ ok: false, text: body.error ?? 'That code did not work.' });
        return;
      }
      setRecoveryCodes(body.recoveryCodes);
      setSetup(null);
      setEnrolCode('');
      load();
    } catch {
      setMfaStatus({ ok: false, text: 'Could not reach the server.' });
    } finally {
      setMfaBusy(false);
    }
  }

  async function disableMfa() {
    const password = window.prompt('Confirm your password to turn off two-factor authentication:');
    if (!password) return;

    setMfaBusy(true);
    setMfaStatus(null);
    try {
      const res = await post('mfa/disable', { password });
      const body = await res.json();
      if (!res.ok) {
        setMfaStatus({ ok: false, text: body.error ?? 'Could not turn it off.' });
        return;
      }
      setMfaStatus({
        ok: true,
        text: 'Authenticator removed. You will get a code by email at your next sign-in.',
      });
      setRecoveryCodes(null);
      load();
    } catch {
      setMfaStatus({ ok: false, text: 'Could not reach the server.' });
    } finally {
      setMfaBusy(false);
    }
  }

  if (loading) return <p>Loading…</p>;
  if (!me) return null;

  return (
    <>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>My account</h1>
      <p style={{ color: 'var(--gray)', fontSize: 14, marginBottom: 30 }}>
        {me.name} · {me.email} · {me.role}
        {me.lastLoginAt && ` · last signed in ${new Date(me.lastLoginAt).toLocaleString('en-AU')}`}
      </p>

      <section className="admin-card">
        <h2>Two-factor authentication</h2>

        {mfaStatus && (
          <div className={`form-status ${mfaStatus.ok ? 'success' : 'error'}`} role="alert">
            {mfaStatus.text}
          </div>
        )}

        {recoveryCodes && (
          <div className="recovery-panel">
            <h3>Save your recovery codes</h3>
            <p>
              Each one signs you in once if you lose your phone. <strong>This is the only time
              they are shown</strong> — they are stored hashed, so we cannot show them again.
            </p>
            <ul className="recovery-codes">
              {recoveryCodes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <button
              className="btn btn-outline"
              onClick={() => {
                void navigator.clipboard?.writeText(recoveryCodes.join('\n'));
              }}
            >
              Copy to clipboard
            </button>
            <button className="btn btn-primary" onClick={() => setRecoveryCodes(null)}>
              I&rsquo;ve saved them
            </button>
          </div>
        )}

        {me.totpEnabled ? (
          <>
            <p className="mfa-state on">
              <span className="dot" aria-hidden="true" /> Authenticator app is on.
              {' '}
              {me.recoveryCodesLeft} recovery {me.recoveryCodesLeft === 1 ? 'code' : 'codes'} left.
            </p>
            {me.recoveryCodesLeft <= 2 && (
              <p className="mfa-warn">
                You are nearly out of recovery codes. Turn the authenticator off and set it up again
                to get a fresh set.
              </p>
            )}
            <button className="btn btn-outline" onClick={() => void disableMfa()} disabled={mfaBusy}>
              Turn off authenticator
            </button>
          </>
        ) : setup ? (
          <form onSubmit={confirmSetup}>
            <p>
              Scan this with Microsoft Authenticator, Google Authenticator or 1Password, then enter
              the code it shows.
            </p>
            <Image
              src={setup.qrDataUrl}
              alt="QR code for authenticator app enrolment"
              width={240}
              height={240}
              unoptimized
              style={{ display: 'block', margin: '14px 0', background: '#fff' }}
            />
            <p style={{ fontSize: 13, color: 'var(--gray)' }}>
              No camera? Enter this key by hand:
              <br />
              <code className="mfa-secret">{setup.secret}</code>
            </p>

            <div className="form-row">
              <div className="form-field full">
                <label htmlFor="enrol-code">Code from the app</label>
                <input
                  id="enrol-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={enrolCode}
                  onChange={(e) => setEnrolCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  style={{ fontSize: 18, letterSpacing: '.2em', textAlign: 'center' }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={mfaBusy || enrolCode.length !== 6}
            >
              {mfaBusy ? 'Checking…' : 'Turn on'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setSetup(null)}>
              Cancel
            </button>
          </form>
        ) : (
          <>
            <p className="mfa-state off">
              <span className="dot" aria-hidden="true" /> No authenticator app. You currently get a
              code by email at each sign-in.
            </p>
            <p style={{ fontSize: 13.5, color: 'var(--gray)' }}>
              An authenticator app is stronger — the code never travels through a mailbox, so it
              still protects the console if your email is compromised.
            </p>
            <button className="btn btn-primary" onClick={() => void startSetup()} disabled={mfaBusy}>
              {mfaBusy ? 'Preparing…' : 'Set up authenticator app'}
            </button>
          </>
        )}
      </section>

      <section className="admin-card">
        <h2>Change password</h2>

        {pwStatus && (
          <div className={`form-status ${pwStatus.ok ? 'success' : 'error'}`} role="alert">
            {pwStatus.text}
          </div>
        )}

        <form onSubmit={changePassword}>
          <div className="form-row">
            <div className="form-field full">
              <label htmlFor="currentPassword">Current password</label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field full">
              <label htmlFor="newPassword">New password</label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-field full">
              <label htmlFor="confirmPassword">Confirm new password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
              />
            </div>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--gray)', marginBottom: 14 }}>
            At least 12 characters. Changing it signs out every other session.
          </p>
          <button type="submit" className="btn btn-primary" disabled={pwBusy}>
            {pwBusy ? 'Saving…' : 'Change password'}
          </button>
        </form>
      </section>
    </>
  );
}
