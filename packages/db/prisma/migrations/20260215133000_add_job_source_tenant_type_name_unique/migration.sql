-- CreateIndex
CREATE UNIQUE INDEX "JobSource_tenantId_type_name_key" ON "JobSource"("tenantId", "type", "name");
