-- Anonymised accounts of delivered work.
--
-- Five consecutive SEO reports recorded zero case studies on this site while
-- every competitor that outranks it shows named clients. These cannot name
-- clients: the source documents are commercial-in-confidence and no permission
-- to name has been given. Sector, region and year carry as much identity as is
-- allowed, and region is coarse on purpose — in a Pacific market with one
-- operator, sector plus country identifies the client outright.
CREATE TABLE "case_studies" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    -- A year, not a date. A precise date alongside sector and region narrows
    -- an engagement to one client.
    "deliveredYear" INTEGER NOT NULL,
    "blocks" JSONB NOT NULL,
    "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "contentUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_studies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "case_studies_slug_key" ON "case_studies"("slug");
CREATE INDEX "case_studies_status_deliveredYear_idx" ON "case_studies"("status", "deliveredYear");
