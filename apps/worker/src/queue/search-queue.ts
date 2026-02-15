import crypto from "node:crypto";
import { Job, Queue, Worker } from "bullmq";
import { prisma } from "@cv/db";
import { createRedisConnection } from "./connection";
import {
  JSearchAdapter,
  SerpApiAdapter,
  type JobSourceAdapter,
  type SourceConfig,
  type NormalizedJob
} from "../sources";

export const SEARCH_QUEUE_NAME = "job-search-poller";

export interface SearchPollJobData {
  queryId: string;
  tenantId: string;
  provider: string;
}

export interface SearchPollJobResult {
  fetchedCount: number;
  processedCount: number;
  errors?: string[];
  completedAt: string;
}

export interface SearchPollQuery {
  id: string;
  tenantId: string;
  provider: string;
  cadenceSeconds: number;
  enabled: boolean;
}

const searchAdapters: Record<string, JobSourceAdapter> = {
  jsearch: new JSearchAdapter(),
  serpapi: new SerpApiAdapter()
};

export function createSearchQueue(): Queue<SearchPollJobData, SearchPollJobResult> {
  return new Queue<SearchPollJobData, SearchPollJobResult>(SEARCH_QUEUE_NAME, {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 2,
      removeOnComplete: { age: 24 * 3600, count: 1000 },
      removeOnFail: { age: 7 * 24 * 3600 }
    }
  });
}

export function createSearchWorker(
  processor: (job: Job<SearchPollJobData>) => Promise<SearchPollJobResult>
): Worker<SearchPollJobData, SearchPollJobResult> {
  return new Worker<SearchPollJobData, SearchPollJobResult>(SEARCH_QUEUE_NAME, processor, {
    connection: createRedisConnection(),
    concurrency: 3
  });
}

export async function scheduleSearchQueries(
  queue: Pick<Queue<SearchPollJobData, SearchPollJobResult>, "add">,
  queries: SearchPollQuery[]
): Promise<void> {
  for (const query of queries) {
    if (!query.enabled) continue;

    await queue.add(
      `poll-${query.id}`,
      {
        queryId: query.id,
        tenantId: query.tenantId,
        provider: query.provider
      },
      {
        repeat: { every: query.cadenceSeconds * 1000 },
        jobId: `search-repeat-${query.id}`
      }
    );
  }
}

export async function scheduleSearchQueriesFromDb(): Promise<void> {
  const queries = await prisma.jobSearchQuery.findMany({
    where: { enabled: true },
    select: {
      id: true,
      tenantId: true,
      provider: true,
      cadenceSeconds: true,
      enabled: true
    }
  });

  const queue = createSearchQueue();
  try {
    await scheduleSearchQueries(queue, queries);
  } finally {
    await queue.close();
  }
}

function hashContent(title: string, description: string): string {
  return crypto
    .createHash("sha256")
    .update(`${title}::${description}`)
    .digest("hex");
}

async function ensureJobSourceForQuery(
  tenantId: string,
  queryId: string,
  provider: string
): Promise<string> {
  const sourceName = `realtime-query-${queryId}`;

  const existing = await prisma.jobSource.findFirst({
    where: {
      tenantId,
      type: provider,
      name: sourceName
    }
  });

  if (existing) return existing.id;

  const created = await prisma.jobSource.create({
    data: {
      tenantId,
      type: provider,
      name: sourceName,
      config: { queryId }
    }
  });

  return created.id;
}

async function upsertJob(
  tenantId: string,
  jobSourceId: string,
  job: NormalizedJob
): Promise<void> {
  const contentHash = hashContent(job.title, job.description);

  await prisma.job.upsert({
    where: {
      jobSourceId_externalId: {
        jobSourceId,
        externalId: job.externalId
      }
    },
    create: {
      tenantId,
      jobSourceId,
      externalId: job.externalId,
      title: job.title,
      description: job.description,
      location: job.location,
      url: job.url,
      postedAt: job.postedAt,
      contentHash
    },
    update: {
      title: job.title,
      description: job.description,
      location: job.location,
      url: job.url,
      postedAt: job.postedAt,
      contentHash,
      updatedAt: new Date()
    }
  });
}

export async function processSearchPollJob(
  job: Job<SearchPollJobData>
): Promise<SearchPollJobResult> {
  const { queryId, tenantId, provider } = job.data;
  const adapter = searchAdapters[provider];

  if (!adapter) {
    return {
      fetchedCount: 0,
      processedCount: 0,
      errors: [`Unknown search provider: ${provider}`],
      completedAt: new Date().toISOString()
    };
  }

  const searchQuery = await prisma.jobSearchQuery.findFirst({
    where: { id: queryId, tenantId, enabled: true }
  });

  if (!searchQuery) {
    return {
      fetchedCount: 0,
      processedCount: 0,
      errors: ["Search query not found or disabled"],
      completedAt: new Date().toISOString()
    };
  }

  const sourceApiKey =
    provider === "jsearch"
      ? process.env.JSEARCH_API_KEY
      : provider === "serpapi"
        ? process.env.SERPAPI_API_KEY
        : undefined;

  const fetchResult = await adapter.fetch({
    apiKey: sourceApiKey,
    query: searchQuery.query,
    location: searchQuery.location ?? undefined,
    keywords: searchQuery.keywords,
    limit: 50
  } as SourceConfig);

  if (fetchResult.errors?.length) {
    return {
      fetchedCount: fetchResult.jobs.length,
      processedCount: 0,
      errors: fetchResult.errors,
      completedAt: new Date().toISOString()
    };
  }

  const jobSourceId = await ensureJobSourceForQuery(tenantId, queryId, provider);

  let processedCount = 0;
  const errors: string[] = [];
  for (const fetchedJob of fetchResult.jobs) {
    try {
      await upsertJob(tenantId, jobSourceId, fetchedJob);
      processedCount++;
    } catch (error) {
      errors.push(
        `Failed to upsert job ${fetchedJob.externalId}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  await prisma.jobSearchQuery.update({
    where: { id: queryId },
    data: { lastRunAt: new Date() }
  });

  return {
    fetchedCount: fetchResult.jobs.length,
    processedCount,
    errors: errors.length > 0 ? errors : undefined,
    completedAt: new Date().toISOString()
  };
}
