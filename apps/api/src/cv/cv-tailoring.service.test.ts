import { CvTailoringService } from "./cv-tailoring.service";

describe("CvTailoringService", () => {
  const service = new CvTailoringService();

  it("builds a tailored CV using the most relevant claims from the base CV", () => {
    const result = service.tailor(
      [
        "Jane Doe",
        "Full Stack Engineer",
        "",
        "- Built multi-tenant hiring workflows",
        "- Implemented React and NestJS features",
        "- Created AI-assisted CV tailoring flows"
      ].join("\n"),
      {
        title: "Platform Engineer",
        company: "OpenAI",
        location: "Remote",
        salary: "$120,000 - $150,000",
        tags: ["react", "nestjs", "ai"],
        description:
          "Build hiring workflows with React, NestJS, and AI-assisted document generation."
      }
    );

    expect(result.summary).toContain("Platform Engineer");
    expect(result.summary).toContain("OpenAI");
    expect(result.content).toContain("Created AI-assisted CV tailoring flows");
    expect(result.content).toContain("Relevant keywords: react, nestjs, ai");
    expect(result.claimsUsed.length).toBeGreaterThan(0);
  });
});
