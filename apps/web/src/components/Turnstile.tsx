'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { siteConfig } from '@/lib/config';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id: string) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

/** Load Cloudflare's script once per page, however many widgets ask for it. */
function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('turnstile script failed')));
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('turnstile script failed'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Cloudflare Turnstile widget.
 *
 * Renders nothing at all when no site key is configured, and reports an empty
 * token. That is deliberate and mirrors the API: `verifyCaptcha` only enforces
 * when both the secret and the site key are set, so an unconfigured deployment
 * degrades to "no captcha" rather than "no submissions" — which is the outage
 * this pairing was added to prevent.
 *
 * The token is single-use and expires after about five minutes, so `resetKey`
 * lets a form request a fresh one after a failed submit rather than making the
 * visitor reload the page.
 */
export function Turnstile({
  onToken,
  resetKey = 0,
}: {
  onToken: (token: string) => void;
  resetKey?: number;
}) {
  const siteKey = siteConfig.turnstileSiteKey;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const domId = useId();

  // Kept in a ref so re-rendering the parent does not tear the widget down.
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  const render = useCallback(() => {
    const el = containerRef.current;
    if (!el || !siteKey || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(el, {
      sitekey: siteKey,
      callback: (token: string) => onTokenRef.current(token),
      // Turnstile hands back a numeric code that identifies the cause exactly.
      // Without surfacing it, every failure looks the same from the outside and
      // the only way to tell an unregistered hostname from a bad key is to
      // guess. 110200 = domain not on the widget's allow-list; 1102xx = key
      // problems; 3xxxxx/6xxxxx = challenge execution.
      'error-callback': (code?: string) => {
        setErrorCode(code ?? '');
        // eslint-disable-next-line no-console -- the code is the whole diagnosis
        console.error(
          `[turnstile] failed with code ${code ?? '(none)'}. ` +
            '110200 means this hostname is not listed on the widget in the Cloudflare dashboard.',
        );
        onTokenRef.current('');
      },
      // A token that expires mid-form would be rejected on submit, so clear it
      // and let the widget mint a new one.
      'expired-callback': () => onTokenRef.current(''),
      theme: 'light',
      appearance: 'interaction-only',
    });
  }, [siteKey]);

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (!cancelled) render();
      })
      .catch(() => setErrorCode('script-load-failed'));
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [siteKey, render]);

  useEffect(() => {
    if (resetKey && widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current);
      onTokenRef.current('');
    }
  }, [resetKey]);

  if (!siteKey) return null;

  return (
    <div className="turnstile-field">
      <div ref={containerRef} id={`turnstile-${domId}`} />
      {errorCode !== null && (
        <p className="field-error">
          The spam check could not load. Please disable any script blocker, or call us on{' '}
          {siteConfig.phone}.
          {/* Shown so a visitor reporting the problem can quote it, and so it is
              visible in a screenshot without opening developer tools. */}
          {errorCode ? <> (code {errorCode})</> : null}
        </p>
      )}
    </div>
  );
}
