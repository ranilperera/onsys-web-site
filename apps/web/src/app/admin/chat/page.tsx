'use client';

import { useEffect, useState, useCallback } from 'react';
import { siteConfig } from '@/lib/config';

interface SessionRow {
  id: string;
  status: string;
  visitorName: string | null;
  visitorEmail: string | null;
  entryUrl: string | null;
  escalatedAt: string | null;
  createdAt: string;
  _count: { messages: number };
}

interface Message {
  id: string;
  role: string;
  content: string;
  authorName: string | null;
  createdAt: string;
}

/** Reads the CSRF cookie set at login so mutations pass the double-submit check. */
function csrfToken(): string {
  return document.cookie.match(/(?:^|;\s*)onsys_csrf=([^;]+)/)?.[1] ?? '';
}

export default function ChatConsole() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [purgeDays, setPurgeDays] = useState(90);
  const [purging, setPurging] = useState(false);
  const [purgeNote, setPurgeNote] = useState<{ ok: boolean; text: string } | null>(null);

  /**
   * Remove old conversations.
   *
   * Asks the server how many would go before asking the person to confirm — a
   * confirm dialog that cannot say what it is about to delete is one people
   * learn to click through. Open conversations are excluded server-side
   * regardless of age.
   */
  async function purge() {
    setPurging(true);
    setPurgeNote(null);
    try {
      const preview = await fetch(
        `${siteConfig.apiUrl}/api/admin/chat/purge-preview?olderThanDays=${purgeDays}`,
        { credentials: 'include' },
      );
      const { count } = await preview.json();

      if (!count) {
        setPurgeNote({ ok: true, text: `Nothing to delete — no closed sessions older than ${purgeDays} days.` });
        return;
      }

      const ok = window.confirm(
        `Permanently delete ${count} chat ${count === 1 ? 'session' : 'sessions'} older than ` +
          `${purgeDays} days, along with their transcripts?\n\nThis cannot be undone. ` +
          'Conversations still waiting on a reply are not touched.',
      );
      if (!ok) return;

      const res = await fetch(`${siteConfig.apiUrl}/api/admin/chat/purge`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify({ olderThanDays: purgeDays }),
      });
      const body = await res.json();
      if (!res.ok) {
        setPurgeNote({ ok: false, text: body.error ?? 'Could not delete those sessions.' });
        return;
      }

      setPurgeNote({
        ok: true,
        text: `Deleted ${body.deleted} ${body.deleted === 1 ? 'session' : 'sessions'}.`,
      });
      setActive(null);
      setMessages([]);
      loadSessions();
    } catch {
      setPurgeNote({ ok: false, text: 'Could not reach the server.' });
    } finally {
      setPurging(false);
    }
  }

  const loadSessions = useCallback(() => {
    fetch(`${siteConfig.apiUrl}/api/admin/chat`, { credentials: 'include' })
      .then((r) => {
        if (r.status === 401) {
          // Carry the destination through the login so the Teams card's link
          // lands on the right conversation rather than the dashboard.
          const next = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/admin/login?next=${next}`;
          return null;
        }
        return r.json();
      })
      .then((d) => d && setSessions(d.sessions));
  }, []);

  const loadMessages = useCallback((id: string) => {
    fetch(`${siteConfig.apiUrl}/api/admin/chat/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setMessages(d.session?.messages ?? []));
  }, []);

  useEffect(loadSessions, [loadSessions]);

  /**
   * Deep link from the Teams escalation card: /admin/chat?session=<id> opens
   * that conversation straight away. Without it the card can only drop an
   * agent on the list, leaving them to match a cuid by eye against the session
   * id printed on the card — which is the moment they give up and use email.
   *
   * Read from window rather than useSearchParams: this page is a client
   * component with no Suspense boundary around it, and useSearchParams would
   * opt the whole route into client-side bailout at build time.
   */
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('session');
    if (id) setActive(id);
  }, []);

  // Poll the open conversation so an agent sees visitor replies live.
  useEffect(() => {
    if (!active) return;
    loadMessages(active);
    const t = setInterval(() => loadMessages(active), 5000);
    return () => clearInterval(t);
  }, [active, loadMessages]);

  async function send() {
    if (!active || !reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/admin/chat/${active}/reply`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken() },
        body: JSON.stringify({ message: reply }),
      });
      if (res.ok) {
        setReply('');
        loadMessages(active);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 style={{ fontSize: 26, marginBottom: 8 }}>Live chat</h1>
          <p style={{ color: 'var(--gray)', fontSize: 14, margin: 0 }}>
            Conversations escalated from the website. Replies here appear in the visitor&apos;s chat
            widget within a few seconds.
          </p>
        </div>

        <div className="purge-control">
          <label htmlFor="purge-days">Delete sessions older than</label>
          <select
            id="purge-days"
            value={purgeDays}
            onChange={(e) => setPurgeDays(Number(e.target.value))}
          >
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={180}>6 months</option>
            <option value={365}>1 year</option>
          </select>
          <button className="btn btn-outline btn-sm" onClick={() => void purge()} disabled={purging}>
            {purging ? 'Deleting…' : 'Delete old sessions'}
          </button>
        </div>
      </div>

      {purgeNote && (
        <div className={`form-status ${purgeNote.ok ? 'success' : 'error'}`} role="status">
          {purgeNote.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
        <div>
          {sessions.length === 0 && <p style={{ color: 'var(--gray)' }}>No conversations yet.</p>}
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: 14,
                marginBottom: 8,
                borderRadius: 8,
                border: '1px solid var(--gray-light)',
                background: active === s.id ? '#EAF1FB' : '#fff',
                cursor: 'pointer',
                font: 'inherit',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--navy)' }}>
                {s.visitorName ?? 'Anonymous visitor'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--gray)' }}>
                {s.status} · {s._count.messages} messages
              </div>
              <div style={{ fontSize: 11, color: 'var(--gray)' }}>
                {new Date(s.createdAt).toLocaleString('en-AU')}
              </div>
            </button>
          ))}
        </div>

        <div>
          {!active ? (
            <p style={{ color: 'var(--gray)' }}>Select a conversation to view the transcript.</p>
          ) : (
            <div className="form-card">
              <div style={{ maxHeight: 440, overflowY: 'auto', marginBottom: 16 }}>
                {messages.map((m) => (
                  <div key={m.id} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>
                      {m.role === 'VISITOR'
                        ? 'Visitor'
                        : m.role === 'AGENT'
                          ? (m.authorName ?? 'Onsys')
                          : m.role === 'SYSTEM'
                            ? 'System'
                            : 'Assistant'}
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.content}</div>
                  </div>
                ))}
              </div>

              <div className="chat-input-row">
                <label htmlFor="agent-reply" className="sr-only">
                  Your reply
                </label>
                <textarea
                  id="agent-reply"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your reply to the visitor…"
                  rows={3}
                />
                <button className="btn btn-primary" onClick={send} disabled={sending || !reply.trim()}>
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
