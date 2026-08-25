-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED');

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "topic" TEXT,
    "message" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "graphEventId" TEXT,
    "joinUrl" TEXT,
    "cancelToken" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "referrer" TEXT,
    "confirmationSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bookings_reference_key" ON "bookings"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_cancelToken_key" ON "bookings"("cancelToken");

-- CreateIndex
CREATE INDEX "bookings_startsAt_status_idx" ON "bookings"("startsAt", "status");

-- CreateIndex
CREATE INDEX "bookings_email_createdAt_idx" ON "bookings"("email", "createdAt");

-- Two visitors can submit the same slot at the same instant. Application code
-- filters taken slots out of the availability response, but that check and the
-- insert are not atomic, so this partial unique index is the actual guarantee.
-- Cancelled and failed rows are excluded so a released slot can be rebooked.
CREATE UNIQUE INDEX "bookings_active_slot_key"
  ON "bookings" ("startsAt")
  WHERE "status" IN ('PENDING', 'CONFIRMED');
