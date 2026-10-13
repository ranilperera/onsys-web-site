-- Optional hero photograph for a case study header. Nullable because every
-- existing study was written without one and still renders correctly.
ALTER TABLE "case_studies" ADD COLUMN "heroImage" TEXT;
