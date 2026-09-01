/** Request/response contracts shared by the API and the web app. */
import { z } from 'zod';

export const leadInputSchema = z.object({
  name: z.string().min(2, 'Please enter your name').max(120),
  email: z.string().email('Please enter a valid email address').max(200),
  company: z.string().max(160).optional().or(z.literal('')),
  phone: z.string().max(40).optional().or(z.literal('')),
  service: z.string().max(120).optional().or(z.literal('')),
  message: z.string().max(5000).optional().or(z.literal('')),
  // Anti-spam: must be empty. Real users never see this field.
  website: z.string().max(0).optional(),
  captchaToken: z.string().optional(),
  utmSource: z.string().max(120).optional(),
  utmMedium: z.string().max(120).optional(),
  utmCampaign: z.string().max(120).optional(),
  referrer: z.string().max(500).optional(),
});
export type LeadInput = z.infer<typeof leadInputSchema>;

export const chatStartSchema = z.object({
  entryUrl: z.string().max(500).optional(),
  /// Both required: the chat is gated behind a code emailed to this address,
  /// so an unreachable inbox means no conversation.
  name: z.string().trim().min(1, 'Please tell us your name').max(120),
  email: z.string().trim().email('Enter a valid email address').max(200),
});

export const chatVerifySchema = z.object({
  sessionId: z.string().min(1),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code from your email'),
});

export const chatResendSchema = z.object({
  sessionId: z.string().min(1),
});

export const chatCloseSchema = z.object({
  sessionId: z.string().min(1),
  /// Where to send the transcript. Falls back to the address given at the
  /// start of the chat; omit both and the conversation just closes.
  email: z.string().email().max(200).optional(),
});

export const chatMessageSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1, 'Message cannot be empty').max(2000),
});

export const chatEscalateSchema = z.object({
  sessionId: z.string().min(1),
  name: z.string().max(120).optional(),
  email: z.string().email().max(200).optional(),
  reason: z.string().max(500).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/**
 * Second factor. One field takes either a 6-digit authenticator code or a
 * recovery code — asking someone to first classify what they are holding is a
 * step that only exists to serve the implementation.
 */
export const mfaVerifySchema = z.object({
  challengeId: z.string().min(1),
  code: z.string().trim().min(6).max(20),
});

export const mfaSendEmailSchema = z.object({
  challengeId: z.string().min(1),
});

export const mfaEnableSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app'),
});

export const mfaDisableSchema = z.object({
  password: z.string().min(1, 'Confirm your password to turn off two-factor authentication'),
});

/**
 * Twelve characters to match what create-admin enforces, so the console cannot
 * be used to set a password the CLI would have rejected.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(12, 'Use at least 12 characters'),
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: 'The new password must be different from the current one',
    path: ['newPassword'],
  });

export const purgeChatSchema = z.object({
  /// Sessions last touched before this many days ago are removed. Floored at 7
  /// so a mistyped 0 cannot wipe conversations that are still open.
  olderThanDays: z.coerce.number().int().min(7).max(3650),
});

export interface Citation {
  title: string;
  url: string;
}

export interface ChatReply {
  sessionId: string;
  reply: string;
  citations: Citation[];
  status: 'BOT' | 'WAITING_HUMAN' | 'HUMAN' | 'CLOSED';
  escalated: boolean;
}

// --- Booking ---------------------------------------------------------------

/** Query for the slot grid: an inclusive local-date range, YYYY-MM-DD. */
export const availabilityQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD').optional(),
  days: z.coerce.number().int().min(1).max(31).default(14),
});

export const bookingInputSchema = z.object({
  name: z.string().min(2, 'Please enter your name').max(120),
  email: z.string().email('Please enter a valid email address').max(200),
  company: z.string().max(160).optional().or(z.literal('')),
  phone: z.string().max(40).optional().or(z.literal('')),
  topic: z.string().max(120).optional().or(z.literal('')),
  message: z.string().max(2000).optional().or(z.literal('')),
  /// ISO-8601 UTC instant of the slot start, exactly as the availability
  /// response returned it. The server re-validates it against live free/busy —
  /// a client is never trusted to have picked a slot that is still open.
  startsAt: z.string().datetime({ message: 'Please choose a time' }),
  // Anti-spam: must be empty. Real users never see this field.
  website: z.string().max(0).optional(),
  captchaToken: z.string().optional(),
  utmSource: z.string().max(120).optional(),
  utmMedium: z.string().max(120).optional(),
  utmCampaign: z.string().max(120).optional(),
  referrer: z.string().max(500).optional(),
});
export type BookingInput = z.infer<typeof bookingInputSchema>;

export interface AvailabilitySlot {
  /// UTC instant, ISO-8601. The value posted back when booking.
  startsAt: string;
  endsAt: string;
  /// Pre-formatted for display, e.g. "9:30 am", in the booking timezone.
  label: string;
}

export interface AvailabilityDay {
  /// Local calendar date in the booking timezone, YYYY-MM-DD.
  date: string;
  /// e.g. "Tue 26 Aug".
  label: string;
  slots: AvailabilitySlot[];
}

export interface AvailabilityResponse {
  enabled: boolean;
  timezone: string;
  slotMinutes: number;
  consultantName: string;
  days: AvailabilityDay[];
}

export interface BookingConfirmation {
  reference: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  /// Formatted in the booking timezone, e.g. "Tuesday 26 August, 9:30 am".
  when: string;
  joinUrl: string | null;
  consultantName: string;
  cancelUrl: string;
}
