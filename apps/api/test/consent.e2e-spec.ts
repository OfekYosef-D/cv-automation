import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { prisma } from "@cv/db";
import { AppModule } from "../src/app.module";

describe("Consent logging (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates consent log on approval", async () => {
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

    const job = await prisma.job.create({
      data: {
        tenantId: tenant.id,
        jobSourceId: source.id,
        externalId: "job-2",
        title: "Backend Developer",
        description: "APIs",
        url: "https://example.com/job-2",
        contentHash: "hash-2"
      }
    });

    await request(app.getHttpServer())
      .post("/approvals/approve")
      .set("x-tenant-id", tenant.id)
      .send({ jobId: job.id })
      .expect(201);

    const consent = await prisma.consentLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: "approve"
      }
    });

    expect(consent).not.toBeNull();
  });
});
