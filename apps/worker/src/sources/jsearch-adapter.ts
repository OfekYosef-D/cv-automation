import type {
  JobSourceAdapter,
  SourceConfig,
  FetchResult,
  NormalizedJob
} from "./types";

interface JSearchJob {
  job_id?: string;
  job_title?: string;
  job_description?: string;
  job_city?: string;
  job_country?: string;
  job_apply_link?: string;
  employer_name?: string;
  job_posted_at_datetime_utc?: string;
}

interface JSearchResponse {
  data?: JSearchJob[];
}

export class JSearchAdapter implements JobSourceAdapter {
  readonly type = "jsearch" as const;
  readonly name = "JSearch";

  validateConfig(config: SourceConfig): true | string {
    if (!config.apiKey) return "apiKey is required for JSearch source";
    if (!config.query) return "query is required for JSearch source";
    return true;
  }

  async fetch(config: SourceConfig): Promise<FetchResult> {
    const validation = this.validateConfig(config);
    if (validation !== true) {
      return { jobs: [], errors: [validation] };
    }

    const params = new URLSearchParams({
      query: config.query!,
      page: "1",
      num_pages: "1"
    });

    const response = await fetch(`https://jsearch.p.rapidapi.com/search?${params.toString()}`, {
      headers: {
        "X-RapidAPI-Key": config.apiKey!,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
      }
    });

    if (!response.ok) {
      return {
        jobs: [],
        errors: [`JSearch error (${response.status})`]
      };
    }

    const payload = (await response.json()) as JSearchResponse;
    const jobs = (payload.data ?? []).map(this.normalizeJob).filter(Boolean) as NormalizedJob[];

    return {
      jobs: config.limit ? jobs.slice(0, config.limit) : jobs,
      totalCount: jobs.length
    };
  }

  private normalizeJob(job: JSearchJob): NormalizedJob | null {
    if (!job.job_id || !job.job_title || !job.job_apply_link) {
      return null;
    }

    const location = [job.job_city, job.job_country].filter(Boolean).join(", ") || undefined;

    return {
      externalId: `js-${job.job_id}`,
      title: job.job_title,
      description: job.job_description ?? "",
      location,
      url: job.job_apply_link,
      company: job.employer_name,
      postedAt: job.job_posted_at_datetime_utc
        ? new Date(job.job_posted_at_datetime_utc)
        : undefined,
      tags: ["jsearch"]
    };
  }
}
