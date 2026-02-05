import type {
  JobSourceAdapter,
  SourceConfig,
  FetchResult,
  NormalizedJob
} from "./types";

/**
 * Remotive API job structure.
 */
interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo?: string;
  category: string;
  tags: string[];
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  salary: string;
  description: string;
}

/**
 * Remotive API response structure.
 */
interface RemotiveResponse {
  "0-legal-notice": string;
  "job-count": number;
  jobs: RemotiveJob[];
}

/**
 * Remotive job categories for filtering.
 */
export const REMOTIVE_CATEGORIES = {
  SOFTWARE_DEV: "software-dev",
  FRONTEND: "frontend-dev",
  BACKEND: "backend-dev",
  FULLSTACK: "fullstack-dev",
  QA: "qa",
  DEVOPS: "devops-sysadmin",
  DATA: "data",
  ALL: "all"
} as const;

/**
 * Adapter for fetching jobs from Remotive.
 * Uses the free public API at https://remotive.com/api/remote-jobs
 *
 * API supports category filtering via query parameter.
 */
export class RemotiveAdapter implements JobSourceAdapter {
  readonly type = "remotive" as const;
  readonly name = "Remotive";

  private readonly baseApiUrl = "https://remotive.com/api/remote-jobs";

  validateConfig(_config: SourceConfig): true | string {
    // Remotive doesn't require any specific config
    return true;
  }

  async fetch(config: SourceConfig): Promise<FetchResult> {
    const errors: string[] = [];

    try {
      // Build URL with optional category filter
      let url = this.baseApiUrl;
      const category = config.category || REMOTIVE_CATEGORIES.SOFTWARE_DEV;

      if (category && category !== REMOTIVE_CATEGORIES.ALL) {
        url += `?category=${encodeURIComponent(category)}`;
      }

      // Add limit if specified
      if (config.limit) {
        url += url.includes("?") ? "&" : "?";
        url += `limit=${config.limit}`;
      }

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "CV-Automation-Worker/1.0"
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          jobs: [],
          errors: [
            `Remotive API error (${response.status}): ${errorText.slice(0, 200)}`
          ]
        };
      }

      const data: RemotiveResponse = await response.json();
      let normalizedJobs = this.normalizeJobs(data.jobs);

      // Filter by location if specified
      // Remotive's candidate_required_location field contains location restrictions
      if (config.location) {
        const locationLower = config.location.toLowerCase();
        normalizedJobs = normalizedJobs.filter((job) => {
          const jobLocation = job.location?.toLowerCase() || "";
          // Include if:
          // - Job location contains the target location
          // - Job is worldwide/anywhere
          // - Target is remote and job allows remote
          return (
            jobLocation.includes(locationLower) ||
            jobLocation.includes("worldwide") ||
            jobLocation.includes("anywhere") ||
            jobLocation.includes("global") ||
            (locationLower === "israel" &&
              (jobLocation.includes("emea") ||
                jobLocation.includes("europe") ||
                jobLocation.includes("middle east"))) ||
            (locationLower === "remote" && job.location?.toLowerCase() !== "")
          );
        });
      }

      return {
        jobs: normalizedJobs,
        totalCount: data["job-count"],
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        jobs: [],
        errors: [`Failed to fetch from Remotive: ${errorMessage}`]
      };
    }
  }

  private normalizeJobs(remotiveJobs: RemotiveJob[]): NormalizedJob[] {
    return remotiveJobs.map((job) => ({
      externalId: `rmtv-${job.id}`,
      title: job.title,
      description: this.stripHtml(job.description || ""),
      location: job.candidate_required_location || "Remote",
      url: job.url,
      postedAt: job.publication_date
        ? new Date(job.publication_date)
        : undefined,
      company: job.company_name,
      salary: job.salary || undefined,
      tags: [...(job.tags || []), job.category, job.job_type].filter(Boolean)
    }));
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
