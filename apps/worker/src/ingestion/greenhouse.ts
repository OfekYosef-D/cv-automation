import crypto from "node:crypto";

import { prisma } from "@cv/db";

interface GreenhouseJobInput {
  externalId: string;
  title: string;
  description: string;
  location?: string;
  url: string;
  postedAt?: Date;
}

interface IngestGreenhouseParams {
  tenantId: string;
  jobSourceId: string;
  jobs: GreenhouseJobInput[];
}

function hashContent(title: string, description: string) {
  return crypto
    .createHash("sha256")
    .update(`${title}::${description}`)
    .digest("hex");
}

export async function ingestGreenhouse(params: IngestGreenhouseParams) {
  for (const job of params.jobs) {
    const contentHash = hashContent(job.title, job.description);

    await prisma.job.upsert({
      where: {
        jobSourceId_externalId: {
          jobSourceId: params.jobSourceId,
          externalId: job.externalId
        }
      },
      create: {
        tenantId: params.tenantId,
        jobSourceId: params.jobSourceId,
        externalId: job.externalId,
        title: job.title,
        description: job.description,
        location: job.location,
        url: job.url,
        postedAt: job.postedAt,
        contentHash
      },
      update: {
        title: job.title,
        description: job.description,
        location: job.location,
        url: job.url,
        postedAt: job.postedAt,
        contentHash
      }
    });
  }
}
