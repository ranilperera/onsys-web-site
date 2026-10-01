-- Country of origin for a lead, as a hint derived from the browser time zone
-- and Accept-Language rather than from geo-IP, which this stack does not have.
--
-- Nullable with no default and no backfill: existing rows genuinely have no
-- signal to derive one from, and writing 'AU' across them would invent the
-- exact number the growth plan is trying to measure.
ALTER TABLE "leads" ADD COLUMN "country" VARCHAR(2);

-- Reporting always filters or groups on this, and it is one of two columns the
-- leads console will sort by.
CREATE INDEX "leads_country_idx" ON "leads"("country");
