-- CreateEnum
CREATE TYPE "CvSourceType" AS ENUM ('MANUAL', 'GOOGLE_DOCS');

-- CreateEnum
CREATE TYPE "CvVersionKind" AS ENUM ('BASE', 'GENERATED');

-- AlterTable
ALTER TABLE "Cv" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "sourceDocumentId" TEXT,
ADD COLUMN     "sourceDocumentTitle" TEXT,
ADD COLUMN     "sourceDocumentUrl" TEXT,
ADD COLUMN     "sourceType" "CvSourceType" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "CvVersion" ADD COLUMN     "externalDocumentId" TEXT,
ADD COLUMN     "externalDocumentTitle" TEXT,
ADD COLUMN     "externalDocumentUrl" TEXT,
ADD COLUMN     "jobId" TEXT,
ADD COLUMN     "kind" "CvVersionKind" NOT NULL DEFAULT 'BASE',
ADD COLUMN     "label" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "parentVersionId" TEXT;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "company" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "salary" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
