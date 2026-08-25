'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { siteConfig } from '@/lib/config';

interface Message {
  id?: string;
  role: 'VISITOR' | 'ASSISTANT' | 'AGENT' | 'SYSTEM';
  content: string;
  authorName?: string | null;
  citations?: Array<{ title: string; url: string }> | null;
  createdAt?: string;
}

type Status = 'BOT' | 'WAITING_HUMAN' | 'HUMAN' | 'CLOSED';

const SESSION_KEY = 'onsys_chat_session';
/** Only poll while a human is involved — no point burning requests otherwise. */
const POLL_INTERVAL_MS = 4000;

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<Status>('BOT');
  const [error, setError] = useState<string | null>(null);

  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastPolledRef = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    });
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  // Restore an in-progress conversation across page navigations.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.sessionStorage.getItem(SESSION_KEY);
    if (stored) setSessionId(stored);
  }, []);

  const startSession = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/chat/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryUrl: window.location.pathname }),
      });
      if (!res.ok) throw new Error('Could not start chat');

      const data = await res.json();
      setSessionId(data.sessionId);
      setMessages(data.messages ?? []);
      setStatus(data.status ?? 'BOT');
      window.sessionStorage.setItem(SESSION_KEY, data.sessionId);
      return data.sessionId as string;
    } catch {
      setError(`Chat is unavailable right now. Please email us or call ${siteConfig.phone}.`);
      return null;
    }
  }, []);

  const loadHistory = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/chat/${id}/messages`);
      if (!res.ok) {
        // Stale session (server restarted / cleaned up) — drop it and start fresh.
        window.sessionStorage.removeItem(SESSION_KEY);
        setSessionId(null);
        return;
      }
      const data = await res.json();
      setMessages(data.messages ?? []);
      setStatus(data.status ?? 'BOT');
    } catch {
      /* transient — the poll will retry */
    }
  }, []);

  // Open: resume or start.
  useEffect(() => {
    if (!open) return;
    if (sessionId) {
      void loadHistory(sessionId);
    } else {
      void startSession();
    }
    setTimeout(() => inputRef.current?.focus(), 120);
  }, [open, sessionId, startSession, loadHistory]);

  // Poll for agent replies once a human is in the loop.
  useEffect(() => {
    if (!open || !sessionId) return;
    if (status !== 'WAITING_HUMAN' && status !== 'HUMAN') return;

    const timer = setInterval(async () => {
      try {
        const since = lastPolledRef.current;
        const url = new URL(`${siteConfig.apiUrl}/api/chat/${sessionId}/messages`);
        if (since) url.searchParams.set('since', since);

        const res = await fetch(url.toString());
        if (!res.ok) return;

        const data = await res.json();
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id).filter(Boolean));
            const fresh = (data.messages as Message[]).filter((m) => !m.id || !seen.has(m.id));
            return fresh.length ? [...prev, ...fresh] : prev;
          });
          lastPolledRef.current = data.messages[data.messages.length - 1].createdAt ?? null;
        }
        if (data.status) setStatus(data.status);
      } catch {
        /* keep polling */
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [open, sessionId, status]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    let id = sessionId;
    if (!id) {
      id = await startSession();
      if (!id) return;
    }

    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'VISITOR', content: text }]);
    setSending(true);

    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id, message: text }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Message could not be sent.');
        return;
      }

      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          { role: data.escalated ? 'SYSTEM' : 'ASSISTANT', content: data.reply, citations: data.citations },
        ]);
      } else if (data.note) {
        setMessages((prev) => [...prev, { role: 'SYSTEM', content: data.note }]);
      }

      if (data.status) setStatus(data.status);
    } catch {
      setError(`Connection problem. Please try again, or call ${siteConfig.phone}.`);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, sessionId, startSession]);

  const requestHuman = useCallback(async () => {
    if (!sessionId) return;
    setSending(true);
    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/chat/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, reason: 'Visitor clicked "talk to a human"' }),
      });
      const data = await res.json();
      if (data.reply) setMessages((prev) => [...prev, { role: 'SYSTEM', content: data.reply }]);
      if (data.status) setStatus(data.status);
    } catch {
      setError(`Could not reach the team. Please call ${siteConfig.phone}.`);
    } finally {
      setSending(false);
    }
  }, [sessionId]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const statusLabel =
    status === 'HUMAN'
      ? 'Onsys team member connected'
      : status === 'WAITING_HUMAN'
        ? 'Connecting you to the team…'
        : 'AI assistant · replies instantly';

  return (
    <>
      {!open && (
        <button className="chat-launcher" onClick={() => setOpen(true)} aria-label="Open chat">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3C6.98 3 3 6.58 3 11c0 2.4 1.2 4.54 3.1 5.98V21l3.6-2.02c.74.18 1.5.27 2.3.27 5.02 0 9-3.58 9-8s-3.98-8-9-8z" />
          </svg>
          <span className="badge-dot" aria-hidden="true" />
        </button>
      )}

      {open && (
        <div className="chat-panel" role="dialog" aria-label="Chat with Onsys Technologies" aria-modal="false">
          <div className="chat-head">
            <div>
              <h3>Chat with Onsys</h3>
              <span className={`chat-status${status === 'HUMAN' ? ' human' : ''}`}>
                <span className="dot" aria-hidden="true" />
                {statusLabel}
              </span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat">
              ×
            </button>
          </div>

          <div className="chat-body" ref={bodyRef} role="log" aria-live="polite" aria-atomic="false">
            {messages.map((m, i) => (
              <div key={m.id ?? i} className={`chat-msg ${m.role.toLowerCase()}`}>
                {m.role === 'AGENT' && m.authorName && <div className="chat-author">{m.authorName}</div>}
                {m.content}
                {m.citations && m.citations.length > 0 && (
                  <div className="chat-cites">
                    {m.citations.map((c) => (
                      <a key={c.url} href={c.url}>
                        {c.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="chat-typing" aria-label="Assistant is typing">
                <span />
                <span />
                <span />
              </div>
            )}

            {error && <div className="chat-msg system">{error}</div>}
          </div>

          <div className="chat-foot">
            <div className="chat-input-row">
              <label htmlFor="chat-input" className="sr-only">
                Your message
              </label>
              <textarea
                id="chat-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about our services…"
                rows={1}
                maxLength={2000}
                disabled={status === 'CLOSED'}
              />
              <button
                className="chat-send"
                onClick={() => void send()}
                disabled={!input.trim() || sending}
                aria-label="Send message"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
                </svg>
              </button>
            </div>

            {status === 'BOT' && (
              <button className="chat-human-btn" onClick={() => void requestHuman()} disabled={sending}>
                Talk to a human instead
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
