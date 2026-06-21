-- Rename r2Key to storageKey and set default
ALTER TABLE "SharedImage" RENAME COLUMN "r2Key" TO "storageKey";
ALTER TABLE "SharedImage" ALTER COLUMN "storageKey" SET DEFAULT '';

-- Add expiresAt: nullable first, backfill, then enforce NOT NULL
ALTER TABLE "SharedImage" ADD COLUMN "expiresAt" TIMESTAMP(3);
UPDATE "SharedImage" SET "expiresAt" = NOW() + INTERVAL '30 days' WHERE "expiresAt" IS NULL;
ALTER TABLE "SharedImage" ALTER COLUMN "expiresAt" SET NOT NULL;

-- New indexes
CREATE INDEX "SharedImage_expiresAt_idx" ON "SharedImage"("expiresAt");
CREATE INDEX "SharedImage_userId_idx" ON "SharedImage"("userId");
