import crypto from "node:crypto";
import { Injectable } from "@nestjs/common";
import { JobSource, PrismaClient } from "@prisma/client";
import { JobLiveSearchDto } from "./dto/job-live-search.dto";

interface LiveSearchResult {
  externalId: string;
  title: string;
  description: string;
  location?: string;
  url?: string;
  postedAt?: Date;
}

export interface LiveSearchResponse {
  jobs: Array<{
    externalId: string;
    title: string;
    description: string;
    location: string | null;
    url: string;
    postedAt: string | null;
    contentHash: string;
  }>;
}

@Injectable()
export class JobSearchService {
  constructor(private readonly prisma: PrismaClient) {}

  async liveSearch(tenantId: string, dto: JobLiveSearchDto): Promise<LiveSearchResponse> {
    const fetchedJobs = await this.fetchProviderResults(dto);

    const deduped = new Map<string, LiveSearchResult>();
    for (const job of fetchedJobs) {
      const contentHash = this.hashContent(job.title, job.description);
      if (!deduped.has(contentHash)) {
        deduped.set(contentHash, job);
      }
    }

    const source = await this.ensureLiveSource(tenantId, dto.provider);

    const jobs = [] as LiveSearchResponse["jobs"];

    for (const job of deduped.values()) {
      const contentHash = this.hashContent(job.title, job.description);
      const canonicalUrl = job.url ? this.canonicalizeUrl(job.url) : null;

      if (!canonicalUrl) {
        continue;
      }

      await this.prisma.job.upsert({
        where: {
          jobSourceId_externalId: {
            jobSourceId: source.id,
            externalId: job.externalId
          }
        },
        create: {
          tenantId,
          jobSourceId: source.id,
          externalId: job.externalId,
          title: job.title,
          description: job.description,
          location: job.location,
          url: canonicalUrl,
          postedAt: job.postedAt,
          contentHash
        },
        update: {
          title: job.title,
          description: job.description,
          location: job.location,
          url: canonicalUrl,
          postedAt: job.postedAt,
          contentHash,
          updatedAt: new Date()
        }
      });

      jobs.push({
        externalId: job.externalId,
        title: job.title,
        description: job.description,
        location: job.location ?? null,
        url: canonicalUrl,
        postedAt: job.postedAt ? job.postedAt.toISOString() : null,
        contentHash
      });
    }

    return { jobs };
  }

  private hashContent(title: string, description: string): string {
    return crypto.createHash("sha256").update(`${title}::${description}`).digest("hex");
  }

  private canonicalizeUrl(raw: string): string {
    const url = new URL(raw);
    url.hash = "";
    return url.toString();
  }

  private async ensureLiveSource(tenantId: string, provider: string): Promise<JobSource> {
    const name = `live-${provider}`;

    const existing = await this.prisma.jobSource.findFirst({
      where: { tenantId, type: provider, name }
    });

    if (existing) return existing;

    return this.prisma.jobSource.create({
      data: {
        tenantId,
        type: provider,
        name,
        config: { mode: "live" }
      }
    });
  }

  private async fetchProviderResults(dto: JobLiveSearchDto): Promise<LiveSearchResult[]> {
    if (dto.provider === "jsearch") {
      const apiKey = process.env.JSEARCH_API_KEY;
      if (!apiKey) return [];

      const params = new URLSearchParams({ query: dto.query, page: "1", num_pages: "1" });

      let payload:
        | {
            data?: Array<{
              job_id?: string;
              job_title?: string;
              job_description?: string;
              job_city?: string;
              job_country?: string;
              job_apply_link?: string;
              job_posted_at_datetime_utc?: string;
            }>;
          }
        | undefined;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);
      try {
        const response = await fetch(`https://jsearch.p.rapidapi.com/search?${params.toString()}`, {
          headers: {
            "X-RapidAPI-Key": apiKey,
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
          },
          signal: controller.signal
        });

        if (!response.ok) return [];
        payload = (await response.json()) as {
          data?: Array<{
            job_id?: string;
            job_title?: string;
            job_description?: string;
            job_city?: string;
            job_country?: string;
            job_apply_link?: string;
            job_posted_at_datetime_utc?: string;
          }>;
        };
      } catch {
        return [];
      } finally {
        clearTimeout(timeoutId);
      }

      return (payload.data ?? [])
        .filter((job) => job.job_id && job.job_title && job.job_apply_link)
        .map((job) => ({
          externalId: `js-${job.job_id!}`,
          title: job.job_title!,
          description: job.job_description ?? "",
          location: [job.job_city, job.job_country].filter(Boolean).join(", ") || undefined,
          url: job.job_apply_link!,
          postedAt: job.job_posted_at_datetime_utc
            ? new Date(job.job_posted_at_datetime_utc)
            : undefined
        }));
    }

    if (dto.provider === "serpapi") {
      const apiKey = process.env.SERPAPI_API_KEY;
      if (!apiKey) return [];

      const params = new URLSearchParams({
        engine: "google_jobs",
        q: dto.query,
        api_key: apiKey
      });
      if (dto.location) params.set("location", dto.location);

      let payload:
        | {
            jobs_results?: Array<{
              job_id?: string;
              title?: string;
              description?: string;
              location?: string;
              apply_options?: Array<{ link?: string }>;
              related_links?: Array<{ link?: string }>;
            }>;
          }
        | undefined;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);
      try {
        const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
          signal: controller.signal
        });
        if (!response.ok) return [];

        payload = (await response.json()) as {
          jobs_results?: Array<{
            job_id?: string;
            title?: string;
            description?: string;
            location?: string;
            apply_options?: Array<{ link?: string }>;
            related_links?: Array<{ link?: string }>;
          }>;
        };
      } catch {
        return [];
      } finally {
        clearTimeout(timeoutId);
      }

      return (payload.jobs_results ?? [])
        .filter((job) => job.job_id && job.title)
        .map((job) => ({
          externalId: `serp-${job.job_id!}`,
          title: job.title!,
          description: job.description ?? "",
          location: job.location,
          url:
            job.apply_options?.[0]?.link ||
            job.related_links?.[0]?.link ||
            "https://www.google.com/search?ibp=htl;jobs"
        }));
    }

    return [];
  }
}
