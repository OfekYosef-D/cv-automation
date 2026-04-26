import { BadRequestException } from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";
import {
  buildAlertDedupeKey,
  executeDiscoverySearch,
  persistDiscoveryJobs
} from "@cv/shared";
import { JobAlertsService } from "../alerts/job-alerts.service";
import { JobSearchQueryService } from "./job-search-query.service";
import { JobSearchService } from "./job-search.service";

jest.mock("@cv/shared", () => ({
  buildAlertDedupeKey: jest.fn(() => "dedupe-key"),
  executeDiscoverySearch: jest.fn(),
  persistDiscoveryJobs: jest.fn()
}));

describe("JobSearchService", () => {
  const prisma = {
    userProfile: {
      findUnique: jest.fn()
    },
    jobSearchQuery: {
      update: jest.fn()
    }
  } as unknown as PrismaClient;

  const jobSearchQueryService = {
    findForTenant: jest.fn()
  } as unknown as JobSearchQueryService;

  const jobAlertsService = {
    getPreference: jest.fn(),
    createPendingAlert: jest.fn()
  } as unknown as JobAlertsService;

  const service = new JobSearchService(prisma, jobSearchQueryService, jobAlertsService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects LinkedIn-origin searches when provider is not serpapi", async () => {
    await expect(
      service.previewSearch("tenant-1", {
        provider: "jsearch",
        query: "software engineer",
        sourceOrigin: "linkedin"
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("maps persisted matched query ids for live search results", async () => {
    (executeDiscoverySearch as jest.Mock).mockResolvedValue([
      {
        externalId: "serp-1",
        title: "Junior Software Engineer",
        description: "TypeScript role",
        company: "Acme",
        salary: null,
        tags: ["typescript"],
        location: "Remote",
        url: "https://www.linkedin.com/jobs/view/1/",
        canonicalUrl: "https://www.linkedin.com/jobs/view/1/",
        postedAt: new Date("2026-03-23T10:00:00.000Z"),
        origin: "linkedin",
        sourceLabel: "SerpApi",
        contentHash: "hash-1",
        dedupeKey: "dedupe-key",
        matchScore: 82,
        matchExplanations: ["role match"]
      }
    ]);
    (persistDiscoveryJobs as jest.Mock).mockResolvedValue([
      {
        job: {
          id: "job-1",
          url: "https://www.linkedin.com/jobs/view/1/",
          metadata: {
            discovery: {
              matchedQueryIds: ["query-1"]
            }
          }
        },
        isNew: true
      }
    ]);

    const response = await service.liveSearch("tenant-1", {
      provider: "serpapi",
      query: "software engineer",
      sourceOrigin: "linkedin",
      useProfile: false
    });

    expect(response.jobs).toEqual([
      expect.objectContaining({
        id: "job-1",
        origin: "linkedin",
        sourceLabel: "SerpApi",
        matchedQueryIds: ["query-1"]
      })
    ]);
  });

  it("runs saved queries, creates alerts, and updates run stats", async () => {
    (jobSearchQueryService.findForTenant as jest.Mock).mockResolvedValue({
      id: "query-1",
      provider: "serpapi",
      query: "software engineer",
      sourceOrigin: "linkedin",
      location: "Israel",
      seniority: "junior",
      includeKeywords: ["typescript"],
      excludeKeywords: [],
      relatedTitles: true,
      postedWithinHours: 24,
      maxResultsPerRun: 25,
      minMatchScore: 60
    });
    (executeDiscoverySearch as jest.Mock).mockResolvedValue([
      {
        externalId: "serp-1",
        title: "Junior Software Engineer",
        description: "TypeScript role",
        company: "Acme",
        salary: null,
        tags: ["typescript"],
        location: "Remote",
        url: "https://www.linkedin.com/jobs/view/1/",
        canonicalUrl: "https://www.linkedin.com/jobs/view/1/",
        postedAt: new Date("2026-03-23T10:00:00.000Z"),
        origin: "linkedin",
        sourceLabel: "SerpApi",
        contentHash: "hash-1",
        dedupeKey: "dedupe-key",
        matchScore: 82,
        matchExplanations: ["role match"]
      }
    ]);
    (persistDiscoveryJobs as jest.Mock).mockResolvedValue([
      {
        job: {
          id: "job-1",
          url: "https://www.linkedin.com/jobs/view/1/",
          metadata: {
            discovery: {
              matchedQueryIds: ["query-1"]
            }
          }
        },
        isNew: true
      }
    ]);
    (jobAlertsService.getPreference as jest.Mock).mockResolvedValue({
      emailEnabled: true,
      emailAddress: "owner@example.com",
      immediateAlerts: true,
      minMatchScore: 70,
      cooldownSeconds: 0
    });
    (jobAlertsService.createPendingAlert as jest.Mock).mockResolvedValue({
      created: true,
      id: "alert-1"
    });
    (prisma.jobSearchQuery.update as jest.Mock).mockResolvedValue({ id: "query-1" });

    const response = await service.runSavedQuery("tenant-1", "query-1");

    expect(response).toMatchObject({
      fetchedCount: 1,
      savedCount: 1,
      alertCount: 1
    });
    expect(jobAlertsService.createPendingAlert).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      jobId: "job-1",
      jobSearchQueryId: "query-1",
      dedupeKey: "dedupe-key",
      metadata: {
        origin: "linkedin",
        sourceLabel: "SerpApi",
        matchScore: 82,
        matchExplanations: ["role match"]
      }
    });
    expect(buildAlertDedupeKey).toHaveBeenCalled();
    expect(prisma.jobSearchQuery.update).toHaveBeenCalledWith({
      where: { id: "query-1" },
      data: expect.objectContaining({
        lastNewJobsCount: 1,
        lastAlertedCount: 1,
        lastError: null
      })
    });
  });
});
