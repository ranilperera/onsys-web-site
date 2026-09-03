-- Author identity for blog posts.
--
-- Articles previously carried the Organization in their JSON-LD author slot,
-- which resolves to no entity at all. A Person with a stable URL and a sameAs
-- link is what search engines can actually attribute expertise to.

-- CreateTable
CREATE TABLE "authors" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "bio" TEXT,
    "photo" TEXT,
    "credentials" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedIn" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "authors_slug_key" ON "authors"("slug");

-- AlterTable
ALTER TABLE "posts" ADD COLUMN "authorId" TEXT;

-- AddForeignKey
-- SetNull rather than Cascade: removing an author must never delete their
-- articles. The denormalised authorName on the post keeps the byline readable.
ALTER TABLE "posts" ADD CONSTRAINT "posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "posts_authorId_idx" ON "posts"("authorId");
