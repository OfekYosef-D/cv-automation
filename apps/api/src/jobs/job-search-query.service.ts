import { Injectable } from "@nestjs/common";
import { JobSearchQuery } from "@prisma/client";
import { prisma } from "@cv/db";
import { JobSearchQueryCreateDto } from "./dto/job-search-query-create.dto";
import { JobSearchQueryDto } from "./dto/job-search-query.dto";
import { JobSearchSchedulerService } from "./job-search-scheduler.service";

@Injectable()
export class JobSearchQueryService {
  constructor(private readonly jobSearchSchedulerService: JobSearchSchedulerService) {}

  async createForTenant(tenantId: string, dto: JobSearchQueryCreateDto): Promise<JobSearchQuery> {
    const query = await prisma.jobSearchQuery.create({
      data: {
        tenantId,
        provider: dto.provider,
        query: dto.query,
        sourceOrigin: dto.sourceOrigin ?? "all",
        location: dto.location ?? null,
        seniority: dto.seniority ?? null,
        includeKeywords: dto.includeKeywords ?? [],
        excludeKeywords: dto.excludeKeywords ?? [],
        relatedTitles: dto.relatedTitles ?? true,
        postedWithinHours: dto.postedWithinHours ?? null,
        maxResultsPerRun: dto.maxResultsPerRun ?? 25,
        minMatchScore: dto.minMatchScore ?? null,
        cadenceSeconds: dto.cadenceSeconds ?? 60,
        enabled: dto.enabled ?? true
      }
    });

    try {
      await this.jobSearchSchedulerService.syncQuery(query, {
        enqueueImmediate: query.enabled
      });
      return query;
    } catch (error) {
      await prisma.jobSearchQuery.delete({
        where: { id: query.id }
      });
      throw error;
    }
  }

  listForTenant(tenantId: string): Promise<JobSearchQuery[]> {
    return prisma.jobSearchQuery.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" }
    });
  }

  findForTenant(tenantId: string, id: string): Promise<JobSearchQuery | null> {
    return prisma.jobSearchQuery.findFirst({
      where: { tenantId, id }
    });
  }

  async updateForTenant(
    tenantId: string,
    id: string,
    dto: Partial<JobSearchQueryDto>
  ): Promise<boolean> {
    const existing = await prisma.jobSearchQuery.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return false;
    }

    const data = Object.fromEntries(
      Object.entries({
        provider: dto.provider,
        query: dto.query,
        sourceOrigin: dto.sourceOrigin,
        location: dto.location,
        seniority: dto.seniority,
        includeKeywords: dto.includeKeywords,
        excludeKeywords: dto.excludeKeywords,
        relatedTitles: dto.relatedTitles,
        postedWithinHours: dto.postedWithinHours,
        maxResultsPerRun: dto.maxResultsPerRun,
        minMatchScore: dto.minMatchScore,
        cadenceSeconds: dto.cadenceSeconds,
        enabled: dto.enabled
      }).filter(([, value]) => value !== undefined)
    );

    const updated = await prisma.jobSearchQuery.update({
      where: { id: existing.id },
      data
    });

    try {
      await this.jobSearchSchedulerService.syncQuery(updated, {
        enqueueImmediate: updated.enabled
      });
      return true;
    } catch (error) {
      await prisma.jobSearchQuery.update({
        where: { id: existing.id },
        data: {
          provider: existing.provider,
          query: existing.query,
          sourceOrigin: existing.sourceOrigin,
          location: existing.location,
          seniority: existing.seniority,
          includeKeywords: existing.includeKeywords,
          excludeKeywords: existing.excludeKeywords,
          relatedTitles: existing.relatedTitles,
          postedWithinHours: existing.postedWithinHours,
          maxResultsPerRun: existing.maxResultsPerRun,
          minMatchScore: existing.minMatchScore,
          cadenceSeconds: existing.cadenceSeconds,
          enabled: existing.enabled
        }
      });
      throw error;
    }
  }

  async deleteForTenant(tenantId: string, id: string): Promise<boolean> {
    const existing = await prisma.jobSearchQuery.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return false;
    }

    await this.jobSearchSchedulerService.removeQuery(existing.tenantId, existing.id);
    await prisma.jobSearchQuery.delete({
      where: { id: existing.id }
    });

    return true;
  }
}
