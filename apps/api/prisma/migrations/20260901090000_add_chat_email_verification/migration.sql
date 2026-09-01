-- Email verification gate for the chat widget, plus the client IP for the
-- audit trail alongside the existing hash.

-- AlterTable
ALTER TABLE "chat_sessions" ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "otpHash" TEXT,
ADD COLUMN     "otpExpiresAt" TIMESTAMP(3),
ADD COLUMN     "otpSentAt" TIMESTAMP(3),
ADD COLUMN     "otpAttempts" INTEGER NOT NULL DEFAULT 0;

-- Conversations that already exist predate the gate. Leaving them at the
-- column default would lock every one of them the moment this deploys,
-- stranding anyone mid-chat and making old sessions impossible to reopen.
UPDATE "chat_sessions" SET "emailVerified" = true;

-- CreateIndex
CREATE INDEX "chat_sessions_visitorEmail_idx" ON "chat_sessions"("visitorEmail");
