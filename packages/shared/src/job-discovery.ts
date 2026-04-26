import crypto from "node:crypto";
import type { MatchProfile } from "@cv/matching";
import { matchJob } from "@cv/matching";

export const JOB_SEARCH_PROVIDERS = ["serpapi", "jsearch"] as const;
export type JobSearchProvider = (typeof JOB_SEARCH_PROVIDERS)[number];

export const JOB_SEARCH_SOURCE_ORIGINS = ["all", "linkedin"] as const;
export type JobSearchSourceOrigin = (typeof JOB_SEARCH_SOURCE_ORIGINS)[number];

export interface DiscoveryJobInput {
  externalId?: string;
  title: string;
  description: string;
  url?: string;
  company?: string | null;
  salary?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
  location?: string | null;
  postedAt?: Date | null;
  origin?: JobSearchSourceOrigin;
  sourceLabel?: string;
}

export interface DiscoveryFilters {
  sourceOrigin?: JobSearchSourceOrigin;
  includeKeywords?: string[];
  excludeKeywords?: string[];
  seniority?: string | null;
  postedWithinHours?: number | null;
}

export interface DiscoverySearchInput extends DiscoveryFilters {
  provider: JobSearchProvider;
  query: string;
  location?: string | null;
  relatedTitles?: boolean;
  maxResultsPerRun?: number | null;
  minMatchScore?: number | null;
  useProfile?: boolean;
}

export interface DiscoverySearchResult extends DiscoveryJobInput {
  externalId: string;
  url: string;
  canonicalUrl: string;
  contentHash: string;
  dedupeKey: string;
  matchScore: number | null;
  matchExplanations: string[];
}

export interface PersistDiscoveryJobsInput {
  prisma: any;
  tenantId: string;
  provider: JobSearchProvider;
  queryId?: string;
  jobs: DiscoverySearchResult[];
}

export interface PersistedJobRecord {
  id: string;
  url: string;
  metadata?: unknown;
}

export interface PersistedDiscoveryJob {
  job: PersistedJobRecord;
  isNew: boolean;
}

const RELATED_TITLE_VARIANTS: Record<string, string[]> = {
  "software engineer": [
    "software developer",
    "full stack engineer",
    "backend engineer",
    "frontend engineer"
  ],
  "software developer": [
    "software engineer",
    "full stack developer",
    "backend developer",
    "frontend developer"
  ]
};

function normalizeKeywordList(values: string[] | undefined): string[] {
  return (values ?? [])
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function textForSearch(job: DiscoveryJobInput): string {
  return [job.title, job.description, job.company ?? "", job.location ?? "", ...(job.tags ?? [])]
    .join(" ")
    .toLowerCase();
}

function hashContent(title: string, description: string): string {
  return crypto.createHash("sha256").update(`${title}::${description}`).digest("hex");
}

function buildTargetedQuery(
  query: string,
  variant: string,
  location?: string | null,
  profile?: MatchProfile | null
): string {
  const profileTerms = profile
    ? [profile.seniority, ...profile.desiredRoles, ...profile.mustHaveSkills.slice(0, 4)]
    : [];

  return [variant || query, ...profileTerms, location ?? ""]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
}

function isSameOrigin(sourceOrigin: JobSearchSourceOrigin, job: DiscoveryJobInput): boolean {
  return sourceOrigin === "all" || isLinkedInOriginJob(job);
}

function scoreDiscoveryJob(job: DiscoveryJobInput, profile?: MatchProfile | null) {
  if (!profile) {
    return { score: null, explanations: [] as string[] };
  }

  const result = matchJob(profile, {
    title: job.title,
    description: job.description,
    location: job.location ?? undefined,
    postedAt: job.postedAt ?? undefined
  });

  return { score: result.score, explanations: result.explanations };
}

async function fetchJSearchResults(
  request: DiscoverySearchInput,
  profile?: MatchProfile | null
): Promise<DiscoveryJobInput[]> {
  const apiKey = process.env.JSEARCH_API_KEY;
  if (!apiKey) {
    return [];
  }

  const searchVariants = buildSearchVariants(request.query, request.relatedTitles ?? true);
  const jobs: DiscoveryJobInput[] = [];
  const location = request.location?.trim() || (request.useProfile ? profile?.location : undefined) || "Israel";

  for (const variant of searchVariants) {
    const params = new URLSearchParams({
      query: buildTargetedQuery(request.query, variant, location, request.useProfile ? profile : null),
      page: "1",
      num_pages: "1",
      country: "il"
    });

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

      if (!response.ok) {
        continue;
      }

      const payload = (await response.json()) as {
        data?: Array<{
          job_id?: string;
          job_title?: string;
          job_description?: string;
          employer_name?: string;
          job_city?: string;
          job_country?: string;
          job_apply_link?: string;
          job_posted_at_datetime_utc?: string;
          job_employment_type?: string;
          job_highlights?: {
            Qualifications?: string[];
            Responsibilities?: string[];
            Benefits?: string[];
          };
          job_required_skills?: string[];
          job_is_remote?: boolean;
        }>;
      };

      for (const job of payload.data ?? []) {
        if (!job.job_id || !job.job_title || !job.job_apply_link) {
          continue;
        }

        jobs.push({
          externalId: `js-${job.job_id}`,
          title: job.job_title,
          description: job.job_description ?? "",
          company: job.employer_name ?? null,
          salary: null,
          tags: [
            ...(job.job_required_skills ?? []),
            ...(job.job_highlights?.Qualifications ?? []),
            job.job_employment_type ?? "",
            job.job_is_remote ? "remote" : ""
          ].filter(Boolean),
          metadata: {
            highlights: job.job_highlights ?? null
          },
          location: [job.job_city, job.job_country].filter(Boolean).join(", ") || null,
          url: job.job_apply_link,
          postedAt: job.job_posted_at_datetime_utc
            ? new Date(job.job_posted_at_datetime_utc)
            : null,
          origin: isLinkedInOriginJob({ url: job.job_apply_link }) ? "linkedin" : "all",
          sourceLabel: "JSearch"
        });
      }
    } catch {
      continue;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return jobs;
}

async function fetchSerpApiResults(
  request: DiscoverySearchInput,
  profile?: MatchProfile | null
): Promise<DiscoveryJobInput[]> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    return [];
  }

  const searchVariants = buildSearchVariants(request.query, request.relatedTitles ?? true);
  const jobs: DiscoveryJobInput[] = [];
  const location = request.location?.trim() || (request.useProfile ? profile?.location : undefined) || "Israel";

  for (const variant of searchVariants) {
    const params = new URLSearchParams({
      engine: "google_jobs",
      q: buildTargetedQuery(request.query, variant, undefined, request.useProfile ? profile : null) || request.query,
      api_key: apiKey
    });
    if (location) {
      params.set("location", location);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
        signal: controller.signal
      });
      if (!response.ok) {
        continue;
      }

      const payload = (await response.json()) as {
        jobs_results?: Array<{
          job_id?: string;
          title?: string;
          description?: string;
          company_name?: string;
          location?: string;
          apply_options?: Array<{ link?: string }>;
          related_links?: Array<{ link?: string }>;
          detected_extensions?: {
            schedule_type?: string;
            posted_at?: string;
          };
          extensions?: string[];
        }>;
      };

      for (const job of payload.jobs_results ?? []) {
        if (!job.job_id || !job.title) {
          continue;
        }

        const url =
          job.apply_options?.find((option) => option.link)?.link ||
          job.related_links?.find((link) => link.link)?.link;

        if (!url) {
          continue;
        }

        jobs.push({
          externalId: `serp-${job.job_id}`,
          title: job.title,
          description: job.description ?? "",
          company: job.company_name ?? null,
          salary: null,
          tags: [job.detected_extensions?.schedule_type ?? "", ...(job.extensions ?? [])].filter(
            Boolean
          ),
          metadata: {
            applyOptions: job.apply_options ?? [],
            relatedLinks: job.related_links ?? []
          },
          location: job.location ?? null,
          url,
          postedAt: null,
          origin: isLinkedInOriginJob({ url }) ? "linkedin" : "all",
          sourceLabel: "SerpApi"
        });
      }
    } catch {
      continue;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return jobs;
}

function mergeDiscoveryMetadata(
  existingMetadata: unknown,
  job: DiscoverySearchResult,
  queryId?: string
): Record<string, unknown> {
  const existing = existingMetadata && typeof existingMetadata === "object" && !Array.isArray(existingMetadata)
    ? (existingMetadata as Record<string, unknown>)
    : {};
  const existingDiscovery =
    existing.discovery && typeof existing.discovery === "object" && !Array.isArray(existing.discovery)
      ? (existing.discovery as Record<string, unknown>)
      : {};

  const existingQueryIds = Array.isArray(existingDiscovery.matchedQueryIds)
    ? existingDiscovery.matchedQueryIds.filter((value): value is string => typeof value === "string")
    : [];

  const matchedQueryIds = queryId
    ? Array.from(new Set([...existingQueryIds, queryId]))
    : existingQueryIds;

  return {
    ...existing,
    ...job.metadata,
    discovery: {
      ...existingDiscovery,
      origin: job.origin ?? "all",
      sourceLabel: job.sourceLabel ?? null,
      matchedQueryIds
    }
  };
}

export function buildSearchVariants(query: string, relatedTitles: boolean): string[] {
  const baseQuery = query.trim();
  if (!baseQuery) {
    return [];
  }

  if (!relatedTitles) {
    return [baseQuery];
  }

  const normalized = baseQuery.toLowerCase();
  const variants = RELATED_TITLE_VARIANTS[normalized] ?? [];

  return [baseQuery, ...variants.filter((variant) => variant.toLowerCase() !== normalized)];
}

export function canonicalizeJobUrl(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    url.hash = "";
    url.searchParams.delete("utm_source");
    url.searchParams.delete("utm_medium");
    url.searchParams.delete("utm_campaign");
    if (!url.searchParams.toString()) {
      url.search = "";
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function isLinkedInOriginJob(job: Pick<DiscoveryJobInput, "url">): boolean {
  const canonicalUrl = canonicalizeJobUrl(job.url);
  if (!canonicalUrl) {
    return false;
  }

  return canonicalUrl.includes("linkedin.com/");
}

export function passesDiscoveryFilters(
  job: DiscoveryJobInput,
  filters: DiscoveryFilters
): boolean {
  if (!isSameOrigin(filters.sourceOrigin ?? "all", job)) {
    return false;
  }

  const haystack = textForSearch(job);
  const includeKeywords = normalizeKeywordList(filters.includeKeywords);
  if (includeKeywords.length > 0 && !includeKeywords.every((keyword) => haystack.includes(keyword))) {
    return false;
  }

  const excludeKeywords = normalizeKeywordList(filters.excludeKeywords);
  if (excludeKeywords.some((keyword) => haystack.includes(keyword))) {
    return false;
  }

  const seniority = filters.seniority?.trim().toLowerCase();
  if (seniority && !job.title.toLowerCase().includes(seniority)) {
    return false;
  }

  if (filters.postedWithinHours && job.postedAt) {
    const maxAgeMs = filters.postedWithinHours * 60 * 60 * 1000;
    if (Date.now() - job.postedAt.getTime() > maxAgeMs) {
      return false;
    }
  }

  return true;
}

export function buildAlertDedupeKey(job: DiscoveryJobInput): string {
  const canonicalUrl = canonicalizeJobUrl(job.url);
  const dedupeSource = canonicalUrl
    ? canonicalUrl
    : [job.title.trim().toLowerCase(), job.company ?? "", job.location ?? ""]
        .map((value) => value.trim().toLowerCase())
        .join("|");

  return crypto.createHash("sha256").update(dedupeSource).digest("hex");
}

export async function executeDiscoverySearch(
  request: DiscoverySearchInput,
  profile?: MatchProfile | null
): Promise<DiscoverySearchResult[]> {
  const rawJobs =
    request.provider === "jsearch"
      ? await fetchJSearchResults(request, profile)
      : await fetchSerpApiResults(request, profile);

  const deduped = new Map<string, DiscoverySearchResult>();

  for (const job of rawJobs) {
    const canonicalUrl = canonicalizeJobUrl(job.url);
    if (!canonicalUrl || !job.externalId) {
      continue;
    }

    if (!passesDiscoveryFilters(job, request)) {
      continue;
    }

    const { score, explanations } = scoreDiscoveryJob(job, request.useProfile ? profile : null);
    if (request.minMatchScore !== null && request.minMatchScore !== undefined && score !== null && score < request.minMatchScore) {
      continue;
    }

    const result: DiscoverySearchResult = {
      externalId: job.externalId,
      title: job.title,
      description: job.description,
      company: job.company ?? null,
      salary: job.salary ?? null,
      tags: job.tags ?? [],
      metadata: job.metadata,
      location: job.location ?? null,
      url: canonicalUrl,
      canonicalUrl,
      postedAt: job.postedAt ?? null,
      origin: job.origin ?? (isLinkedInOriginJob(job) ? "linkedin" : "all"),
      sourceLabel: job.sourceLabel ?? request.provider,
      contentHash: hashContent(job.title, job.description),
      dedupeKey: buildAlertDedupeKey({ ...job, url: canonicalUrl }),
      matchScore: score,
      matchExplanations: explanations
    };

    const dedupeId = `${result.canonicalUrl}::${result.externalId}`;
    if (!deduped.has(dedupeId)) {
      deduped.set(dedupeId, result);
    }
  }

  const results = Array.from(deduped.values()).sort((left, right) => {
    const scoreDelta = (right.matchScore ?? 0) - (left.matchScore ?? 0);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return (right.postedAt?.toISOString() ?? "").localeCompare(left.postedAt?.toISOString() ?? "");
  });

  if (!request.maxResultsPerRun || request.maxResultsPerRun <= 0) {
    return results;
  }

  return results.slice(0, request.maxResultsPerRun);
}

export async function persistDiscoveryJobs(
  input: PersistDiscoveryJobsInput
): Promise<PersistedDiscoveryJob[]> {
  const source = await input.prisma.jobSource.upsert({
    where: {
      tenantId_type_name: {
        tenantId: input.tenantId,
        type: input.provider,
        name: `live-${input.provider}`
      }
    },
    create: {
      tenantId: input.tenantId,
      type: input.provider,
      name: `live-${input.provider}`,
      config: { mode: "live" }
    },
    update: {
      config: { mode: "live" }
    }
  });

  const persisted: PersistedDiscoveryJob[] = [];

  for (const result of input.jobs) {
    const existingByUrl = await input.prisma.job.findFirst({
      where: {
        tenantId: input.tenantId,
        url: result.canonicalUrl
      }
    });

    if (existingByUrl) {
      const updated = await input.prisma.job.update({
        where: { id: existingByUrl.id },
        data: {
          title: result.title,
          description: result.description,
          company: result.company,
          salary: result.salary,
          tags: result.tags,
          metadata: mergeDiscoveryMetadata(existingByUrl.metadata, result, input.queryId),
          location: result.location,
          url: result.canonicalUrl,
          postedAt: result.postedAt ?? undefined,
          contentHash: result.contentHash
        }
      });

      persisted.push({ job: updated, isNew: false });
      continue;
    }

    const existingByExternalId = await input.prisma.job.findUnique({
      where: {
        jobSourceId_externalId: {
          jobSourceId: source.id,
          externalId: result.externalId
        }
      }
    });

    if (existingByExternalId) {
      const updated = await input.prisma.job.update({
        where: { id: existingByExternalId.id },
        data: {
          title: result.title,
          description: result.description,
          company: result.company,
          salary: result.salary,
          tags: result.tags,
          metadata: mergeDiscoveryMetadata(existingByExternalId.metadata, result, input.queryId),
          location: result.location,
          url: result.canonicalUrl,
          postedAt: result.postedAt ?? undefined,
          contentHash: result.contentHash
        }
      });

      persisted.push({ job: updated, isNew: false });
      continue;
    }

    const created = await input.prisma.job.create({
      data: {
        tenantId: input.tenantId,
        jobSourceId: source.id,
        externalId: result.externalId,
        title: result.title,
        description: result.description,
        company: result.company,
        salary: result.salary,
        tags: result.tags,
        metadata: mergeDiscoveryMetadata(null, result, input.queryId),
        location: result.location,
        url: result.canonicalUrl,
        postedAt: result.postedAt ?? undefined,
        contentHash: result.contentHash
      }
    });

    persisted.push({ job: created, isNew: true });
  }

  return persisted;
}
