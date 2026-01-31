import { Body, Controller, Post, Req } from "@nestjs/common";
import { Request } from "express";

import { ApprovalsService } from "./approvals.service";

interface ApproveBody {
  jobId: string;
}

@Controller("approvals")
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post("approve")
  approve(@Req() request: Request, @Body() body: ApproveBody) {
    const tenantId = request.tenantId ?? "";
    return this.approvalsService.approve(tenantId, body.jobId);
  }
}
