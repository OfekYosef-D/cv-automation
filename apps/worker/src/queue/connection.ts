import { Redis } from "ioredis";

/**
 * Get Redis connection URL from environment.
 */
function getRedisUrl(): string {
  return process.env.REDIS_URL || "redis://localhost:6379";
}

/**
 * Create a new Redis connection for BullMQ.
 * Each worker/queue should have its own connection.
 */
export function createRedisConnection(): Redis {
  const redisUrl = getRedisUrl();
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false
  });
}

/**
 * Shared connection options for BullMQ queues and workers.
 */
export function getConnectionOptions() {
  return {
    connection: createRedisConnection()
  };
}
