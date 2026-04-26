import type {
  JobSourceAdapter,
  SourceConfig,
  FetchResult,
  NormalizedJob
} from "./types";

/**
 * Greenhouse API job response structure.
 */
interface GreenhouseJob {
  id: number;
  title: string;
  updated_at: string;
  absolute_url: string;
  location: {
    name: string;
  };
  content?: string;
  departments?: Array<{ name: string }>;
}

/**
 * Greenhouse API jobs list response.
 */
interface GreenhouseJobsResponse {
  jobs: GreenhouseJob[];
  meta?: {
    total: number;
  };
}

/**
 * Greenhouse API job detail response.
 */
interface GreenhouseJobDetail {
  id: number;
  title: string;
  updated_at: string;
  absolute_url: string;
  location: {
    name: string;
  };
  content: string;
  departments?: Array<{ name: string }>;
}

/**
 * Extract board token from Greenhouse board URL.
 * Supports formats:
 * - https://boards.greenhouse.io/companyname
 * - https://boards-api.greenhouse.io/v1/boards/companyname/jobs
 * - companyname (just the token)
 */
function extractBoardToken(boardUrl: string): string {
  // If it's just a token (no URL parts)
  if (!boardUrl.includes("/") && !boardUrl.includes(".")) {
    return boardUrl;
  }

  // Try to extract from URL
  const patterns = [
    /boards\.greenhouse\.io\/([^/\s?]+)/i,
    /boards-api\.greenhouse\.io\/v1\/boards\/([^/\s?]+)/i
  ];

  for (const pattern of patterns) {
    const match = boardUrl.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // Fallback: assume it's the token
  return boardUrl.replace(/^https?:\/\//, "").split("/")[0];
}

/**
 * Adapter for fetching jobs from Greenhouse job boards.
 * Uses the public Greenhouse Boards API.
 *
 * API Documentation: https://developers.greenhouse.io/job-board.html
 */
export class GreenhouseAdapter implements JobSourceAdapter {
  readonly type = "greenhouse" as const;
  readonly name = "Greenhouse Job Board";

  private readonly baseApiUrl = "https://boards-api.greenhouse.io/v1/boards";

  validateConfig(config: SourceConfig): true | string {
    if (!config.boardUrl) {
      return "boardUrl is required for Greenhouse source";
    }
    return true;
  }

  async fetch(config: SourceConfig): Promise<FetchResult> {
    const validation = this.validateConfig(config);
    if (validation !== true) {
      return { jobs: [], errors: [validation] };
    }

    const boardToken = extractBoardToken(config.boardUrl!);
    const errors: string[] = [];

    try {
      // Fetch job list with timeout
      const jobsUrl = `${this.baseApiUrl}/${boardToken}/jobs?content=true`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      let response: Response;
      try {
        response = await fetch(jobsUrl, {
          headers: {
            Accept: "application/json",
            "User-Agent": "CV-Automation-Worker/1.0"
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
            `Greenhouse API error (${response.status}): ${errorText.slice(0, 200)}`
          ]
        };
      }

      const data: GreenhouseJobsResponse = await response.json();
      const jobs = await this.normalizeJobs(
        data.jobs,
        boardToken,
        config.companyName
      );

      // Apply location filter if specified
      let filteredJobs = jobs;
      if (config.location) {
        const locationLower = config.location.toLowerCase();
        filteredJobs = jobs.filter((job) => {
          const jobLoc = job.location?.toLowerCase() ?? "";
          return (
            jobLoc.includes(locationLower) ||
            (locationLower === "remote" &&
              (jobLoc.includes("remote") ||
                jobLoc.includes("anywhere") ||
                jobLoc.includes("worldwide") ||
                jobLoc.includes("telecommute")))
          );
        });
      }

      return {
        jobs: filteredJobs,
        totalCount: data.meta?.total ?? data.jobs.length,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isTimeout =
        error instanceof Error && error.name === "AbortError";
      return {
        jobs: [],
        errors: [
          isTimeout
            ? "Greenhouse request timed out"
            : `Failed to fetch from Greenhouse: ${errorMessage}`
        ]
      };
    }
  }

  private async normalizeJobs(
    greenhouseJobs: GreenhouseJob[],
    boardToken: string,
    companyName?: string
  ): Promise<NormalizedJob[]> {
    return greenhouseJobs.map((job) => ({
      externalId: `gh-${boardToken}-${job.id}`,
      title: job.title,
      description: this.stripHtml(job.content || ""),
      location: job.location?.name,
      url: job.absolute_url,
      postedAt: job.updated_at ? new Date(job.updated_at) : undefined,
      company: companyName || boardToken,
      tags: job.departments?.map((d) => d.name),
      metadata: {
        departments: job.departments?.map((department) => department.name) ?? []
      }
    }));
  }

  /**
   * Strip HTML tags from job description.
   * Note: Greenhouse API returns HTML with encoded entities, so we decode first, then strip tags.
   */
  private stripHtml(html: string): string {
    return (
      html
        // First decode HTML entities (Greenhouse encodes them)
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        // Then strip the actual HTML tags
        .replace(/<[^>]*>/g, " ")
        // Clean up whitespace
        .replace(/\s+/g, " ")
        .trim()
    );
  }
}
