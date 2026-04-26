import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import type { JobSearchQuery } from "@prisma/client";
import { Queue } from "bullmq";
import Redis from "ioredis";

const QUERY_DISCOVERY_QUEUE_NAME = "job-query-discovery";
const QUERY_DISCOVERY_REPEAT_JOB_NAME = "job-query-discovery:repeat";
const QUERY_DISCOVERY_INITIAL_JOB_NAME = "job-query-discovery:initial";
const MIN_QUERY_CADENCE_SECONDS = 60;

interface QueryDiscoveryJobData {
  tenantId: string;
  queryId: string;
}

@Injectable()
export class JobSearchSchedulerService implements OnModuleDestroy {
  private readonly logger = new Logger(JobSearchSchedulerService.name);
  private readonly connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });
  private readonly queue = new Queue<QueryDiscoveryJobData>(QUERY_DISCOVERY_QUEUE_NAME, {
    connection: this.connection
  });

  async syncQuery(
    query: Pick<JobSearchQuery, "id" | "tenantId" | "enabled" | "cadenceSeconds">,
    options?: { enqueueImmediate?: boolean }
  ): Promise<void> {
    await this.removeRepeatable(query.id);

    if (!query.enabled) {
      return;
    }

    await this.queue.add(
      QUERY_DISCOVERY_REPEAT_JOB_NAME,
      {
        tenantId: query.tenantId,
        queryId: query.id
      },
      {
        jobId: this.getRepeatJobId(query.id),
        repeat: {
          every: Math.max(query.cadenceSeconds, MIN_QUERY_CADENCE_SECONDS) * 1000
        }
      }
    );

    if (options?.enqueueImmediate) {
      await this.enqueueNow(query.tenantId, query.id);
    }
  }

  async removeQuery(tenantId: string, queryId: string): Promise<void> {
    void tenantId;
    await this.removeRepeatable(queryId);
  }

  async enqueueNow(tenantId: string, queryId: string): Promise<void> {
    await this.queue.add(
      QUERY_DISCOVERY_INITIAL_JOB_NAME,
      {
        tenantId,
        queryId
      },
      {
        jobId: `${QUERY_DISCOVERY_INITIAL_JOB_NAME}:${queryId}:${Date.now()}`
      }
    );
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.queue.close();
    } catch (error) {
      this.logger.warn(
        `Failed closing query-discovery queue: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
    }

    try {
      await this.connection.quit();
    } catch {
      await this.connection.disconnect();
    }
  }

  private getRepeatJobId(queryId: string): string {
    return `${QUERY_DISCOVERY_REPEAT_JOB_NAME}:${queryId}`;
  }

  private async removeRepeatable(queryId: string): Promise<void> {
    const repeatJobId = this.getRepeatJobId(queryId);
    const repeatables = (await this.queue.getRepeatableJobs()) as Array<{
      key: string;
      name: string;
      jobId?: string | null;
    }>;

    for (const repeatable of repeatables) {
      if (
        repeatable.name === QUERY_DISCOVERY_REPEAT_JOB_NAME &&
        repeatable.jobId === repeatJobId
      ) {
        await this.queue.removeRepeatableByKey(repeatable.key);
      }
    }
  }
}
