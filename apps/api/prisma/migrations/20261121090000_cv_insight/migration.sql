-- Cache what we learn from a CV, so reading one is paid for once.
--
-- Every column is nullable and nothing backfills: an application whose CV has
-- never been opened simply has nulls here, and the first open fills them.
ALTER TABLE "job_applications"
  ADD COLUMN IF NOT EXISTS "cvText"      TEXT,
  ADD COLUMN IF NOT EXISTS "cvSummary"   JSONB,
  ADD COLUMN IF NOT EXISTS "cvPages"     INTEGER,
  ADD COLUMN IF NOT EXISTS "cvReadAt"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cvReadError" TEXT;

-- Sorting a backlog oldest-first is now a first-class view, and without this
-- it is a sequential scan plus a sort over the whole table on every load.
CREATE INDEX IF NOT EXISTS "job_applications_submittedAt_idx"
  ON "job_applications" ("submittedAt");
