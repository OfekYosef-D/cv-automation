import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { prisma } from "@cv/db";
import { AppModule } from "../src/app.module";

describe("Artefacts (e2e)", () => {
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

  it("creates an artefact", async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: "Acme"
      }
    });

    const cv = await prisma.cv.create({
      data: {
        tenantId: tenant.id,
        title: "Default CV"
      }
    });

    const cvVersion = await prisma.cvVersion.create({
      data: {
        tenantId: tenant.id,
        cvId: cv.id,
        content: "CV content"
      }
    });

    const jobSource = await prisma.jobSource.create({
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
        jobSourceId: jobSource.id,
        externalId: "job-1",
        title: "Fullstack Dev",
        description: "Build web apps",
        location: "Remote",
        url: "https://example.com/job-1",
        contentHash: "hash-1"
      }
    });

    const response = await request(app.getHttpServer())
      .post("/artefacts")
      .set("x-tenant-id", tenant.id)
      .send({
        jobId: job.id,
        cvVersionId: cvVersion.id,
        promptVersion: "v1",
        model: "gpt-5.2",
        claimsUsed: [{ claim: "Built APIs" }],
        status: "DRAFT",
        content: "Tailored summary"
      })
      .expect(201);

    expect(response.body.jobId).toBe(job.id);
    expect(response.body.cvVersionId).toBe(cvVersion.id);
    expect(response.body.status).toBe("DRAFT");
  });
});
