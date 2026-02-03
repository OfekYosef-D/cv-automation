import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { prisma } from "@cv/db";

@Injectable()
export class ApprovalsService {
  async approve(tenantId: string, jobId: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const approval = await tx.approval.create({
        data: {
          tenantId,
          jobId,
          status: "APPROVED"
        }
      });

      await tx.consentLog.create({
        data: {
          tenantId,
          action: "approve",
          metadata: { jobId }
        }
      });

      return approval;
    });
  }

  async reject(tenantId: string, jobId: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const approval = await tx.approval.create({
        data: { tenantId, jobId, status: "REJECTED" }
      });

      await tx.consentLog.create({
        data: { tenantId, action: "reject", metadata: { jobId } }
      });

      return approval;
    });
  }

  async snooze(tenantId: string, jobId: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const approval = await tx.approval.create({
        data: { tenantId, jobId, status: "SNOOZED" }
      });

      await tx.consentLog.create({
        data: { tenantId, action: "snooze", metadata: { jobId } }
      });

      return approval;
    });
  }
}
