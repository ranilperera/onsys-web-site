import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CancelBooking } from './CancelBooking';

export const metadata: Metadata = {
  title: 'Cancel your consultation',
  // A cancellation link is personal and single-purpose; keep it out of search.
  robots: { index: false, follow: false },
};

export default function CancelPage() {
  return (
    <section>
      <div className="wrap wrap-narrow">
        {/* useSearchParams needs a Suspense boundary to prerender this route. */}
        <Suspense fallback={<div className="booking-loading">Loading…</div>}>
          <CancelBooking />
        </Suspense>
      </div>
    </section>
  );
}
