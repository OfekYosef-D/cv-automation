import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import type { MatchProfile } from "@cv/matching";
import {
  type DiscoverySearchInput,
  type DiscoverySearchResult,
  buildAlertDedupeKey,
  executeDiscoverySearch,
  persistDiscoveryJobs
} from "@cv/shared";
import { JobAlertsService } from "../alerts/job-alerts.service";
import { JobLiveSearchDto } from "./dto/job-live-search.dto";
import { JobSearchQueryService } from "./job-search-query.service";

export interface LiveSearchResponse {
  jobs: Array<{
    id: string | null;
    externalId: string;
    title: string;
    description: string;
    company: string | null;
    salary: string | null;
    tags: string[];
    location: string | null;
    url: string;
    postedAt: string | null;
    contentHash: string;
    origin: "all" | "linkedin";
    sourceLabel: string;
    matchedQueryIds: string[];
    matchScore: number | null;
    matchExplanations: string[];
  }>;
}

export interface JobSearchRunResponse extends LiveSearchResponse {
  fetchedCount: number;
  savedCount: number;
  alertCount: number;
}

function extractMatchedQueryIds(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }

  const discovery =
    "discovery" in metadata &&
    metadata.discovery &&
    typeof metadata.discovery === "object" &&
    !Array.isArray(metadata.discovery)
      ? (metadata.discovery as Record<string, unknown>)
      : null;

  return Array.isArray(discovery?.matchedQueryIds)
    ? discovery.matchedQueryIds.filter((value): value is string => typeof value === "string")
    : [];
}

@Injectable()
export class JobSearchService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly jobSearchQueryService: JobSearchQueryService,
    private readonly jobAlertsService: JobAlertsService
  ) {}

  async previewSearch(tenantId: string, dto: JobLiveSearchDto): Promise<LiveSearchResponse> {
    const results = await this.getDiscoveryResults(tenantId, dto);
    return {
      jobs: results.map((job) => this.mapDiscoveryJob(job))
    };
  }

  async liveSearch(tenantId: string, dto: JobLiveSearchDto): Promise<LiveSearchResponse> {
    const results = await this.getDiscoveryResults(tenantId, dto);
    const persisted = await persistDiscoveryJobs({
      prisma: this.prisma,
      tenantId,
      provider: dto.provider,
      jobs: results
    });

    const persistedByUrl = new Map(persisted.map((entry) => [entry.job.url, entry.job]));

    return {
      jobs: results.map((job) =>
        this.mapDiscoveryJob(job, persistedByUrl.get(job.canonicalUrl) ?? null)
      )
    };
  }

  async runSavedQuery(tenantId: string, queryId: string): Promise<JobSearchRunResponse> {
    const query = await this.jobSearchQueryService.findForTenant(tenantId, queryId);
    if (!query) {
      throw new NotFoundException("Search query not found.");
    }

    const input: JobLiveSearchDto = {
      provider: query.provider as JobLiveSearchDto["provider"],
      query: query.query,
      location: query.location ?? undefined,
      seniority: query.seniority ?? undefined,
      sourceOrigin: (query.sourceOrigin as JobLiveSearchDto["sourceOrigin"]) ?? "all",
      includeKeywords: query.includeKeywords,
      excludeKeywords: query.excludeKeywords,
      relatedTitles: query.relatedTitles,
      postedWithinHours: query.postedWithinHours ?? undefined,
      maxResultsPerRun: query.maxResultsPerRun,
      minMatchScore: query.minMatchScore ?? undefined,
      useProfile: true
    };

    try {
      const results = await this.getDiscoveryResults(tenantId, input);
      const persisted = await persistDiscoveryJobs({
        prisma: this.prisma,
        tenantId,
        provider: input.provider,
        queryId,
        jobs: results
      });
      const alertCount = await this.createPendingAlerts(tenantId, queryId, results, persisted);

      await this.prisma.jobSearchQuery.update({
        where: { id: queryId },
        data: {
          lastRunAt: new Date(),
          lastCompletedAt: new Date(),
          lastNewJobsCount: persisted.filter((entry) => entry.isNew).length,
          lastAlertedCount: alertCount,
          lastError: null
        }
      });

      const persistedByUrl = new Map(persisted.map((entry) => [entry.job.url, entry.job]));
      return {
        fetchedCount: results.length,
        savedCount: persisted.filter((entry) => entry.isNew).length,
        alertCount,
        jobs: results.map((job) =>
          this.mapDiscoveryJob(job, persistedByUrl.get(job.canonicalUrl) ?? null)
        )
      };
    } catch (error) {
      await this.prisma.jobSearchQuery.update({
        where: { id: queryId },
        data: {
          lastRunAt: new Date(),
          lastCompletedAt: new Date(),
          lastError: error instanceof Error ? error.message : "Unknown discovery error"
        }
      });
      throw error;
    }
  }

  private async createPendingAlerts(
    tenantId: string,
    queryId: string,
    results: DiscoverySearchResult[],
    persisted: Array<{ job: { id: string; url: string }; isNew: boolean }>
  ): Promise<number> {
    const preference = await this.jobAlertsService.getPreference(tenantId);
    if (!preference.immediateAlerts) {
      return 0;
    }

    const resultByUrl = new Map(results.map((result) => [result.canonicalUrl, result]));
    let createdCount = 0;

    for (const persistedJob of persisted) {
      if (!persistedJob.isNew) {
        continue;
      }

      const result = resultByUrl.get(persistedJob.job.url);
      if (!result) {
        continue;
      }

      if (
        preference.minMatchScore !== null &&
        result.matchScore !== null &&
        result.matchScore < preference.minMatchScore
      ) {
        continue;
      }

      const alert = await this.jobAlertsService.createPendingAlert({
        tenantId,
        jobId: persistedJob.job.id,
        jobSearchQueryId: queryId,
        dedupeKey: buildAlertDedupeKey(result),
        metadata: {
          origin: result.origin ?? "all",
          sourceLabel: result.sourceLabel ?? "unknown",
          matchScore: result.matchScore,
          matchExplanations: result.matchExplanations
        }
      });

      if (alert.created) {
        createdCount++;
      }
    }

    return createdCount;
  }

  private async getDiscoveryResults(
    tenantId: string,
    dto: JobLiveSearchDto
  ): Promise<DiscoverySearchResult[]> {
    this.validateInput(dto);
    const profile = dto.useProfile ? await this.loadProfile(tenantId) : null;
    return executeDiscoverySearch(this.toDiscoveryInput(dto), profile);
  }

  private async loadProfile(tenantId: string): Promise<MatchProfile | null> {
    const profile = await this.prisma.userProfile.findUnique({ where: { tenantId } });
    if (!profile) {
      return null;
    }

    return {
      desiredRoles: profile.desiredRoles,
      seniority: profile.seniority as MatchProfile["seniority"],
      location: profile.location,
      mustHaveSkills: profile.mustHaveSkills
    };
  }

  private toDiscoveryInput(dto: JobLiveSearchDto): DiscoverySearchInput {
    return {
      provider: dto.provider,
      query: dto.query,
      location: dto.location ?? null,
      seniority: dto.seniority ?? null,
      sourceOrigin: dto.sourceOrigin ?? "all",
      includeKeywords: dto.includeKeywords ?? [],
      excludeKeywords: dto.excludeKeywords ?? [],
      relatedTitles: dto.relatedTitles ?? true,
      postedWithinHours: dto.postedWithinHours ?? null,
      maxResultsPerRun: dto.maxResultsPerRun ?? 25,
      minMatchScore: dto.minMatchScore ?? null,
      useProfile: dto.useProfile ?? false
    };
  }

  private validateInput(dto: JobLiveSearchDto): void {
    if (dto.sourceOrigin === "linkedin" && dto.provider !== "serpapi") {
      throw new BadRequestException("LinkedIn-origin queries require the serpapi provider.");
    }

    if ((dto.maxResultsPerRun ?? 25) < 1) {
      throw new BadRequestException("maxResultsPerRun must be greater than zero.");
    }
  }

  private mapDiscoveryJob(
    job: DiscoverySearchResult,
    persistedJob: { id: string; metadata?: unknown } | null = null
  ): LiveSearchResponse["jobs"][number] {
    return {
      id: persistedJob?.id ?? null,
      externalId: job.externalId,
      title: job.title,
      description: job.description,
      company: job.company ?? null,
      salary: job.salary ?? null,
      tags: job.tags ?? [],
      location: job.location ?? null,
      url: job.canonicalUrl,
      postedAt: job.postedAt ? job.postedAt.toISOString() : null,
      contentHash: job.contentHash,
      origin: job.origin ?? "all",
      sourceLabel: job.sourceLabel ?? "unknown",
      matchedQueryIds: persistedJob ? extractMatchedQueryIds(persistedJob.metadata) : [],
      matchScore: job.matchScore,
      matchExplanations: job.matchExplanations
    };
  }
}
