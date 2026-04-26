import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req
} from "@nestjs/common";
import { JobSearchQuery } from "@prisma/client";
import { Request } from "express";
import { JobSearchQueryCreateDto } from "./dto/job-search-query-create.dto";
import { UpdateJobSearchQueryDto } from "./dto/update-job-search-query.dto";
import { JobLiveSearchDto } from "./dto/job-live-search.dto";
import { JobSearchQueryService } from "./job-search-query.service";
import { JobSearchRunResponse, JobSearchService, LiveSearchResponse } from "./job-search.service";

@Controller("jobs")
export class JobSearchController {
  constructor(
    private readonly jobSearchQueryService: JobSearchQueryService,
    private readonly jobSearchService: JobSearchService
  ) {}

  @Get("search-queries")
  listQueries(@Req() request: Request): Promise<JobSearchQuery[]> {
    const tenantId = request.tenantId!;
    return this.jobSearchQueryService.listForTenant(tenantId);
  }

  @Post("search-queries")
  createQuery(
    @Req() request: Request,
    @Body() dto: JobSearchQueryCreateDto
  ): Promise<JobSearchQuery> {
    const tenantId = request.tenantId!;
    return this.jobSearchQueryService.createForTenant(tenantId, dto);
  }

  @Patch("search-queries/:id")
  async updateQuery(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() dto: UpdateJobSearchQueryDto
  ): Promise<{ ok: true }> {
    const tenantId = request.tenantId!;
    const updated = await this.jobSearchQueryService.updateForTenant(tenantId, id, dto);

    if (!updated) {
      throw new NotFoundException();
    }

    return { ok: true };
  }

  @Delete("search-queries/:id")
  async deleteQuery(@Req() request: Request, @Param("id") id: string): Promise<{ ok: true }> {
    const tenantId = request.tenantId!;
    const deleted = await this.jobSearchQueryService.deleteForTenant(tenantId, id);

    if (!deleted) {
      throw new NotFoundException();
    }

    return { ok: true };
  }

  @Post("search-queries/preview")
  previewQuery(@Req() request: Request, @Body() dto: JobLiveSearchDto): Promise<LiveSearchResponse> {
    const tenantId = request.tenantId!;
    return this.jobSearchService.previewSearch(tenantId, dto);
  }

  @Post("search-queries/:id/run")
  runQuery(@Req() request: Request, @Param("id") id: string): Promise<JobSearchRunResponse> {
    const tenantId = request.tenantId!;
    return this.jobSearchService.runSavedQuery(tenantId, id);
  }

  @Post("live")
  liveSearch(@Req() request: Request, @Body() dto: JobLiveSearchDto): Promise<LiveSearchResponse> {
    const tenantId = request.tenantId!;
    return this.jobSearchService.liveSearch(tenantId, dto);
  }
}
