import { describe, expect, it } from "vitest";

import {
  buildAlertDedupeKey,
  buildSearchVariants,
  canonicalizeJobUrl,
  isLinkedInOriginJob,
  passesDiscoveryFilters
} from "../src/job-discovery";

describe("job discovery helpers", () => {
  it("expands related software role queries when enabled", () => {
    expect(buildSearchVariants("software engineer", true)).toEqual([
      "software engineer",
      "software developer",
      "full stack engineer",
      "backend engineer",
      "frontend engineer"
    ]);
  });

  it("keeps literal queries when related titles are disabled", () => {
    expect(buildSearchVariants("student", false)).toEqual(["student"]);
  });

  it("canonicalizes urls and strips hashes", () => {
    expect(canonicalizeJobUrl("https://www.linkedin.com/jobs/view/123/#tracking")).toBe(
      "https://www.linkedin.com/jobs/view/123/"
    );
  });

  it("detects linkedin-origin jobs from apply links", () => {
    expect(
      isLinkedInOriginJob({
        url: "https://www.linkedin.com/jobs/view/123/"
      })
    ).toBe(true);
    expect(
      isLinkedInOriginJob({
        url: "https://company.example/jobs/123"
      })
    ).toBe(false);
  });

  it("applies include, exclude, seniority, and recency filters", () => {
    expect(
      passesDiscoveryFilters(
        {
          title: "Junior Software Developer",
          description: "React and TypeScript role",
          url: "https://www.linkedin.com/jobs/view/456/",
          postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        {
          sourceOrigin: "linkedin",
          includeKeywords: ["typescript"],
          excludeKeywords: ["manager"],
          seniority: "junior",
          postedWithinHours: 6
        }
      )
    ).toBe(true);

    expect(
      passesDiscoveryFilters(
        {
          title: "Engineering Manager",
          description: "People management",
          url: "https://www.linkedin.com/jobs/view/789/",
          postedAt: new Date()
        },
        {
          sourceOrigin: "linkedin",
          includeKeywords: ["engineering"],
          excludeKeywords: ["manager"]
        }
      )
    ).toBe(false);
  });

  it("builds a stable alert dedupe key", () => {
    expect(
      buildAlertDedupeKey({
        title: "Software Engineer",
        company: "Acme",
        location: "Remote",
        url: "https://company.example/jobs/123?utm_campaign=x"
      })
    ).toHaveLength(64);
  });
});
