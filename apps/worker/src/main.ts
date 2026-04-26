import type { Worker } from "bullmq";
import { prisma } from "@cv/db";
import {
  createIngestionQueue,
  createIngestionWorker,
  processIngestionJob,
  type IngestionJobData,
  createQueryDiscoveryQueue,
  createQueryDiscoveryWorker,
  processQueryDiscoveryJob,
  reconcileQueryDiscoverySchedules,
} from "./queue";

let ingestionWorker: Worker | undefined;
let queryDiscoveryWorker: Worker | undefined;

/**
 * Graceful shutdown handling.
 */
let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[Worker] Received ${signal}, shutting down gracefully...`);

  try {
    if (ingestionWorker) {
      await ingestionWorker.close();
      console.log("[Worker] Ingestion worker closed");
    }

    if (queryDiscoveryWorker) {
      await queryDiscoveryWorker.close();
      console.log("[Worker] Query discovery worker closed");
    }
  } catch (err) {
    console.error("[Worker] Error closing worker:", err);
  }

  await prisma.$disconnect();
  console.log("[Worker] Database connection closed");

  process.exit(0);
}

/**
 * Schedule repeatable jobs for all active job sources.
 */
async function scheduleRepeatableJobs(): Promise<void> {
  const queue = createIngestionQueue();

  // Get all active job sources from database
  const jobSources = await prisma.jobSource.findMany({
    where: {
      // Only include sources with actual configs (not manual/demo sources)
      NOT: {
        type: "manual"
      }
    }
  });

  console.log(`[Worker] Found ${jobSources.length} job sources to schedule`);

  for (const source of jobSources) {
    const jobData: IngestionJobData = {
      jobSourceId: source.id,
      tenantId: source.tenantId,
      sourceType: source.type,
      config: source.config as Record<string, unknown>
    };

    // Add repeatable job (runs every 2 hours)
    await queue.add(`source-${source.id}`, jobData, {
      repeat: {
        every: 2 * 60 * 60 * 1000 // 2 hours in milliseconds
      },
      jobId: `repeat-${source.id}` // Ensure only one repeatable per source
    });

    console.log(
      `[Worker] Scheduled repeatable job for source: ${source.name} (${source.type})`
    );
  }

  // Also trigger an immediate sync for all sources
  for (const source of jobSources) {
    const jobData: IngestionJobData = {
      jobSourceId: source.id,
      tenantId: source.tenantId,
      sourceType: source.type,
      config: source.config as Record<string, unknown>
    };

    // Add immediate one-time job
    await queue.add(`initial-sync-${source.id}`, jobData, {
      jobId: `initial-${source.id}-${Date.now()}`
    });

    console.log(
      `[Worker] Queued immediate sync for source: ${source.name}`
    );
  }

  await queue.close();
}

async function scheduleQueryDiscoveryJobs(): Promise<void> {
  const queue = createQueryDiscoveryQueue();
  const enabledQueries = await prisma.jobSearchQuery.findMany({
    where: { enabled: true },
    orderBy: { updatedAt: "asc" }
  });

  console.log(
    `[Worker] Found ${enabledQueries.length} saved search queries to schedule`
  );

  await reconcileQueryDiscoverySchedules(
    queue,
    enabledQueries.map((query) => ({
      id: query.id,
      tenantId: query.tenantId,
      enabled: query.enabled,
      cadenceSeconds: query.cadenceSeconds
    }))
  );

  await queue.close();
}

/**
 * Start the worker.
 */
async function main(): Promise<void> {
  console.log("[Worker] Starting CV Automation Job Ingestion Worker...");

  // Register shutdown handlers
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Schedule repeatable jobs for all sources
  await scheduleRepeatableJobs();
  await scheduleQueryDiscoveryJobs();

  // Create and start the worker
  ingestionWorker = createIngestionWorker(processIngestionJob);
  queryDiscoveryWorker = createQueryDiscoveryWorker(processQueryDiscoveryJob);

  ingestionWorker.on("completed", (job, result) => {
    console.log(
      `[Worker] Job ${job.id} completed: ${result.processedCount} jobs processed`
    );
  });

  ingestionWorker.on("failed", (job, error) => {
    console.error(`[Worker] Job ${job?.id} failed:`, error.message);
  });

  ingestionWorker.on("error", (error) => {
    console.error("[Worker] Worker error:", error);
  });

  queryDiscoveryWorker.on("completed", (job, result) => {
    console.log(
      `[Worker] Discovery job ${job.id} completed: ${result.savedCount} jobs saved, ${result.alertCount} alerts`
    );
  });

  queryDiscoveryWorker.on("failed", (job, error) => {
    console.error(`[Worker] Discovery job ${job?.id} failed:`, error.message);
  });

  queryDiscoveryWorker.on("error", (error) => {
    console.error("[Worker] Discovery worker error:", error);
  });

  console.log("[Worker] Worker started and listening for jobs...");
  console.log("[Worker] Press Ctrl+C to stop");
}

main().catch((error) => {
  console.error("[Worker] Fatal error:", error);
  process.exit(1);
});
