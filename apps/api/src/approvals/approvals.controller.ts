import { Body, Controller, Post, Req } from "@nestjs/common";
import { Request } from "express";

import { ApprovalActionDto } from "./approvals.dto";
import { ApprovalsService } from "./approvals.service";

@Controller("approvals")
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post("approve")
  approve(@Req() request: Request, @Body() body: ApprovalActionDto) {
    // tenantId is guaranteed by TenantMiddleware
    const tenantId = request.tenantId!;
    return this.approvalsService.approve(tenantId, body.jobId);
  }

  @Post("reject")
  reject(@Req() request: Request, @Body() body: ApprovalActionDto) {
    // tenantId is guaranteed by TenantMiddleware
    const tenantId = request.tenantId!;
    return this.approvalsService.reject(tenantId, body.jobId);
  }

  @Post("snooze")
  snooze(@Req() request: Request, @Body() body: ApprovalActionDto) {
    // tenantId is guaranteed by TenantMiddleware
    const tenantId = request.tenantId!;
    return this.approvalsService.snooze(tenantId, body.jobId);
  }
}
