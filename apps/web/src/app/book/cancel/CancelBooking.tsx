'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { siteConfig } from '@/lib/config';

/**
 * Self-service cancellation reached from the link in a confirmation email.
 *
 * The token is the only credential, so cancelling is deliberately a POST behind
 * a button press rather than something that happens on page load — otherwise a
 * mail client or link scanner prefetching the URL would silently cancel a real
 * booking.
 */
export function CancelBooking() {
  const token = useSearchParams().get('token') ?? '';
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function cancel() {
    setState('working');
    try {
      const res = await fetch(`${siteConfig.apiUrl}/api/bookings/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState('error');
        setMessage(data.error ?? 'We could not cancel that booking.');
        return;
      }
      setState('done');
      setMessage(data.when ? `Your consultation on ${data.when} has been cancelled.` : 'Your consultation has been cancelled.');
    } catch {
      setState('error');
      setMessage(`We could not reach the booking service. Please call ${siteConfig.phone}.`);
    }
  }

  if (!token) {
    return (
      <div className="booking-fallback">
        <h2>That link is incomplete</h2>
        <p>
          Use the cancellation link in your confirmation email, or call{' '}
          <a href={`tel:${siteConfig.phoneE164}`}>{siteConfig.phone}</a> and we will sort it out.
        </p>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="booking-fallback">
        <h2>Cancelled</h2>
        <p>{message}</p>
        <p>No hard feelings — book another time whenever it suits.</p>
        <a className="btn btn-primary" href="/book">
          Book a different time
        </a>
      </div>
    );
  }

  return (
    <div className="booking-fallback">
      <h2>Cancel your consultation?</h2>
      <p>
        This releases the slot and removes the meeting from our calendar. You can book another time
        immediately afterwards.
      </p>
      {state === 'error' && (
        <p className="form-status error" role="alert">
          {message}
        </p>
      )}
      <div className="page-hero-cta">
        <button className="btn btn-primary" type="button" onClick={cancel} disabled={state === 'working'}>
          {state === 'working' ? 'Cancelling…' : 'Yes, cancel it'}
        </button>
        <a className="btn btn-outline" href="/">
          Keep my booking
        </a>
      </div>
    </div>
  );
}
