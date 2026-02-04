import { Body, Controller, Post, Req } from "@nestjs/common";
import { Request } from "express";

import { ArtefactsService, CreateArtefactInput } from "./artefacts.service";

interface CreateArtefactBody {
  jobId: string;
  cvVersionId: string;
  promptVersion: string;
  model: string;
  claimsUsed: object;
  status: "DRAFT" | "APPROVED" | "REJECTED";
  content: string;
}

@Controller("artefacts")
export class ArtefactsController {
  constructor(private readonly artefactsService: ArtefactsService) {}

  @Post()
  create(@Req() request: Request, @Body() body: CreateArtefactBody) {
    // tenantId is guaranteed by TenantMiddleware
    const tenantId = request.tenantId!;

    const input: CreateArtefactInput = {
      tenantId,
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
