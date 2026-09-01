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
type Phase = 'form' | 'code' | 'chat';

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

  /**
   * Three phases: collect details, verify the emailed code, then chat.
   *
   * The gate exists so an address in the database is one somebody actually
   * reads. It also prices out casual abuse: every conversation now costs a
   * working inbox, so a script cannot open hundreds of sessions or page the
   * on-call team for free.
   */
  const [phase, setPhase] = useState<Phase>('form');
  const [form, setForm] = useState({ name: '', email: '' });
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeNote, setCloseNote] = useState<string | null>(null);

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
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as { id?: string; verified?: boolean };
      // Only a verified session is worth resuming. An unverified one holds no
      // messages and its code has usually expired, so restoring it would drop
      // the visitor on a code screen they can no longer complete.
      if (parsed?.id && parsed.verified) {
        setSessionId(parsed.id);
        setPhase('chat');
        return;
      }
    } catch {
      /* value written by an older build — discard rather than guess */
    }
    window.sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const startSession = useCallback(async (
    details?: { name?: string; email?: string },
  ): Promise<string | null> => {
    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/chat/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryUrl: window.location.pathname,
          // Send only what we actually have — the schema rejects an empty
          // string as an invalid email and would fail the whole start call.
          ...(details?.name?.trim() ? { name: details.name.trim() } : {}),
          ...(details?.email?.trim() ? { email: details.email.trim() } : {}),
        }),
      });
      if (!res.ok) throw new Error('Could not start chat');

      const data = await res.json();
      setSessionId(data.sessionId);
      setMessages([]);
      setStatus(data.status ?? 'BOT');
      setPhase('code');
      setNotice(
        data.emailSent
          ? `We've sent a 6-digit code to ${data.email}. It expires in 10 minutes.`
          : `We couldn't email a code just now. Please call ${siteConfig.phone} and we'll help straight away.`,
      );
      window.sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ id: data.sessionId, verified: false }),
      );
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

  // Only a verified conversation has history to reload; the other phases are
  // driven by the form and the code screen, not by this effect.
  useEffect(() => {
    if (!open || phase !== 'chat' || !sessionId) return;
    void loadHistory(sessionId);
    setTimeout(() => inputRef.current?.focus(), 120);
  }, [open, phase, sessionId, loadHistory]);

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

  const verifyCode = useCallback(async () => {
    if (!sessionId || verifying) return;
    const entered = code.trim();
    if (!/^\d{6}$/.test(entered)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }

    setVerifying(true);
    setError(null);
    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/chat/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, code: entered }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'That code did not work.');
        // Expired or burned through its attempts — the only way on is a new one.
        if (data.expired) setCode('');
        return;
      }

      setMessages(data.messages ?? []);
      setStatus(data.status ?? 'BOT');
      setPhase('chat');
      setNotice(null);
      setCode('');
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: sessionId, verified: true }));
    } catch {
      setError(`Could not check that code. Please try again, or call ${siteConfig.phone}.`);
    } finally {
      setVerifying(false);
    }
  }, [sessionId, code, verifying]);

  const resendCode = useCallback(async () => {
    if (!sessionId || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/chat/resend-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not send another code.');
        return;
      }
      setNotice(
        data.emailSent
          ? 'A new code is on its way. It expires in 10 minutes.'
          : `We couldn't email a code just now. Please call ${siteConfig.phone}.`,
      );
    } catch {
      setError(`Could not send another code. Please call ${siteConfig.phone}.`);
    } finally {
      setVerifying(false);
    }
  }, [sessionId, verifying]);

  const endChat = useCallback(async () => {
    if (!sessionId || closing) return;
    setClosing(true);
    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/chat/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          ...(form.email.trim() ? { email: form.email.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not end the chat.');
        return;
      }

      setStatus('CLOSED');
      setCloseNote(
        data.transcriptSent
          ? `Chat ended. We've emailed the transcript to ${data.email}.`
          : "Chat ended. Thanks for getting in touch.",
      );
      // The session is finished server-side; drop it so reopening the widget
      // starts a fresh conversation rather than resuming a closed one.
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      setError(`Could not end the chat. Please call ${siteConfig.phone} if you still need us.`);
    } finally {
      setClosing(false);
    }
  }, [sessionId, closing, form.email]);

  const startFresh = useCallback(() => {
    setSessionId(null);
    setMessages([]);
    setStatus('BOT');
    setCloseNote(null);
    setError(null);
    setNotice(null);
    setCode('');
    setPhase('form');
    lastPolledRef.current = null;
  }, []);

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

          {phase === 'form' ? (
            <div className="chat-body">
              <form
                className="chat-prechat"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (sending) return;
                  setError(null);
                  setSending(true);
                  void startSession({ name: form.name, email: form.email }).finally(() =>
                    setSending(false),
                  );
                }}
              >
                <h4>Before we start</h4>
                <p>
                  We&rsquo;ll email you a 6-digit code to confirm your address, then send you a copy
                  of the conversation when you&rsquo;re done.
                </p>

                <label htmlFor="chat-name">Name</label>
                <input
                  id="chat-name"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Your name"
                />

                <label htmlFor="chat-email">Work email</label>
                <input
                  id="chat-email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={200}
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="you@company.com.au"
                />

                {error && <p className="chat-form-error" role="alert">{error}</p>}

                <button type="submit" className="btn btn-primary btn-block" disabled={sending}>
                  {sending ? 'Sending code…' : 'Start chat'}
                </button>
                <p className="chat-prechat-foot">
                  In a hurry? Call <a href={`tel:${siteConfig.phoneE164}`}>{siteConfig.phone}</a> and
                  speak to a consultant now.
                </p>
              </form>
            </div>
          ) : phase === 'code' ? (
            <div className="chat-body">
              <form
                className="chat-prechat"
                onSubmit={(e) => {
                  e.preventDefault();
                  void verifyCode();
                }}
              >
                <h4>Check your email</h4>
                {notice && <p>{notice}</p>}

                <label htmlFor="chat-code">6-digit code</label>
                <input
                  id="chat-code"
                  className="chat-code-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                />

                {error && <p className="chat-form-error" role="alert">{error}</p>}

                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={verifying || code.length !== 6}
                >
                  {verifying ? 'Checking…' : 'Verify and start chatting'}
                </button>
                <button
                  type="button"
                  className="chat-skip-btn"
                  onClick={() => void resendCode()}
                  disabled={verifying}
                >
                  Send me a new code
                </button>
                <button type="button" className="chat-skip-btn" onClick={startFresh}>
                  Use a different email
                </button>
              </form>
            </div>
          ) : (
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

            {closeNote && <div className="chat-msg system">{closeNote}</div>}
            {error && <div className="chat-msg system">{error}</div>}
          </div>
          )}

          {/* The composer exists only in the chat phase. Rendering it beside
              the form let a visitor type straight past the gate — the input
              sat under the pre-chat panel and posted messages happily. */}
          {phase !== 'chat' ? null : status === 'CLOSED' ? (
            <div className="chat-foot">
              <button className="btn btn-primary btn-block" onClick={startFresh}>
                Start a new chat
              </button>
            </div>
          ) : (
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

            <div className="chat-foot-actions">
              {status === 'BOT' && (
                <button className="chat-human-btn" onClick={() => void requestHuman()} disabled={sending}>
                  Talk to a human instead
                </button>
              )}
              {sessionId && (
                <button className="chat-end-btn" onClick={() => void endChat()} disabled={closing}>
                  {closing ? 'Ending…' : 'End chat'}
                </button>
              )}
            </div>
          </div>
          )}
        </div>
      )}
    </>
  );
}
