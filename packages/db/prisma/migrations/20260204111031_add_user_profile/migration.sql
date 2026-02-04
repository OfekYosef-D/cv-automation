-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "desiredRoles" TEXT[],
    "seniority" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "mustHaveSkills" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_tenantId_key" ON "UserProfile"("tenantId");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
