import { Queue, Worker, Job } from "bullmq";
import { createRedisConnection } from "./connection";

/**
 * Queue name for job ingestion tasks.
 */
export const INGESTION_QUEUE_NAME = "job-ingestion";

/**
 * Job data structure for ingestion queue.
 */
export interface IngestionJobData {
  /** JobSource ID from database */
  jobSourceId: string;
  /** Tenant ID for the job source */
  tenantId: string;
  /** Source type (greenhouse, remoteok, remotive, etc.) */
  sourceType: string;
  /** Source-specific configuration */
  config: Record<string, unknown>;
}

/**
 * Result returned after processing an ingestion job.
 */
export interface IngestionJobResult {
  /** Number of jobs fetched from source */
  fetchedCount: number;
  /** Number of jobs inserted/updated in database */
  processedCount: number;
  /** Any errors encountered */
  errors?: string[];
  /** Timestamp when processing completed */
  completedAt: string;
}

/**
 * Create the ingestion queue.
 */
export function createIngestionQueue(): Queue<IngestionJobData, IngestionJobResult> {
  return new Queue<IngestionJobData, IngestionJobResult>(INGESTION_QUEUE_NAME, {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000 // 5 seconds initial delay
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000 // Keep last 1000 completed jobs
      },
      removeOnFail: {
        age: 7 * 24 * 3600 // Keep failed jobs for 7 days
      }
    }
  });
}

/**
 * Create an ingestion worker with the given processor.
 */
export function createIngestionWorker(
  processor: (job: Job<IngestionJobData>) => Promise<IngestionJobResult>
): Worker<IngestionJobData, IngestionJobResult> {
  return new Worker<IngestionJobData, IngestionJobResult>(
    INGESTION_QUEUE_NAME,
    processor,
    {
      connection: createRedisConnection(),
      concurrency: 5, // Process up to 5 sources concurrently
      limiter: {
        max: 10, // Max 10 jobs per duration
        duration: 60000 // Per minute (respect rate limits)
      }
    }
  );
}
