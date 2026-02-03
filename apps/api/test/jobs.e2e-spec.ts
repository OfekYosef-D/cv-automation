import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { prisma } from "@cv/db";

import { AppModule } from "../src/app.module";
import { JobsController } from "../src/jobs/jobs.controller";
import { JobsService } from "../src/jobs/jobs.service";

describe("Jobs (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [JobsController],
      providers: [JobsService]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("lists jobs with latest artefact and approval status", async () => {
    const tenant = await prisma.tenant.create({ data: { name: "Acme" } });
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
        externalId: "job-1",
        title: "Fullstack Developer",
        description: "Build web apps",
        location: "Remote",
        url: "https://example.com/job-1",
        contentHash: "hash-1",
        seenAt: new Date("2026-01-31T10:00:00Z")
      }
    });

    const cv = await prisma.cv.create({
      data: { tenantId: tenant.id, title: "Default CV" }
    });

    const cvVersion = await prisma.cvVersion.create({
      data: { tenantId: tenant.id, cvId: cv.id, content: "CV content" }
    });

    await prisma.agentArtefact.create({
      data: {
        tenantId: tenant.id,
        jobId: job.id,
        cvVersionId: cvVersion.id,
        promptVersion: "v1",
        model: "gpt-5.2",
        claimsUsed: [{ claim: "Built APIs" }],
        status: "DRAFT",
        content: "Tailored summary"
      }
    });

    const response = await request(app.getHttpServer())
      .get("/jobs?page=1&pageSize=20&sort=seenAt")
      .set("x-tenant-id", tenant.id)
      .expect(200);

    expect(response.body.jobs).toHaveLength(1);
    expect(response.body.jobs[0].id).toBe(job.id);
    expect(response.body.jobs[0].title).toBe("Fullstack Developer");
    expect(response.body.jobs[0].latestArtefact?.content).toBe("Tailored summary");
    expect(response.body.jobs[0].approvalStatus).toBe("PENDING");
    expect(response.body.page).toBe(1);
    expect(response.body.pageSize).toBe(20);
  });

  it("filters jobs by approval status", async () => {
    const tenant = await prisma.tenant.create({ data: { name: "Beta" } });
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
        title: "Data Engineer",
        description: "Build pipelines",
        location: "Hybrid",
        url: "https://example.com/job-2",
        contentHash: "hash-2",
        seenAt: new Date("2026-01-31T12:00:00Z")
      }
    });

    await prisma.approval.create({
      data: { tenantId: tenant.id, jobId: job.id, status: "REJECTED" }
    });

    const response = await request(app.getHttpServer())
      .get("/jobs?status=REJECTED")
      .set("x-tenant-id", tenant.id)
      .expect(200);

    expect(response.body.jobs).toHaveLength(1);
    expect(response.body.jobs[0].approvalStatus).toBe("REJECTED");
  });

  it("fetches job detail with artefacts", async () => {
    const tenant = await prisma.tenant.create({ data: { name: "Gamma" } });
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
        externalId: "job-3",
        title: "Data Engineer",
        description: "Build pipelines",
        location: "Hybrid",
        url: "https://example.com/job-3",
        contentHash: "hash-3"
      }
    });

    const cv = await prisma.cv.create({
      data: { tenantId: tenant.id, title: "Default CV" }
    });

    const cvVersion = await prisma.cvVersion.create({
      data: { tenantId: tenant.id, cvId: cv.id, content: "CV content" }
    });

    await prisma.agentArtefact.create({
      data: {
        tenantId: tenant.id,
        jobId: job.id,
        cvVersionId: cvVersion.id,
        promptVersion: "v1",
        model: "gpt-5.2",
        claimsUsed: [{ claim: "ETL pipelines" }],
        status: "DRAFT",
        content: "Pipeline summary"
      }
    });

    const response = await request(app.getHttpServer())
      .get(`/jobs/${job.id}`)
      .set("x-tenant-id", tenant.id)
      .expect(200);

    expect(response.body.id).toBe(job.id);
    expect(response.body.artefacts).toHaveLength(1);
    expect(response.body.artefacts[0].content).toBe("Pipeline summary");
  });
});
