import { Injectable } from "@nestjs/common";

import { prisma } from "@cv/db";

@Injectable()
export class ApprovalsService {
  async approve(tenantId: string, jobId: string) {
    const approval = await prisma.approval.create({
      data: {
        tenantId,
        jobId,
        status: "APPROVED"
      }
    });

    await prisma.consentLog.create({
      data: {
        tenantId,
        action: "approve",
        metadata: { jobId }
      }
    });

    return approval;
  }

  async reject(tenantId: string, jobId: string) {
    const approval = await prisma.approval.create({
      data: { tenantId, jobId, status: "REJECTED" }
    });

    await prisma.consentLog.create({
      data: { tenantId, action: "reject", metadata: { jobId } }
    });

    return approval;
  }

  async snooze(tenantId: string, jobId: string) {
    const approval = await prisma.approval.create({
      data: { tenantId, jobId, status: "SNOOZED" }
    });

    await prisma.consentLog.create({
      data: { tenantId, action: "snooze", metadata: { jobId } }
    });

    return approval;
  }
}
