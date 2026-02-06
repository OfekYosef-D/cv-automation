import type {
  JobSourceAdapter,
  SourceConfig,
  FetchResult,
  NormalizedJob
} from "./types";

/**
 * RemoteOK API job structure.
 * The API returns an array where the first element is metadata.
 */
interface RemoteOKJob {
  id: string;
  epoch: string;
  date: string;
  company: string;
  company_logo?: string;
  position: string;
  tags: string[];
  logo?: string;
  description: string;
  location: string;
  salary_min?: number;
  salary_max?: number;
  url: string;
  apply_url?: string;
}

/**
 * Adapter for fetching jobs from RemoteOK.
 * Uses the free public API at https://remoteok.com/api
 *
 * Note: The API returns remote jobs only. No location filtering needed.
 */
export class RemoteOKAdapter implements JobSourceAdapter {
  readonly type = "remoteok" as const;
  readonly name = "RemoteOK";

  private readonly apiUrl = "https://remoteok.com/api";

  validateConfig(_config: SourceConfig): true | string {
    // RemoteOK doesn't require any specific config
    return true;
  }

  async fetch(config: SourceConfig): Promise<FetchResult> {
    const errors: string[] = [];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      let response: Response;
      try {
        response = await fetch(this.apiUrl, {
          headers: {
            Accept: "application/json",
            "User-Agent": "CV-Automation-Worker/1.0 (job-search-aggregator)"
          },
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorText = await response.text();
        return {
          jobs: [],
          errors: [
            `RemoteOK API error (${response.status}): ${errorText.slice(0, 200)}`
          ]
        };
      }

      const data = await response.json();

      // RemoteOK returns an array where first element is metadata/legal notice
      const jobs: RemoteOKJob[] = Array.isArray(data) ? data.slice(1) : [];

      // Filter for developer/engineer jobs
      let normalizedJobs = this.normalizeJobs(jobs);

      // Apply category filter if specified (e.g., "software-dev")
      if (config.category) {
        const categoryLower = config.category.toLowerCase();
        normalizedJobs = normalizedJobs.filter(
          (job) =>
            job.tags?.some((tag) => tag.toLowerCase().includes(categoryLower)) ||
            job.title.toLowerCase().includes(categoryLower)
        );
      }

      // Apply limit if specified
      if (config.limit !== undefined && normalizedJobs.length > config.limit) {
        normalizedJobs = normalizedJobs.slice(0, config.limit);
      }

      return {
        jobs: normalizedJobs,
        totalCount: jobs.length,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      const isTimeout =
        error instanceof Error && error.name === "AbortError";
      const errorMessage = isTimeout
        ? "RemoteOK request timed out"
        : `Failed to fetch from RemoteOK: ${error instanceof Error ? error.message : "Unknown error"}`;
      return {
        jobs: [],
        errors: [errorMessage]
      };
    }
  }

  private normalizeJobs(remoteOKJobs: RemoteOKJob[]): NormalizedJob[] {
    return remoteOKJobs.map((job) => ({
      externalId: `rok-${job.id}`,
      title: job.position,
      description: this.stripHtml(job.description || ""),
      location: job.location || "Remote",
      url: job.apply_url || job.url || `https://remoteok.com/remote-jobs/${job.id}`,
      postedAt: job.date ? new Date(job.date) : undefined,
      company: job.company,
      salary: this.formatSalary(job.salary_min, job.salary_max),
      tags: job.tags
    }));
  }

  private formatSalary(min?: number, max?: number): string | undefined {
    if (!min && !max) return undefined;
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `$${min.toLocaleString()}+`;
    return max ? `Up to $${max.toLocaleString()}` : undefined;
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }
}
