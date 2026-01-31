import { describe, expect, it } from "vitest";

import { prisma } from "@cv/db";
import { ingestGreenhouse } from "../src/ingestion/greenhouse";

describe("ingestGreenhouse", () => {
  it("creates a job and dedupes on re-ingest", async () => {
    const tenant = await prisma.tenant.create({
      data: { name: "Acme" }
    });

    const source = await prisma.jobSource.create({
      data: {
        tenantId: tenant.id,
        type: "greenhouse",
        name: "Greenhouse",
        config: { baseUrl: "https://boards.greenhouse.io" }
      }
    });

    const jobInput = {
      externalId: "job-1",
      title: "Fullstack Developer",
      description: "Build web apps",
      location: "Remote",
      url: "https://example.com/job-1"
    };

    await ingestGreenhouse({
      tenantId: tenant.id,
      jobSourceId: source.id,
      jobs: [jobInput]
    });

    await ingestGreenhouse({
      tenantId: tenant.id,
      jobSourceId: source.id,
      jobs: [jobInput]
    });

    const count = await prisma.job.count({
      where: {
        tenantId: tenant.id,
        jobSourceId: source.id
      }
    });

    expect(count).toBe(1);
  });
});
