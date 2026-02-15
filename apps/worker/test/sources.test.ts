import { describe, it, expect, vi, afterEach } from "vitest";
import {
  isJuniorRole,
  isDeveloperRole,
  filterJuniorDeveloperJobs,
  type NormalizedJob
} from "../src/sources/types";
import { GreenhouseAdapter } from "../src/sources/greenhouse-adapter";
import { RemoteOKAdapter } from "../src/sources/remoteok-adapter";
import { RemotiveAdapter } from "../src/sources/remotive-adapter";
import { JSearchAdapter } from "../src/sources/jsearch-adapter";
import { SerpApiAdapter } from "../src/sources/serpapi-adapter";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Source Types", () => {
  describe("isJuniorRole", () => {
    it("returns true for junior titles", () => {
      expect(isJuniorRole("Junior Software Developer")).toBe(true);
      expect(isJuniorRole("Entry Level Engineer")).toBe(true);
      expect(isJuniorRole("Graduate Developer")).toBe(true);
      expect(isJuniorRole("Software Engineer Intern")).toBe(true);
    });

    it("returns false for senior titles", () => {
      expect(isJuniorRole("Senior Software Engineer")).toBe(false);
      expect(isJuniorRole("Lead Developer")).toBe(false);
      expect(isJuniorRole("Principal Engineer")).toBe(false);
      expect(isJuniorRole("Staff Engineer")).toBe(false);
    });

    it("returns false for titles without junior keyword even if dev role", () => {
      expect(isJuniorRole("Software Engineer")).toBe(false);
      expect(isJuniorRole("Frontend Developer")).toBe(false);
    });
  });

  describe("isDeveloperRole", () => {
    it("returns true for developer titles", () => {
      expect(isDeveloperRole("Software Engineer")).toBe(true);
      expect(isDeveloperRole("Frontend Developer")).toBe(true);
      expect(isDeveloperRole("Fullstack Engineer")).toBe(true);
      expect(isDeveloperRole("Backend Developer")).toBe(true);
    });

    it("returns false for non-developer titles", () => {
      expect(isDeveloperRole("Product Manager")).toBe(false);
      expect(isDeveloperRole("Data Analyst")).toBe(false);
      expect(isDeveloperRole("UX Designer")).toBe(false);
    });
  });

  describe("filterJuniorDeveloperJobs", () => {
    const jobs: NormalizedJob[] = [
      {
        externalId: "1",
        title: "Junior Software Engineer",
        description: "Entry level position",
        url: "https://example.com/1"
      },
      {
        externalId: "2",
        title: "Senior Software Engineer",
        description: "Senior position",
        url: "https://example.com/2"
      },
      {
        externalId: "3",
        title: "Software Engineer",
        description: "No seniority specified",
        url: "https://example.com/3"
      },
      {
        externalId: "4",
        title: "Product Manager",
        description: "Not a dev role",
        url: "https://example.com/4"
      }
    ];

    it("filters for junior developer jobs", () => {
      const result = filterJuniorDeveloperJobs(jobs, { includeUnspecified: false });
      expect(result).toHaveLength(1);
      expect(result[0].externalId).toBe("1");
    });

    it("includes unspecified seniority when enabled", () => {
      const result = filterJuniorDeveloperJobs(jobs, { includeUnspecified: true });
      expect(result).toHaveLength(2);
      expect(result.map((j) => j.externalId)).toContain("1");
      expect(result.map((j) => j.externalId)).toContain("3");
    });
  });
});

describe("Adapters", () => {
  describe("GreenhouseAdapter", () => {
    const adapter = new GreenhouseAdapter();

    it("has correct type and name", () => {
      expect(adapter.type).toBe("greenhouse");
      expect(adapter.name).toBe("Greenhouse Job Board");
    });

    it("validates config requires boardUrl", () => {
      expect(adapter.validateConfig({})).toBe("boardUrl is required for Greenhouse source");
      expect(adapter.validateConfig({ boardUrl: "https://boards.greenhouse.io/wix" })).toBe(true);
    });
  });

  describe("RemoteOKAdapter", () => {
    const adapter = new RemoteOKAdapter();

    it("has correct type and name", () => {
      expect(adapter.type).toBe("remoteok");
      expect(adapter.name).toBe("RemoteOK");
    });

    it("validates config always passes", () => {
      expect(adapter.validateConfig({})).toBe(true);
    });
  });

  describe("RemotiveAdapter", () => {
    const adapter = new RemotiveAdapter();

    it("has correct type and name", () => {
      expect(adapter.type).toBe("remotive");
      expect(adapter.name).toBe("Remotive");
    });

    it("validates config always passes", () => {
      expect(adapter.validateConfig({})).toBe(true);
    });
  });

  describe("JSearchAdapter", () => {
    const adapter = new JSearchAdapter();

    it("has correct type and name", () => {
      expect(adapter.type).toBe("jsearch");
      expect(adapter.name).toBe("JSearch");
    });

    it("requires apiKey and query", () => {
      expect(adapter.validateConfig({})).toBe("apiKey is required for JSearch source");
      expect(adapter.validateConfig({ apiKey: "key" })).toBe("query is required for JSearch source");
      expect(adapter.validateConfig({ apiKey: "key", query: "junior developer" })).toBe(true);
    });

    it("normalizes fetched jobs", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            data: [
              {
                job_id: "abc",
                job_title: "Junior Developer",
                job_description: "Build things",
                job_city: "Tel Aviv",
                job_country: "IL",
                job_apply_link: "https://example.com/job",
                employer_name: "Acme"
              }
            ]
          })
        })
      );

      const result = await adapter.fetch({ apiKey: "key", query: "junior developer" });

      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].externalId).toBe("js-abc");
      expect(result.jobs[0].title).toBe("Junior Developer");
    });
  });

  describe("SerpApiAdapter", () => {
    const adapter = new SerpApiAdapter();

    it("requires apiKey and query", () => {
      expect(adapter.validateConfig({})).toBe("apiKey is required for SerpAPI source");
      expect(adapter.validateConfig({ apiKey: "key" })).toBe("query is required for SerpAPI source");
      expect(adapter.validateConfig({ apiKey: "key", query: "junior developer" })).toBe(true);
    });

    it("normalizes fetched jobs", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            jobs_results: [
              {
                job_id: "xyz",
                title: "Junior Software Engineer",
                description: "Entry role",
                location: "Israel",
                apply_options: [{ link: "https://example.com/serp-job" }]
              }
            ]
          })
        })
      );

      const result = await adapter.fetch({ apiKey: "key", query: "junior engineer" });

      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].externalId).toBe("serp-xyz");
      expect(result.jobs[0].url).toBe("https://example.com/serp-job");
    });

    it("parses relative posted_at timestamps", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-02-15T12:00:00.000Z"));

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            jobs_results: [
              {
                job_id: "rel-1",
                title: "Junior Backend Developer",
                apply_options: [{ link: "https://example.com/relative" }],
                detected_extensions: { posted_at: "2 days ago" }
              }
            ]
          })
        })
      );

      const result = await adapter.fetch({ apiKey: "key", query: "junior backend" });

      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].postedAt?.toISOString()).toBe("2026-02-13T12:00:00.000Z");

      vi.useRealTimers();
    });

    it("falls back to undefined for unparseable posted_at", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            jobs_results: [
              {
                job_id: "bad-1",
                title: "Junior Frontend Engineer",
                apply_options: [{ link: "https://example.com/bad-date" }],
                detected_extensions: { posted_at: "sometime recently" }
              }
            ]
          })
        })
      );

      const result = await adapter.fetch({ apiKey: "key", query: "junior frontend" });

      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].postedAt).toBeUndefined();
    });
  });
});
