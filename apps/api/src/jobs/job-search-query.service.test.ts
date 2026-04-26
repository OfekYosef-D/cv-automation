import { prisma } from "@cv/db";
import { JobSearchQueryService } from "./job-search-query.service";

jest.mock("@cv/db", () => ({
  prisma: {
    jobSearchQuery: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  }
}));

describe("JobSearchQueryService", () => {
  const schedulerService = {
    syncQuery: jest.fn(),
    removeQuery: jest.fn()
  };
  const service = new JobSearchQueryService(schedulerService as never);
  const jobSearchQuery = (
    prisma as unknown as {
      jobSearchQuery: {
        create: jest.Mock;
        findMany: jest.Mock;
        findFirst: jest.Mock;
        update: jest.Mock;
        delete: jest.Mock;
      };
    }
  ).jobSearchQuery;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates search query with defaults", async () => {
    jobSearchQuery.create.mockResolvedValue({
      id: "q1",
      tenantId: "tenant-1",
      provider: "jsearch",
      query: "junior software engineer",
      sourceOrigin: "all",
      location: null,
      seniority: null,
      includeKeywords: [],
      excludeKeywords: [],
      relatedTitles: true,
      postedWithinHours: null,
      maxResultsPerRun: 25,
      minMatchScore: null,
      cadenceSeconds: 60,
      enabled: true,
      lastRunAt: null,
      lastCompletedAt: null,
      lastNewJobsCount: 0,
      lastAlertedCount: 0,
      lastError: null,
      createdAt: new Date("2026-02-15T00:00:00.000Z"),
      updatedAt: new Date("2026-02-15T00:00:00.000Z")
    });
    schedulerService.syncQuery.mockResolvedValue(undefined);

    await service.createForTenant("tenant-1", {
      provider: "jsearch",
      query: "junior software engineer"
    });

    expect(jobSearchQuery.create).toHaveBeenCalledWith({
      data: {
        tenantId: "tenant-1",
        provider: "jsearch",
        query: "junior software engineer",
        sourceOrigin: "all",
        location: null,
        seniority: null,
        includeKeywords: [],
        excludeKeywords: [],
        relatedTitles: true,
        postedWithinHours: null,
        maxResultsPerRun: 25,
        minMatchScore: null,
        cadenceSeconds: 60,
        enabled: true
      }
    });
    expect(schedulerService.syncQuery).toHaveBeenCalledWith(
      expect.objectContaining({ id: "q1", tenantId: "tenant-1", cadenceSeconds: 60, enabled: true }),
      { enqueueImmediate: true }
    );
  });

  it("updates only explicitly provided fields", async () => {
    jobSearchQuery.findFirst.mockResolvedValue({
      id: "q-1",
      tenantId: "tenant-1",
      provider: "jsearch",
      query: "software engineer",
      sourceOrigin: "all",
      location: "Israel",
      seniority: "junior",
      includeKeywords: [],
      excludeKeywords: [],
      relatedTitles: true,
      postedWithinHours: null,
      maxResultsPerRun: 25,
      minMatchScore: null,
      cadenceSeconds: 60,
      enabled: true
    });
    jobSearchQuery.update.mockResolvedValue({
      id: "q-1",
      tenantId: "tenant-1",
      provider: "jsearch",
      query: "software engineer",
      sourceOrigin: "linkedin",
      location: "Israel",
      seniority: "junior",
      includeKeywords: ["student"],
      excludeKeywords: [],
      relatedTitles: false,
      postedWithinHours: null,
      maxResultsPerRun: 25,
      minMatchScore: null,
      cadenceSeconds: 180,
      enabled: false
    });
    schedulerService.syncQuery.mockResolvedValue(undefined);

    const updated = await service.updateForTenant("tenant-1", "q-1", {
      enabled: false,
      cadenceSeconds: 180,
      sourceOrigin: "linkedin",
      includeKeywords: ["student"],
      relatedTitles: false
    });

    expect(updated).toBe(true);
    expect(jobSearchQuery.update).toHaveBeenCalledWith({
      where: { id: "q-1" },
      data: {
        sourceOrigin: "linkedin",
        includeKeywords: ["student"],
        relatedTitles: false,
        cadenceSeconds: 180,
        enabled: false
      }
    });
    expect(schedulerService.syncQuery).toHaveBeenCalledWith(
      expect.objectContaining({ id: "q-1", cadenceSeconds: 180, enabled: false }),
      { enqueueImmediate: false }
    );
  });
});
