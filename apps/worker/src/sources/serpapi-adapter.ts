import type {
  JobSourceAdapter,
  SourceConfig,
  FetchResult,
  NormalizedJob
} from "./types";

interface SerpApiJob {
  job_id?: string;
  title?: string;
  description?: string;
  location?: string;
  thumbnail?: string;
  detected_extensions?: {
    posted_at?: string;
  };
  related_links?: Array<{ link?: string }>;
  apply_options?: Array<{ link?: string }>;
}

interface SerpApiResponse {
  jobs_results?: SerpApiJob[];
}

export class SerpApiAdapter implements JobSourceAdapter {
  readonly type = "serpapi" as const;
  readonly name = "SerpAPI";

  validateConfig(config: SourceConfig): true | string {
    if (!config.apiKey) return "apiKey is required for SerpAPI source";
    if (!config.query) return "query is required for SerpAPI source";
    return true;
  }

  async fetch(config: SourceConfig): Promise<FetchResult> {
    const validation = this.validateConfig(config);
    if (validation !== true) {
      return { jobs: [], errors: [validation] };
    }

    const params = new URLSearchParams({
      engine: "google_jobs",
      q: config.query!,
      hl: "en",
      api_key: config.apiKey!
    });

    if (config.location) {
      params.set("location", config.location);
    }

    const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`);

    if (!response.ok) {
      return {
        jobs: [],
        errors: [`SerpAPI error (${response.status})`]
      };
    }

    const payload = (await response.json()) as SerpApiResponse;
    const jobs = (payload.jobs_results ?? []).map(this.normalizeJob).filter(Boolean) as NormalizedJob[];

    return {
      jobs: config.limit ? jobs.slice(0, config.limit) : jobs,
      totalCount: jobs.length
    };
  }

  private normalizeJob(job: SerpApiJob): NormalizedJob | null {
    const externalId = job.job_id;
    const title = job.title;
    if (!externalId || !title) return null;

    const url =
      job.apply_options?.[0]?.link ||
      job.related_links?.[0]?.link ||
      "https://www.google.com/search?ibp=htl;jobs";

    return {
      externalId: `serp-${externalId}`,
      title,
      description: job.description ?? "",
      location: job.location,
      url,
      postedAt: job.detected_extensions?.posted_at
        ? new Date(job.detected_extensions.posted_at)
        : undefined,
      tags: ["serpapi"]
    };
  }
}
