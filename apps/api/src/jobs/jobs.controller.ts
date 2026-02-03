import { Controller, Get, Query, Req } from "@nestjs/common";
import { Request } from "express";

import { JobsService } from "./jobs.service";
import { JobListQueryDto } from "./jobs.dto";

@Controller("jobs")
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  list(@Req() request: Request, @Query() query: JobListQueryDto) {
    const tenantId = request.tenantId ?? "";
    return this.jobsService.listJobs(tenantId, query);
  }
}
