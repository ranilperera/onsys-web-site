-- Vacancies, ported from the standalone cv-post-app so that /careers is a real
-- page managed from /admin instead of a footer link pointing at /contact.
--
-- Applications, CVs and the shortlisting workflow are NOT in this migration.
-- They carry personal information and need a storage and retention decision
-- first; jobs on their own collect nothing about anybody.

CREATE TYPE "JobType" AS ENUM ('PERMANENT', 'CONTRACT', 'INTERN', 'TRAINEE', 'CASUAL', 'PART_TIME');
CREATE TYPE "JobLocation" AS ENUM ('AUSTRALIA', 'SRI_LANKA');
CREATE TYPE "WorkArrangement" AS ENUM ('ONSITE', 'HYBRID', 'REMOTE');

CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "location" "JobLocation" NOT NULL,
    "workArrangement" "WorkArrangement" NOT NULL,
    "descriptionHtml" TEXT NOT NULL,
    "salaryRange" TEXT,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "applyEmail" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    -- SetNull, not Cascade: removing an admin account must not delete the
    -- vacancies they posted.
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "jobs_slug_key" ON "jobs"("slug");

-- The public listing query is always status + close date.
CREATE INDEX "jobs_status_closesAt_idx" ON "jobs"("status", "closesAt");

ALTER TABLE "jobs" ADD CONSTRAINT "jobs_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
