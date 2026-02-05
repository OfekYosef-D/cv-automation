import { describe, it, expect } from "vitest";
import {
  isJuniorRole,
  isDeveloperRole,
  filterJuniorDeveloperJobs,
  type NormalizedJob
} from "../src/sources/types";
import { GreenhouseAdapter } from "../src/sources/greenhouse-adapter";
import { RemoteOKAdapter } from "../src/sources/remoteok-adapter";
import { RemotiveAdapter } from "../src/sources/remotive-adapter";

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
});
