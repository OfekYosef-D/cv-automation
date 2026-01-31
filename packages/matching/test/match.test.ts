import { describe, expect, it } from "vitest";

import { matchJob } from "../src/match";

describe("matchJob", () => {
  it("scores and explains matches", () => {
    const result = matchJob(
      {
        desiredRoles: ["fullstack", "backend"],
        seniority: "mid",
        location: "remote",
        mustHaveSkills: ["typescript", "node"]
      },
      {
        title: "Mid Fullstack Developer",
        description: "We use TypeScript and Node.js daily.",
        location: "Remote",
        postedAt: new Date()
      }
    );

    expect(result.score).toBeGreaterThan(0);
    expect(result.explanations.join(" ")).toContain("role");
    expect(result.explanations.join(" ")).toContain("seniority");
    expect(result.explanations.join(" ")).toContain("location");
    expect(result.explanations.join(" ")).toContain("skills");
  });
});
