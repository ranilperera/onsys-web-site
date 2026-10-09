-- B1: the page a visit landed on, and B2: what a plan enquiry asked for.
--
-- landingPath answers "which page produced this lead", which neither the
-- referrer nor the UTM tags can: after an internal navigation the referrer is
-- our own previous page, and a campaign tag names the campaign, not the content
-- that did the convincing.
--
-- plan and instanceCount exist so a plan-card enquiry is structured data rather
-- than a sentence buried in the message. All three nullable with no backfill:
-- rows created before this have no such information, and inventing it would
-- corrupt the only numbers this is here to produce.
ALTER TABLE "leads" ADD COLUMN "landingPath" TEXT;
ALTER TABLE "leads" ADD COLUMN "plan" TEXT;
ALTER TABLE "leads" ADD COLUMN "instanceCount" TEXT;

-- The reporting question is "which pages convert", so landing page is grouped
-- on, and plan enquiries are filtered out of the general contact traffic.
CREATE INDEX "leads_landingPath_idx" ON "leads"("landingPath");
CREATE INDEX "leads_plan_idx" ON "leads"("plan");
