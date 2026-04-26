-- CreateEnum
CREATE TYPE "JobAlertChannel" AS ENUM ('EMAIL');

-- CreateEnum
CREATE TYPE "JobAlertStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "JobSearchQuery"
ADD COLUMN     "sourceOrigin" TEXT NOT NULL DEFAULT 'all',
ADD COLUMN     "includeKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "excludeKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "relatedTitles" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "postedWithinHours" INTEGER,
ADD COLUMN     "maxResultsPerRun" INTEGER NOT NULL DEFAULT 25,
ADD COLUMN     "minMatchScore" INTEGER,
ADD COLUMN     "lastCompletedAt" TIMESTAMP(3),
ADD COLUMN     "lastNewJobsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastAlertedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastError" TEXT;

-- Preserve existing keyword filters
UPDATE "JobSearchQuery"
SET "includeKeywords" = COALESCE("keywords", ARRAY[]::TEXT[]);

-- Normalize old cadences to the new minimum/default
UPDATE "JobSearchQuery"
SET "cadenceSeconds" = 60
WHERE "cadenceSeconds" < 60;

ALTER TABLE "JobSearchQuery"
ALTER COLUMN "cadenceSeconds" SET DEFAULT 60,
DROP COLUMN "keywords";

-- CreateTable
CREATE TABLE "JobAlertPreference" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailAddress" TEXT,
    "immediateAlerts" BOOLEAN NOT NULL DEFAULT true,
    "minMatchScore" INTEGER,
    "cooldownSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobAlertPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobAlert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "jobSearchQueryId" TEXT NOT NULL,
    "channel" "JobAlertChannel" NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "status" "JobAlertStatus" NOT NULL DEFAULT 'PENDING',
    "deliveryError" TEXT,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobAlertPreference_tenantId_key" ON "JobAlertPreference"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "JobAlert_tenantId_channel_dedupeKey_key" ON "JobAlert"("tenantId", "channel", "dedupeKey");

-- AddForeignKey
ALTER TABLE "JobAlertPreference" ADD CONSTRAINT "JobAlertPreference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAlert" ADD CONSTRAINT "JobAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAlert" ADD CONSTRAINT "JobAlert_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAlert" ADD CONSTRAINT "JobAlert_jobSearchQueryId_fkey" FOREIGN KEY ("jobSearchQueryId") REFERENCES "JobSearchQuery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
