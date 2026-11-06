-- On-call enrolments: a company starting SQL Server cover from the website.
--
-- Separate from leads because this is not a question, it is an instruction to
-- start billing: it carries the invoicing address and the price that was
-- quoted at the moment of enrolling.

CREATE TYPE "OnCallEnrolmentStatus" AS ENUM ('NEW', 'CONTACTED', 'ACTIVE', 'DECLINED');

CREATE TABLE "on_call_enrolments" (
  "id" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "website" TEXT,
  "country" TEXT NOT NULL,
  "street" TEXT NOT NULL,
  "street2" TEXT,
  "locality" TEXT NOT NULL,
  "region" TEXT,
  "postcode" TEXT,
  "contactName" TEXT NOT NULL,
  "workEmail" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "instanceCount" INTEGER NOT NULL,
  "unitPriceCents" INTEGER NOT NULL,
  "monthlyTotalCents" INTEGER NOT NULL,
  "hourlyRateCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'AUD',
  "notes" TEXT,
  "status" "OnCallEnrolmentStatus" NOT NULL DEFAULT 'NEW',
  "customerEmailedAt" TIMESTAMP(3),
  "onsysEmailedAt" TIMESTAMP(3),
  "referrer" TEXT,
  "landingPath" TEXT,
  "ip" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "on_call_enrolments_pkey" PRIMARY KEY ("id")
);

-- The worklist: what has not been acted on, newest first.
CREATE INDEX "on_call_enrolments_status_createdAt_idx"
  ON "on_call_enrolments"("status", "createdAt");

-- "Have they been here before?"
CREATE INDEX "on_call_enrolments_workEmail_idx" ON "on_call_enrolments"("workEmail");
