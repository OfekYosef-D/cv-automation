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
}
