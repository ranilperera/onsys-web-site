-- Job applications: candidates apply on the site instead of emailing a CV.
--
-- The CV bytes are not here. Only the storage key is; the file lives on the
-- api container's volume and is readable only through an authenticated admin
-- request. See the JobApplication notes in schema.prisma.

CREATE TYPE "ApplicationStatus" AS ENUM (
  'NEW',
  'REVIEWED',
  'SHORTLISTED',
  'INTERVIEWING',
  'OFFERED',
  'HIRED',
  'REJECTED',
  'WITHDRAWN'
);

CREATE TABLE "job_applications" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "noticePeriod" TEXT,
  "expectedSalary" TEXT,
  "linkedinUrl" TEXT,
  "coverNote" TEXT,
  "cvStorageKey" TEXT NOT NULL,
  "cvOriginalName" TEXT NOT NULL,
  "cvBytes" INTEGER NOT NULL,
  "cvMimeType" TEXT NOT NULL,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'NEW',
  "statusChangedAt" TIMESTAMP(3),
  "statusChangedById" TEXT,
  "notes" TEXT,
  "consentAt" TIMESTAMP(3) NOT NULL,
  "acknowledgedAt" TIMESTAMP(3),
  "referrer" TEXT,
  "landingPath" TEXT,
  "ip" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- The console's default view: one job's queue, newest first.
CREATE INDEX "job_applications_jobId_status_submittedAt_idx"
  ON "job_applications"("jobId", "status", "submittedAt");

-- "Has this person applied before?", across every role.
CREATE INDEX "job_applications_email_idx" ON "job_applications"("email");

-- Cascade: deleting an advert takes its applications, and their CVs, with it.
ALTER TABLE "job_applications"
  ADD CONSTRAINT "job_applications_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SetNull: removing an admin account must never delete an application.
ALTER TABLE "job_applications"
  ADD CONSTRAINT "job_applications_statusChangedById_fkey"
  FOREIGN KEY ("statusChangedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
