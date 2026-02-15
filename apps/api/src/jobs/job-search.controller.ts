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
import { Request } from "express";
import { JobSearchQueryCreateDto } from "./dto/job-search-query-create.dto";
import { JobSearchQueryDto } from "./dto/job-search-query.dto";
import { JobLiveSearchDto } from "./dto/job-live-search.dto";
import { JobSearchQueryService } from "./job-search-query.service";
import { JobSearchService } from "./job-search.service";

@Controller("jobs")
export class JobSearchController {
  constructor(
    private readonly jobSearchQueryService: JobSearchQueryService,
    private readonly jobSearchService: JobSearchService
  ) {}

  @Get("search-queries")
  listQueries(@Req() request: Request) {
    const tenantId = request.tenantId!;
    return this.jobSearchQueryService.listForTenant(tenantId);
  }

  @Post("search-queries")
  createQuery(@Req() request: Request, @Body() dto: JobSearchQueryCreateDto) {
    const tenantId = request.tenantId!;
    return this.jobSearchQueryService.createForTenant(tenantId, dto);
  }

  @Patch("search-queries/:id")
  async updateQuery(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() dto: Partial<JobSearchQueryDto>
  ) {
    const tenantId = request.tenantId!;
    const updated = await this.jobSearchQueryService.updateForTenant(tenantId, id, dto);

    if (!updated) {
      throw new NotFoundException();
    }

    return { ok: true };
  }

  @Delete("search-queries/:id")
  async deleteQuery(@Req() request: Request, @Param("id") id: string) {
    const tenantId = request.tenantId!;
    const deleted = await this.jobSearchQueryService.deleteForTenant(tenantId, id);

    if (!deleted) {
      throw new NotFoundException();
    }

    return { ok: true };
  }

  @Post("live")
  liveSearch(@Req() request: Request, @Body() dto: JobLiveSearchDto) {
    const tenantId = request.tenantId!;
    return this.jobSearchService.liveSearch(tenantId, dto);
  }
}
