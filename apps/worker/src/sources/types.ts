/**
 * Normalized job structure used across all source adapters.
 * This is the common format that all adapters convert their data to.
 */
export interface NormalizedJob {
  externalId: string;
  title: string;
  description: string;
  location?: string;
  url: string;
  postedAt?: Date;
  company?: string;
  salary?: string;
  tags?: string[];
}

/**
 * Source type identifiers for different job board adapters.
 */
export type SourceType =
  | "greenhouse"
  | "lever"
  | "remoteok"
  | "remotive"
  | "jsearch"
  | "adzuna"
  | "manual";

/**
 * Configuration stored in JobSource.config JSON field.
 * Different source types use different config fields.
 */
export interface SourceConfig {
  /** Board URL for Greenhouse/Lever sources */
  boardUrl?: string;
  /** Company name for identification */
  companyName?: string;
  /** API key for paid sources (JSearch, Adzuna) */
  apiKey?: string;
  /** Keywords to filter job titles */
  keywords?: string[];
  /** Role keywords to match */
  roles?: string[];
  /** Location filter */
  location?: string;
  /** Category filter for APIs that support it */
  category?: string;
  /** Maximum number of jobs to fetch per sync */
  limit?: number;
}

/**
 * Result from a source adapter fetch operation.
 */
export interface FetchResult {
  jobs: NormalizedJob[];
  /** Total jobs available (if pagination supported) */
  totalCount?: number;
  /** Any errors or warnings during fetch */
  errors?: string[];
}

/**
 * Interface that all job source adapters must implement.
 * This enables modular, pluggable job sources.
 */
export interface JobSourceAdapter {
  /** Unique identifier for this source type */
  readonly type: SourceType;

  /** Human-readable name */
  readonly name: string;

  /**
   * Fetch jobs from the source.
   * @param config - Source-specific configuration
   * @returns Normalized jobs and metadata
   */
  fetch(config: SourceConfig): Promise<FetchResult>;

  /**
   * Validate that the config is correct for this source type.
   * @param config - Source configuration to validate
   * @returns true if valid, error message if invalid
   */
  validateConfig(config: SourceConfig): true | string;
}

/**
 * Keywords used to filter for junior-level positions.
 */
export const JUNIOR_KEYWORDS = [
  "junior",
  "entry",
  "entry-level",
  "entry level",
  "graduate",
  "grad",
  "intern",
  "internship",
  "trainee",
  "associate",
  "early career",
  "0-2 years",
  "1-2 years",
  "0-3 years",
  "1-3 years"
];

/**
 * Keywords for developer/engineer roles.
 */
export const DEVELOPER_ROLE_KEYWORDS = [
  "software",
  "developer",
  "engineer",
  "fullstack",
  "full-stack",
  "full stack",
  "frontend",
  "front-end",
  "front end",
  "backend",
  "back-end",
  "back end",
  "web developer",
  "programmer"
];

export interface JuniorFilterConfig {
  keywords?: string[];
  roles?: string[];
  includeUnspecified?: boolean;
}

/**
 * Check if a job title matches junior-level criteria.
 */
export function isJuniorRole(title: string, keywords?: string[]): boolean {
  const lowerTitle = title.toLowerCase();
  const juniorKeywords = keywords?.length ? keywords : JUNIOR_KEYWORDS;

  // Check if title contains junior keywords
  const hasJuniorKeyword = juniorKeywords.some((kw) =>
    lowerTitle.includes(kw.toLowerCase())
  );

  // Also check if it explicitly mentions senior/lead/principal (exclude these)
  const seniorKeywords = [
    "senior",
    "sr.",
    "lead",
    "principal",
    "staff",
    "director",
    "manager",
    "head of",
    "vp ",
    "chief"
  ];
  const isSenior = seniorKeywords.some((kw) =>
    lowerTitle.includes(kw.toLowerCase())
  );

  return hasJuniorKeyword && !isSenior;
}

/**
 * Check if a job title matches developer role criteria.
 */
export function isDeveloperRole(title: string, roles?: string[]): boolean {
  const lowerTitle = title.toLowerCase();
  const roleKeywords = roles?.length ? roles : DEVELOPER_ROLE_KEYWORDS;

  return roleKeywords.some((role) => lowerTitle.includes(role.toLowerCase()));
}

/**
 * Filter jobs by junior developer criteria.
 */
export function filterJuniorDeveloperJobs(
  jobs: NormalizedJob[],
  config?: JuniorFilterConfig
): NormalizedJob[] {
  const { keywords, roles, includeUnspecified = true } = config || {};

  return jobs.filter((job) => {
    const isDev = isDeveloperRole(job.title, roles);
    const isJunior = isJuniorRole(job.title, keywords);

    // If it's a developer role and explicitly junior, include it
    if (isDev && isJunior) {
      return true;
    }

    // If includeUnspecified is true, include developer roles without seniority level
    // (no explicit junior OR senior keywords)
    if (includeUnspecified && isDev) {
      const lowerTitle = job.title.toLowerCase();
      const hasAnySeniorityKeyword = [
        ...JUNIOR_KEYWORDS,
        "senior",
        "sr.",
        "lead",
        "principal",
        "staff",
        "mid",
        "middle"
      ].some((kw) => lowerTitle.includes(kw.toLowerCase()));

      // Include if it's a developer role with no seniority specified
      return !hasAnySeniorityKeyword;
    }

    return false;
  });
}
