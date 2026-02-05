import crypto from "node:crypto";
import { Job } from "bullmq";
import { prisma } from "@cv/db";
import type { IngestionJobData, IngestionJobResult } from "./ingestion.queue";
import {
  type JobSourceAdapter,
  type SourceConfig,
  type NormalizedJob,
  filterJuniorDeveloperJobs,
  GreenhouseAdapter,
  RemoteOKAdapter,
  RemotiveAdapter
} from "../sources";

/**
 * Registry of available source adapters.
 */
const adapters: Record<string, JobSourceAdapter> = {
  greenhouse: new GreenhouseAdapter(),
  remoteok: new RemoteOKAdapter(),
  remotive: new RemotiveAdapter()
};

/**
 * Get adapter for a source type.
 */
function getAdapter(sourceType: string): JobSourceAdapter | undefined {
  return adapters[sourceType];
}

/**
 * Generate a content hash for deduplication.
 */
function hashContent(title: string, description: string): string {
  return crypto
    .createHash("sha256")
    .update(`${title}::${description}`)
    .digest("hex");
}

/**
 * Upsert a job into the database.
 */
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

/**
 * Process an ingestion job.
 * This is the main processor function for the BullMQ worker.
 */
export async function processIngestionJob(
  job: Job<IngestionJobData>
): Promise<IngestionJobResult> {
  const { jobSourceId, tenantId, sourceType, config } = job.data;
  const errors: string[] = [];

  console.log(
    `[Ingestion] Processing source ${jobSourceId} (type: ${sourceType})`
  );

  // Get the appropriate adapter
  const adapter = getAdapter(sourceType);
  if (!adapter) {
    return {
      fetchedCount: 0,
      processedCount: 0,
      errors: [`Unknown source type: ${sourceType}`],
      completedAt: new Date().toISOString()
    };
  }

  // Validate config
  const validation = adapter.validateConfig(config as SourceConfig);
  if (validation !== true) {
    return {
      fetchedCount: 0,
      processedCount: 0,
      errors: [validation],
      completedAt: new Date().toISOString()
    };
  }

  // Fetch jobs from source
  const fetchResult = await adapter.fetch(config as SourceConfig);

  if (fetchResult.errors?.length) {
    errors.push(...fetchResult.errors);
  }

  console.log(
    `[Ingestion] Fetched ${fetchResult.jobs.length} jobs from ${sourceType}`
  );

  // Filter for junior developer jobs if keywords/roles are specified
  const sourceConfig = config as SourceConfig;
  let jobsToProcess = fetchResult.jobs;

  if (sourceConfig.keywords?.length || sourceConfig.roles?.length) {
    jobsToProcess = filterJuniorDeveloperJobs(fetchResult.jobs, {
      keywords: sourceConfig.keywords,
      roles: sourceConfig.roles,
      // Include jobs without explicit seniority level
      includeUnspecified: true
    });
    console.log(
      `[Ingestion] Filtered to ${jobsToProcess.length} junior developer jobs`
    );
  }

  // Upsert jobs to database
  let processedCount = 0;
  for (const normalizedJob of jobsToProcess) {
    try {
      await upsertJob(tenantId, jobSourceId, normalizedJob);
      processedCount++;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      errors.push(`Failed to upsert job ${normalizedJob.externalId}: ${errorMessage}`);
    }
  }

  // Update job source sync timestamp
  try {
    await prisma.jobSource.update({
      where: { id: jobSourceId },
      data: { updatedAt: new Date() }
    });
  } catch (error) {
    // Log but don't fail the job for this
    console.warn(
      `[Ingestion] Failed to update source timestamp: ${error}`
    );
  }

  console.log(
    `[Ingestion] Completed: ${processedCount}/${jobsToProcess.length} jobs processed`
  );

  return {
    fetchedCount: fetchResult.jobs.length,
    processedCount,
    errors: errors.length > 0 ? errors : undefined,
    completedAt: new Date().toISOString()
  };
}
