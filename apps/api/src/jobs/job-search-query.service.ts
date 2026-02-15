import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { JobSearchQueryCreateDto } from "./dto/job-search-query-create.dto";
import { JobSearchQueryDto } from "./dto/job-search-query.dto";

@Injectable()
export class JobSearchQueryService {
  constructor(private readonly prisma: PrismaClient) {}

  createForTenant(tenantId: string, dto: JobSearchQueryCreateDto) {
    return this.prisma.jobSearchQuery.create({
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
    return this.prisma.jobSearchQuery.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" }
    });
  }

  async updateForTenant(
    tenantId: string,
    id: string,
    dto: Partial<JobSearchQueryDto>
  ): Promise<boolean> {
    const data = Object.fromEntries(
      Object.entries({
        provider: dto.provider,
        query: dto.query,
        location: dto.location,
        seniority: dto.seniority,
        keywords: dto.keywords,
        cadenceSeconds: dto.cadenceSeconds,
        enabled: dto.enabled
      }).filter(([, value]) => value !== undefined)
    );

    const result = await this.prisma.jobSearchQuery.updateMany({
      where: { id, tenantId },
      data
    });

    return result.count > 0;
  }

  async deleteForTenant(tenantId: string, id: string): Promise<boolean> {
    const result = await this.prisma.jobSearchQuery.deleteMany({
      where: { id, tenantId }
    });

    return result.count > 0;
  }
}
