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
