-- Admin-managed footer links.
--
-- Previously the footer was a hard-coded object in the web app's config, so
-- adding a page to it meant editing TypeScript and redeploying. These rows are
-- the source of truth; the config literal is kept as a fallback for when the
-- content API cannot be reached, so an outage degrades to a stale footer
-- rather than an empty one.

-- CreateTable
CREATE TABLE "nav_links" (
    "id" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "groupOrder" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nav_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nav_links_groupOrder_group_order_idx" ON "nav_links"("groupOrder", "group", "order");
