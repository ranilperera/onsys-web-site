-- Author accounts.
--
-- A third console role that can write blog articles and nothing else, so a
-- writer no longer needs an account that can read every lead and candidate CV
-- in the business. The restriction itself lives in the API as a default-deny
-- allowlist; this migration only carries the columns it needs.

-- The new role. Postgres will not add an enum value inside a transaction that
-- later uses it, but Prisma runs each migration file as its own transaction
-- and nothing below references AUTHOR, so this is safe as written.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'AUTHOR';

-- The byline an account writes under. For an author this is the whole
-- definition of what they can see: their posts are the posts carrying it.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "authorId" TEXT;

-- Set when an administrator creates the account or resets a password. While
-- true the API refuses everything except reading your own account and
-- changing your password.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- Suspension. Deleting a user is the wrong tool for someone who has left: the
-- account is the audit trail on applications they moved and jobs they posted.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "disabledAt" TIMESTAMP(3);

-- SetNull: removing a byline must never remove somebody's login.
ALTER TABLE "users"
  ADD CONSTRAINT "users_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "users_authorId_idx" ON "users"("authorId");

-- "Ready for review" as two columns rather than a ContentStatus value. That
-- enum is shared with pages, jobs and case studies, none of which has a review
-- step, and a post in review keeps status = DRAFT — so nothing that reads
-- status has to learn a new value, and no unreviewed draft can reach the
-- public site through a query that forgot about it.
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "submittedForReviewAt" TIMESTAMP(3);
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "submittedById" TEXT;

ALTER TABLE "posts"
  ADD CONSTRAINT "posts_submittedById_fkey"
  FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The editor's queue: drafts waiting on somebody.
CREATE INDEX IF NOT EXISTS "posts_submittedForReviewAt_idx" ON "posts"("submittedForReviewAt");
