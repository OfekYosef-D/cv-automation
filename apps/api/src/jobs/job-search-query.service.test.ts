import { prisma } from "@cv/db";
import { JobSearchQueryService } from "./job-search-query.service";

jest.mock("@cv/db", () => ({
  prisma: {
    jobSearchQuery: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn()
    }
  }
}));

describe("JobSearchQueryService", () => {
  const service = new JobSearchQueryService();
  const jobSearchQuery = (
    prisma as unknown as {
      jobSearchQuery: {
        create: jest.Mock;
        findMany: jest.Mock;
        updateMany: jest.Mock;
        deleteMany: jest.Mock;
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
      location: null,
      seniority: null,
      keywords: [],
      cadenceSeconds: 120,
      enabled: true,
      lastRunAt: null,
      createdAt: new Date("2026-02-15T00:00:00.000Z"),
      updatedAt: new Date("2026-02-15T00:00:00.000Z")
    });

    await service.createForTenant("tenant-1", {
      provider: "jsearch",
      query: "junior software engineer"
    });

    expect(jobSearchQuery.create).toHaveBeenCalledWith({
      data: {
        tenantId: "tenant-1",
        provider: "jsearch",
        query: "junior software engineer",
        location: null,
        seniority: null,
        keywords: [],
        cadenceSeconds: 120,
        enabled: true
      }
    });
  });

  it("updates only explicitly provided fields", async () => {
    jobSearchQuery.updateMany.mockResolvedValue({ count: 1 });

    const updated = await service.updateForTenant("tenant-1", "q-1", {
      enabled: false,
      cadenceSeconds: 180
    });

    expect(updated).toBe(true);
    expect(jobSearchQuery.updateMany).toHaveBeenCalledWith({
      where: { id: "q-1", tenantId: "tenant-1" },
      data: {
        cadenceSeconds: 180,
        enabled: false
      }
    });
  });
});
