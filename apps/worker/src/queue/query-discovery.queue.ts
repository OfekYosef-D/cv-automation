import { Job, Queue, RepeatableJob, Worker } from "bullmq";
import { createRedisConnection } from "./connection";

export const QUERY_DISCOVERY_QUEUE_NAME = "job-query-discovery";
export const QUERY_DISCOVERY_REPEAT_JOB_NAME = "job-query-discovery:repeat";
export const QUERY_DISCOVERY_INITIAL_JOB_NAME = "job-query-discovery:initial";

export interface QueryDiscoveryJobData {
  tenantId: string;
  queryId: string;
}

export interface QueryDiscoveryScheduleQuery {
  id: string;
  tenantId: string;
  enabled: boolean;
  cadenceSeconds: number | null;
}

export interface QueryDiscoveryJobResult {
  fetchedCount: number;
  savedCount: number;
  alertCount: number;
  errors?: string[];
  completedAt: string;
}

export function createQueryDiscoveryQueue(): Queue<QueryDiscoveryJobData, QueryDiscoveryJobResult> {
  return new Queue<QueryDiscoveryJobData, QueryDiscoveryJobResult>(QUERY_DISCOVERY_QUEUE_NAME, {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000
      },
      removeOnComplete: {
        age: 24 * 3600,
        count: 1000
      },
      removeOnFail: {
        age: 7 * 24 * 3600
      }
    }
  });
}

export function createQueryDiscoveryWorker(
  processor: (job: Job<QueryDiscoveryJobData>) => Promise<QueryDiscoveryJobResult>
): Worker<QueryDiscoveryJobData, QueryDiscoveryJobResult> {
  return new Worker<QueryDiscoveryJobData, QueryDiscoveryJobResult>(
    QUERY_DISCOVERY_QUEUE_NAME,
    processor,
    {
      connection: createRedisConnection(),
      concurrency: 5,
      limiter: {
        max: 60,
        duration: 60000
      }
    }
  );
}

export function normalizeQueryDiscoveryCadenceSeconds(value: number | null | undefined): number {
  return Math.max(60, value ?? 60);
}

export function buildQueryDiscoveryRepeatJobId(queryId: string): string {
  return `${QUERY_DISCOVERY_REPEAT_JOB_NAME}:${queryId}`;
}

export function buildQueryDiscoveryInitialJobId(queryId: string): string {
  return `${QUERY_DISCOVERY_INITIAL_JOB_NAME}:${queryId}:${Date.now()}`;
}

export async function reconcileQueryDiscoverySchedules(
  queue: Pick<
    Queue<QueryDiscoveryJobData, QueryDiscoveryJobResult>,
    "add" | "getRepeatableJobs" | "removeRepeatableByKey"
  >,
  queries: QueryDiscoveryScheduleQuery[]
): Promise<{ scheduledCount: number; removedCount: number; initialRunsQueued: number }> {
  const enabledQueries = queries.filter((query) => query.enabled);
  const enabledByRepeatJobId = new Map(
    enabledQueries.map((query) => [buildQueryDiscoveryRepeatJobId(query.id), query])
  );
  const repeatables = (await queue.getRepeatableJobs()) as Array<
    RepeatableJob & { jobId?: string | null; every?: string | number | null }
  >;
  let removedCount = 0;
  let scheduledCount = 0;

  for (const repeatable of repeatables) {
    const jobId = repeatable.jobId ?? null;
    const every = Number(repeatable.every ?? 0);
    const expectedEvery = normalizeQueryDiscoveryCadenceSeconds(
      jobId ? enabledByRepeatJobId.get(jobId)?.cadenceSeconds : null
    ) * 1000;
    const shouldKeep =
      repeatable.name === QUERY_DISCOVERY_REPEAT_JOB_NAME &&
      jobId !== null &&
      enabledByRepeatJobId.has(jobId) &&
      every === expectedEvery;

    if (shouldKeep) {
      continue;
    }

    await queue.removeRepeatableByKey(repeatable.key);
    removedCount++;
  }

  for (const query of enabledQueries) {
    const repeatJobId = buildQueryDiscoveryRepeatJobId(query.id);
    const every = normalizeQueryDiscoveryCadenceSeconds(query.cadenceSeconds) * 1000;

    await queue.add(
      QUERY_DISCOVERY_REPEAT_JOB_NAME,
      { tenantId: query.tenantId, queryId: query.id },
      {
        jobId: repeatJobId,
        repeat: {
          every
        }
      }
    );
    scheduledCount++;
  }

  let initialRunsQueued = 0;
  for (const query of enabledQueries) {
    await queue.add(
      QUERY_DISCOVERY_INITIAL_JOB_NAME,
      { tenantId: query.tenantId, queryId: query.id },
      {
        jobId: buildQueryDiscoveryInitialJobId(query.id)
      }
    );
    initialRunsQueued++;
  }

  return { scheduledCount, removedCount, initialRunsQueued };
}
