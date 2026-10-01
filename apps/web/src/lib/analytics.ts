/**
 * Conversion goals.
 *
 * Plausible counts pageviews on its own. It does not know that a form was
 * submitted, and three of the four conversions on this site finish without a
 * navigation — the contact form, the booking widget and the health-check
 * request all render their confirmation in place. Without an explicit event
 * they are invisible, which is why the only numbers available for the traffic
 * analysis were Search Console clicks.
 *
 * The names are stable strings because they become the goal names in the
 * Plausible dashboard; renaming one starts a new series and loses the history.
 */
export const GOALS = {
  contact: 'Lead: Contact form',
  healthCheck: 'Lead: Health check',
  booking: 'Lead: Booking',
  emergency: 'Lead: Emergency',
} as const;

export type Goal = (typeof GOALS)[keyof typeof GOALS];

declare global {
  interface Window {
    plausible?: ((event: string, options?: { props?: Record<string, string> }) => void) & {
      q?: unknown[];
    };
  }
}

/**
 * Record a conversion.
 *
 * Deliberately silent when analytics is not configured — it is off in
 * development by design, and a visitor's form submission must never depend on
 * an analytics script having loaded.
 */
export function trackGoal(goal: Goal, props?: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.plausible?.(goal, props ? { props } : undefined);
  } catch {
    // An ad blocker, a failed script load, or a CSP refusal. None of these are
    // the visitor's problem.
  }
}
