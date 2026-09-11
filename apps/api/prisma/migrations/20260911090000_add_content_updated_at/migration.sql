-- A freshness signal the sitemap can actually use.
--
-- updatedAt moves on every write, and the content seed rewrites every row on
-- every deploy, so the sitemap advertised thirty-seven pages all changing at
-- the same instant. That is worse than no signal: it tells a crawler nothing
-- about which of several similar pages is current.
--
-- contentUpdatedAt moves only when the visible content differs from what was
-- already stored. Backfilled from publishedAt where there is one, falling back
-- to updatedAt, so existing rows start from their best available truth rather
-- than from the moment of this migration.

ALTER TABLE "pages" ADD COLUMN "contentUpdatedAt" TIMESTAMP(3);
ALTER TABLE "posts" ADD COLUMN "contentUpdatedAt" TIMESTAMP(3);

UPDATE "pages" SET "contentUpdatedAt" = COALESCE("publishedAt", "updatedAt");
UPDATE "posts" SET "contentUpdatedAt" = COALESCE("publishedAt", "updatedAt");
