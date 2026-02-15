-- CreateTable
CREATE TABLE "JobSearchQuery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "location" TEXT,
    "seniority" TEXT,
    "keywords" TEXT[],
    "cadenceSeconds" INTEGER NOT NULL DEFAULT 120,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSearchQuery_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "JobSearchQuery" ADD CONSTRAINT "JobSearchQuery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

