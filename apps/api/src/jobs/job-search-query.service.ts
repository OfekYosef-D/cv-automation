import { Injectable } from "@nestjs/common";
import { prisma } from "@cv/db";
import { JobSearchQueryCreateDto } from "./dto/job-search-query-create.dto";
import { JobSearchQueryDto } from "./dto/job-search-query.dto";

@Injectable()
export class JobSearchQueryService {
  createForTenant(tenantId: string, dto: JobSearchQueryCreateDto) {
    return prisma.jobSearchQuery.create({
      data: {
        tenantId,
        provider: dto.provider,
        query: dto.query,
        location: dto.location ?? null,
        seniority: dto.seniority ?? null,
        keywords: dto.keywords ?? [],
        cadenceSeconds: dto.cadenceSeconds ?? 120,
        enabled: dto.enabled ?? true
      }
    });
  }

  listForTenant(tenantId: string) {
    return prisma.jobSearchQuery.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" }
    });
  }

  async updateForTenant(
    tenantId: string,
    id: string,
    dto: Partial<JobSearchQueryDto>
  ): Promise<boolean> {
    const result = await prisma.jobSearchQuery.updateMany({
      where: { id, tenantId },
      data: {
        provider: dto.provider,
        query: dto.query,
        location: dto.location,
        seniority: dto.seniority,
        keywords: dto.keywords,
        cadenceSeconds: dto.cadenceSeconds,
        enabled: dto.enabled
      }
    });

    return result.count > 0;
  }

  async deleteForTenant(tenantId: string, id: string): Promise<boolean> {
    const result = await prisma.jobSearchQuery.deleteMany({
      where: { id, tenantId }
    });

    return result.count > 0;
  }
}
