import { describe, expect, it, vi } from "vitest";
import { scheduleSearchQueries } from "../src/queue/search-queue";

describe("scheduleSearchQueries", () => {
  it("schedules queries every cadenceSeconds", async () => {
    const add = vi.fn().mockResolvedValue(undefined);

    await scheduleSearchQueries(
      {
        add
      },
      [
        {
          id: "q-1",
          tenantId: "tenant-1",
          provider: "jsearch",
          cadenceSeconds: 120,
          enabled: true
        },
        {
          id: "q-2",
          tenantId: "tenant-1",
          provider: "serpapi",
          cadenceSeconds: 60,
          enabled: true
        }
      ]
    );

    expect(add).toHaveBeenCalledWith(
      "poll-q-1",
      { queryId: "q-1", tenantId: "tenant-1", provider: "jsearch" },
      {
        repeat: { every: 120000 },
        jobId: "search-repeat-q-1"
      }
    );

    expect(add).toHaveBeenCalledWith(
      "poll-q-2",
      { queryId: "q-2", tenantId: "tenant-1", provider: "serpapi" },
      {
        repeat: { every: 60000 },
        jobId: "search-repeat-q-2"
      }
    );
  });
});
