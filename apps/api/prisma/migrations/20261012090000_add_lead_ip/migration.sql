-- The submitting IP address, recorded against every lead.
--
-- Two bot campaigns reached the console in October 2026 and neither could be
-- attributed, because nothing recorded where a submission came from. Sorting
-- the console by time told us when; it could not tell us whether forty
-- submissions were forty people or one script.
--
-- VARCHAR(45) is the maximum length of a textual IPv6 address, including the
-- IPv4-mapped form. Nullable because leads created before this migration have
-- no address to backfill, and because a lead raised through a channel with no
-- HTTP request behind it legitimately has none.
--
-- The value comes from req.ip, which is only the real client because
-- `trust proxy` is set to TRUST_PROXY_HOPS (2 in production: HAProxy, then
-- nginx). If that count is ever wrong this column silently records a proxy
-- address instead, so the two settings have to move together.
ALTER TABLE "leads" ADD COLUMN "ip" VARCHAR(45);

-- Spam triage is "how many submissions from this address, recently", which is
-- the one query this column exists to answer.
CREATE INDEX "leads_ip_createdAt_idx" ON "leads"("ip", "createdAt");
