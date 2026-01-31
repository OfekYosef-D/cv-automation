import { Body, Controller, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { Prisma } from "@prisma/client";

import { ArtefactsService, CreateArtefactInput } from "./artefacts.service";

interface CreateArtefactBody {
  jobId: string;
  cvVersionId: string;
  promptVersion: string;
  model: string;
  claimsUsed: Prisma.InputJsonValue;
  status: "DRAFT" | "APPROVED" | "REJECTED";
  content: string;
}

@Controller("artefacts")
export class ArtefactsController {
  constructor(private readonly artefactsService: ArtefactsService) {}

  @Post()
  create(@Req() request: Request, @Body() body: CreateArtefactBody) {
    const tenantId = request.tenantId;

    const input: CreateArtefactInput = {
      tenantId: tenantId ?? "",
      jobId: body.jobId,
      cvVersionId: body.cvVersionId,
      promptVersion: body.promptVersion,
      model: body.model,
      claimsUsed: body.claimsUsed,
      status: body.status,
      content: body.content
    };

    return this.artefactsService.create(input);
  }
}
