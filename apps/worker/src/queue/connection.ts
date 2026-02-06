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
 * Create connection options with a new Redis connection for BullMQ.
 * Each call creates a new connection.
 */
export function getConnectionOptions(): { connection: Redis } {
  return {
    connection: createRedisConnection()
  };
}
