import { describe, expect, it, vi } from "vitest";

import {
  QUERY_DISCOVERY_INITIAL_JOB_NAME,
  QUERY_DISCOVERY_REPEAT_JOB_NAME,
  buildQueryDiscoveryRepeatJobId,
  normalizeQueryDiscoveryCadenceSeconds,
  reconcileQueryDiscoverySchedules
} from "../src/queue/query-discovery.queue";

describe("query-discovery scheduling", () => {
  it("normalizes cadence to a minimum of 60 seconds", () => {
    expect(normalizeQueryDiscoveryCadenceSeconds(undefined)).toBe(60);
    expect(normalizeQueryDiscoveryCadenceSeconds(15)).toBe(60);
    expect(normalizeQueryDiscoveryCadenceSeconds(120)).toBe(120);
  });

  it("removes stale repeatables and queues current schedules", async () => {
    const queue = {
      getRepeatableJobs: vi.fn().mockResolvedValue([
        {
          key: "stale-repeatable",
          name: QUERY_DISCOVERY_REPEAT_JOB_NAME,
          jobId: buildQueryDiscoveryRepeatJobId("query-stale"),
          every: 120000
        },
        {
          key: "keep-repeatable",
          name: QUERY_DISCOVERY_REPEAT_JOB_NAME,
          jobId: buildQueryDiscoveryRepeatJobId("query-1"),
          every: 60000
        }
      ]),
      removeRepeatableByKey: vi.fn().mockResolvedValue(undefined),
      add: vi.fn().mockResolvedValue(undefined)
    };

    await expect(
      reconcileQueryDiscoverySchedules(queue as never, [
        {
          id: "query-1",
          tenantId: "tenant-1",
          enabled: true,
          cadenceSeconds: 30
        },
        {
          id: "query-disabled",
          tenantId: "tenant-1",
          enabled: false,
          cadenceSeconds: 60
        }
      ])
    ).resolves.toMatchObject({
      scheduledCount: 1,
      removedCount: 1,
      initialRunsQueued: 1
    });

    expect(queue.removeRepeatableByKey).toHaveBeenCalledWith("stale-repeatable");
    expect(queue.add).toHaveBeenCalledWith(
      QUERY_DISCOVERY_REPEAT_JOB_NAME,
      { tenantId: "tenant-1", queryId: "query-1" },
      expect.objectContaining({
        jobId: buildQueryDiscoveryRepeatJobId("query-1"),
        repeat: { every: 60000 }
      })
    );
    expect(queue.add).toHaveBeenCalledWith(
      QUERY_DISCOVERY_INITIAL_JOB_NAME,
      { tenantId: "tenant-1", queryId: "query-1" },
      expect.objectContaining({
        jobId: expect.stringContaining("job-query-discovery:initial:query-1:")
      })
    );
  });
});
