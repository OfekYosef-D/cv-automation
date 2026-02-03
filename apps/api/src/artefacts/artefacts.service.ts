import { Injectable } from "@nestjs/common";

import { prisma } from "@cv/db";

export interface CreateArtefactInput {
  tenantId: string;
  jobId: string;
  cvVersionId: string;
  promptVersion: string;
  model: string;
  claimsUsed: object;
  status: "DRAFT" | "APPROVED" | "REJECTED";
  content: string;
}

@Injectable()
export class ArtefactsService {
  create(input: CreateArtefactInput) {
    return prisma.agentArtefact.create({
      data: {
        tenantId: input.tenantId,
        jobId: input.jobId,
        cvVersionId: input.cvVersionId,
        promptVersion: input.promptVersion,
        model: input.model,
        claimsUsed: input.claimsUsed,
        status: input.status,
        content: input.content
      }
    });
  }
}
