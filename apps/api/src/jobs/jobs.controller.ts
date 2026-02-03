import { BadRequestException, Controller, Get, NotFoundException, Param, Query, Req } from "@nestjs/common";
import { Request } from "express";

import { JobsService } from "./jobs.service";
import { JobListQueryDto } from "./jobs.dto";

@Controller("jobs")
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  list(@Req() request: Request, @Query() query: JobListQueryDto) {
    const tenantId = request.tenantId;
    if (!tenantId) {
      throw new BadRequestException("Missing tenantId on request");
    }
    return this.jobsService.listJobs(tenantId, query);
  }

  @Get(":jobId")
  async detail(@Req() request: Request, @Param("jobId") jobId: string) {
    const tenantId = request.tenantId;
    if (!tenantId) {
      throw new BadRequestException("Missing tenantId on request");
    }
    const job = await this.jobsService.getJob(tenantId, jobId);

    if (!job) {
      throw new NotFoundException();
    }

    return job;
  }
}
