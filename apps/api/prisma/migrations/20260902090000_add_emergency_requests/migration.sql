-- Prepaid emergency support blocks, purchased through Stripe before a
-- consultant is engaged.

-- CreateEnum
CREATE TYPE "EmergencyStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'FAILED');

-- CreateTable
-- The row is written before Stripe is involved, so an abandoned checkout still
-- leaves the enquiry visible to the team: someone with a production outage who
-- gave up at the payment screen is exactly who should be called back.
CREATE TABLE "emergency_requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "summary" TEXT,
    "hours" INTEGER NOT NULL DEFAULT 4,
    "amountCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'aud',
    "status" "EmergencyStatus" NOT NULL DEFAULT 'PENDING',
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "emergency_requests_stripeSessionId_key" ON "emergency_requests"("stripeSessionId");

-- CreateIndex
CREATE INDEX "emergency_requests_status_createdAt_idx" ON "emergency_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "emergency_requests_email_idx" ON "emergency_requests"("email");
