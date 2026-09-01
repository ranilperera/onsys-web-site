-- Multi-factor authentication for the admin console: an authenticator app as
-- the primary second factor, an emailed code as the fallback, and single-use
-- recovery codes for a lost phone.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "totpSecret" TEXT,
ADD COLUMN     "totpEnabledAt" TIMESTAMP(3),
ADD COLUMN     "recoveryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
-- A password accepted, second factor still outstanding. Deliberately not an
-- admin_sessions row: until the second factor lands there is no session, so a
-- stolen password alone produces something that can open nothing.
CREATE TABLE "mfa_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "emailOtpHash" TEXT,
    "emailOtpSentAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mfa_challenges_userId_idx" ON "mfa_challenges"("userId");

-- CreateIndex
CREATE INDEX "mfa_challenges_expiresAt_idx" ON "mfa_challenges"("expiresAt");

-- AddForeignKey
ALTER TABLE "mfa_challenges" ADD CONSTRAINT "mfa_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
