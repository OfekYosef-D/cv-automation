import type { Request } from "express";
import { JobSearchController } from "./job-search.controller";

describe("JobSearchController", () => {
  const queryService = {
    listForTenant: jest.fn(),
    createForTenant: jest.fn(),
    updateForTenant: jest.fn(),
    deleteForTenant: jest.fn()
  };

  const searchService = {
    liveSearch: jest.fn()
  };

  const controller = new JobSearchController(queryService as never, searchService as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses tenant context for search query CRUD", async () => {
    const request = { tenantId: "tenant-from-middleware" } as unknown as Request;

    await controller.listQueries(request);
    await controller.createQuery(request, {
      provider: "jsearch",
      query: "junior developer"
    });

    expect(queryService.listForTenant).toHaveBeenCalledWith("tenant-from-middleware");
    expect(queryService.createForTenant).toHaveBeenCalledWith(
      "tenant-from-middleware",
      expect.objectContaining({ provider: "jsearch", query: "junior developer" })
    );
  });

  it("live search returns jobs and uses tenant context", async () => {
    searchService.liveSearch.mockResolvedValue({
      jobs: [
        {
          externalId: "js-1",
          title: "Junior Engineer",
          description: "role",
          location: "Tel Aviv",
          url: "https://example.com/job",
          postedAt: null,
          contentHash: "abc"
        }
      ]
    });

    const request = { tenantId: "tenant-live" } as unknown as Request;

    const response = await controller.liveSearch(request, {
      provider: "jsearch",
      query: "junior engineer",
      location: "Israel"
    });

    expect(searchService.liveSearch).toHaveBeenCalledWith("tenant-live", {
      provider: "jsearch",
      query: "junior engineer",
      location: "Israel"
    });
    expect(response.jobs).toHaveLength(1);
  });
});
