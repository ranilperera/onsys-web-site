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

  const loadSessions = useCallback(() => {
    fetch(`${siteConfig.apiUrl}/api/admin/chat`, { credentials: 'include' })
      .then((r) => (r.status === 401 ? (window.location.href = '/admin/login', null) : r.json()))
      .then((d) => d && setSessions(d.sessions));
  }, []);

  const loadMessages = useCallback((id: string) => {
    fetch(`${siteConfig.apiUrl}/api/admin/chat/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setMessages(d.session?.messages ?? []));
  }, []);

  useEffect(loadSessions, [loadSessions]);

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
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>Live chat</h1>
      <p style={{ color: 'var(--gray)', fontSize: 14, marginBottom: 22 }}>
        Conversations escalated from the website. Replies here appear in the visitor&apos;s chat widget
        within a few seconds.
      </p>

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
