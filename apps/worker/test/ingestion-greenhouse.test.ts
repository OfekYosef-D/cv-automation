import net from "node:net";
import { describe, expect, it } from "vitest";

import { prisma } from "@cv/db";
import { ingestGreenhouse } from "../src/ingestion/greenhouse";

async function isDatabaseReachable(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return false;
  }

  try {
    const parsedUrl = new URL(databaseUrl);
    const hostname = parsedUrl.hostname || "127.0.0.1";
    const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : 5432;

    return await new Promise<boolean>((resolve) => {
      const socket = net.createConnection({ host: hostname, port });
      const finalize = (result: boolean) => {
        socket.removeAllListeners();
        socket.destroy();
        resolve(result);
      };

      socket.setTimeout(750);
      socket.once("connect", () => finalize(true));
      socket.once("timeout", () => finalize(false));
      socket.once("error", () => finalize(false));
    });
  } catch {
    return false;
  }
}

describe("ingestGreenhouse", () => {
  it("creates a job and dedupes on re-ingest", async ({ skip }) => {
    if (!(await isDatabaseReachable())) {
      skip();
    }

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
