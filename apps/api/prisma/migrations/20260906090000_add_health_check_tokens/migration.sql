-- Token-gated download for the health check collector.
--
-- The collector used to sit in the web app's public folder, which meant the
-- contact details the free check is offered in exchange for could be skipped
-- entirely by anyone who knew the filename. It is now served by a route that
-- requires one of these grants, minted when the request form is submitted.

-- CreateTable
CREATE TABLE "health_check_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "leadId" TEXT,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_check_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "health_check_tokens_token_key" ON "health_check_tokens"("token");
CREATE INDEX "health_check_tokens_expiresAt_idx" ON "health_check_tokens"("expiresAt");
CREATE INDEX "health_check_tokens_email_idx" ON "health_check_tokens"("email");

-- AddForeignKey
-- SetNull, not Cascade: purging an old lead must not revoke a link the person
-- is still holding.
ALTER TABLE "health_check_tokens" ADD CONSTRAINT "health_check_tokens_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
