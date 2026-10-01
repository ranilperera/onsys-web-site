'use client';

import { useEffect } from 'react';
import { captureAttribution } from '@/lib/attribution';

/**
 * Records how this visit arrived, once per page load.
 *
 * It has to run on landing rather than at submit: a visitor who arrives on an
 * article from an ad and then clicks through to /contact has no campaign in the
 * URL by the time they fill the form in. An ad click is always a full page load,
 * so mounting this in the root layout catches every entry point, including one
 * that happens mid-session.
 *
 * Renders nothing.
 */
export function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
