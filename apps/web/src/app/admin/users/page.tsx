'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, type Role } from '@onsys/shared';
import { adminFetch, AdminRequestError } from '@/lib/admin';
import { useAdminUser } from '@/lib/adminUser';

/**
 * Console accounts.
 *
 * Exists so an author account can be created without an SSH session. Before
 * this the only way was create-admin.ts on the VM, which meant in practice
 * that nobody was given one and the blog was written through the single admin
 * login.
 *
 * The temporary password is shown once, on this screen, and is never emailed.
 * An emailed credential sits in a mailbox for as long as the mailbox is kept.
 */

interface AccountRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  authorId: string | null;
  disabledAt: string | null;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  totpEnabledAt: string | null;
  author: { id: string; name: string; slug: string } | null;
}

interface Byline {
  id: string;
  name: string;
}

const EMPTY = { email: '', name: '', role: 'AUTHOR' as Role, authorId: '' };

function when(value: string | null): string {
  if (!value) return 'Never';
  return new Date(value).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function AccountsPage() {
  const { user: me } = useAdminUser();
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [bylines, setBylines] = useState<Byline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState(EMPTY);
  const [issued, setIssued] = useState<{ name: string; email: string; password: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    try {
      const [users, authors] = await Promise.all([
        adminFetch<{ users: AccountRow[] }>('/users'),
        adminFetch<{ authors: Byline[] }>('/authors'),
      ]);
      setRows(users.users);
      setBylines(authors.authors);
      setError(null);
    } catch (e) {
      setError(e instanceof AdminRequestError ? e.message : 'Could not load accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await adminFetch<{ user: AccountRow; temporaryPassword: string }>('/users', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email,
          name: form.name,
          role: form.role,
          authorId: form.authorId || null,
        }),
      });
      setIssued({
        name: result.user.name,
        email: result.user.email,
        password: result.temporaryPassword,
      });
      setForm(EMPTY);
      await load();
    } catch (e) {
      setError(e instanceof AdminRequestError ? e.message : 'Could not create that account.');
    } finally {
      setBusy(false);
    }
  }

  async function save(row: AccountRow, changes: Partial<AccountRow> & { disabled?: boolean }) {
    setBusy(true);
    setError(null);
    try {
      await adminFetch(`/users/${row.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: changes.name ?? row.name,
          role: changes.role ?? row.role,
          authorId: changes.authorId !== undefined ? changes.authorId : row.authorId,
          disabled: changes.disabled ?? Boolean(row.disabledAt),
        }),
      });
      await load();
    } catch (e) {
      setError(e instanceof AdminRequestError ? e.message : 'Could not save that change.');
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(row: AccountRow) {
    if (
      !confirm(
        `Issue a new temporary password for ${row.name}?\n\nTheir current password stops working immediately and any open session is signed out.`,
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      const result = await adminFetch<{ temporaryPassword: string }>(
        `/users/${row.id}/reset-password`,
        { method: 'POST', body: JSON.stringify({}) },
      );
      setIssued({ name: row.name, email: row.email, password: result.temporaryPassword });
      await load();
    } catch (e) {
      setError(e instanceof AdminRequestError ? e.message : 'Could not reset that password.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: AccountRow) {
    if (
      !confirm(
        `Delete ${row.name} (${row.email}) for good?\n\nSuspending is usually the better answer: it stops them signing in but keeps the record of which jobs they posted and which applications they moved. Deleting loses that.`,
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      await adminFetch(`/users/${row.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ confirm: true }),
      });
      await load();
    } catch (e) {
      setError(e instanceof AdminRequestError ? e.message : 'Could not delete that account.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p>Loading…</p>;

  return (
    <>
      <h1 style={{ fontSize: 26, marginBottom: 6 }}>Accounts</h1>
      <p style={{ color: 'var(--gray)', marginBottom: 24, maxWidth: '62ch' }}>
        Who can sign in to this console, and how much of it they see. Every account gets a second
        factor at sign-in whether or not they enrol an authenticator — a code is emailed when they
        have not.
      </p>

      {error ? (
        <div className="form-status error" style={{ marginBottom: 18 }}>
          {error}
        </div>
      ) : null}

      {issued ? (
        <section
          className="admin-card"
          style={{ marginBottom: 24, borderColor: 'var(--orange)', borderWidth: 2 }}
        >
          <h2 style={{ fontSize: 17, marginBottom: 8 }}>
            Temporary password for {issued.name}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--gray)', marginBottom: 10 }}>
            {issued.email}
          </p>
          <code
            style={{
              display: 'block',
              fontSize: 20,
              letterSpacing: '0.04em',
              padding: '12px 14px',
              background: 'var(--surface-gray)',
              border: '1px solid var(--gray-light)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 12,
            }}
          >
            {issued.password}
          </code>
          <p style={{ fontSize: 14, color: 'var(--gray)', margin: '0 0 12px' }}>
            Shown once and stored nowhere. Read it to them, or hand it over in person — not by
            email, which keeps a working password in a mailbox for as long as the mailbox is kept.
            They must replace it before the console will do anything else.
          </p>
          <button type="button" className="btn btn-outline" onClick={() => setIssued(null)}>
            I have passed it on
          </button>
        </section>
      ) : null}

      <section className="admin-card" style={{ marginBottom: 30 }}>
        <h2 style={{ fontSize: 18, marginBottom: 14 }}>Add an account</h2>
        <form onSubmit={create}>
          <div className="form-row">
          <div className="form-field">
            <label htmlFor="u-name">Name</label>
            <input
              id="u-name"
              required
              maxLength={120}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="u-email">Work email</label>
            <input
              id="u-email"
              type="email"
              required
              maxLength={200}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <small style={{ color: 'var(--gray)', fontSize: 12 }}>
              This is the identity the password and the second factor hang off, so it cannot be
              changed later. A new address means a new account.
            </small>
          </div>
          </div>

          <div className="form-row">
          <div className="form-field">
            <label htmlFor="u-role">Role</label>
            <select
              id="u-role"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <small style={{ color: 'var(--gray)', fontSize: 12 }}>{ROLE_DESCRIPTIONS[form.role]}</small>
          </div>
          <div className="form-field">
            <label htmlFor="u-byline">Byline</label>
            <select
              id="u-byline"
              value={form.authorId}
              onChange={(e) => setForm((f) => ({ ...f, authorId: e.target.value }))}
              required={form.role === 'AUTHOR'}
            >
              <option value="">
                {form.role === 'AUTHOR' ? 'Choose a byline…' : 'None'}
              </option>
              {bylines.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <small style={{ color: 'var(--gray)', fontSize: 12 }}>
              {form.role === 'AUTHOR' ? (
                <>
                  Required. An author&rsquo;s articles are the articles carrying this byline — it is
                  what they see and all they can write under. Create one first under{' '}
                  <Link href="/admin/authors">Authors</Link> if it is not listed.
                </>
              ) : (
                'Optional for an administrator or editor.'
              )}
            </small>
          </div>
          </div>

          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
      </section>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Byline</th>
            <th>Last sign-in</th>
            <th>Second factor</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isMe = row.id === me?.id;
            const suspended = Boolean(row.disabledAt);
            return (
              <tr key={row.id} style={suspended ? { opacity: 0.55 } : undefined}>
                <td>
                  <strong>{row.name}</strong>
                  {isMe ? <span style={{ color: 'var(--gray)' }}> — you</span> : null}
                  <div style={{ fontSize: 13, color: 'var(--gray)' }}>{row.email}</div>
                  {suspended ? (
                    <div style={{ fontSize: 13, color: 'var(--orange-text)' }}>Suspended</div>
                  ) : null}
                  {row.mustChangePassword ? (
                    <div style={{ fontSize: 13, color: 'var(--gray)' }}>
                      Has not set their own password yet
                    </div>
                  ) : null}
                </td>
                <td>
                  <select
                    value={row.role}
                    disabled={busy || isMe}
                    onChange={(e) => void save(row, { role: e.target.value as Role })}
                    title={isMe ? 'You cannot change your own role.' : undefined}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={row.authorId ?? ''}
                    disabled={busy}
                    onChange={(e) => void save(row, { authorId: e.target.value || null })}
                  >
                    <option value="">None</option>
                    {bylines.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{when(row.lastLoginAt)}</td>
                <td>{row.totpEnabledAt ? 'Authenticator' : 'Emailed code'}</td>
                <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={busy}
                    onClick={() => void resetPassword(row)}
                  >
                    Reset password
                  </button>{' '}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={busy || isMe}
                    onClick={() => void save(row, { disabled: !suspended })}
                    title={isMe ? 'You cannot suspend your own account.' : undefined}
                  >
                    {suspended ? 'Restore' : 'Suspend'}
                  </button>{' '}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={busy || isMe}
                    onClick={() => void remove(row)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
