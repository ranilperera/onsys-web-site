-- Chat is not an incident intake channel: a P1 raised there carries no
-- reference number and starts no SLA clock. Visitors reporting a live outage
-- are pointed at the 24/7 number instead, and the team gets a heads-up card.
-- This records that the redirect has already happened, so a long conversation
-- about an outage fires one notification rather than one per message.

-- AlterTable
ALTER TABLE "chat_sessions" ADD COLUMN     "incidentNotifiedAt" TIMESTAMP(3);
