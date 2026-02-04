import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { prisma } from "@cv/db";

import { AppModule } from "../src/app.module";

describe("Matching (e2e)", () => {
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

  it("scores a job", async () => {
    const response = await request(app.getHttpServer())
      .post("/matching/score")
      .set("x-tenant-id", "t1")
      .send({
        profile: {
          desiredRoles: ["fullstack"],
          seniority: "mid",
          location: "remote",
          mustHaveSkills: ["typescript"]
        },
        job: {
          title: "Mid Fullstack Developer",
          description: "TypeScript and Node",
          location: "Remote",
          postedAt: new Date().toISOString()
        }
      })
      .expect(201);

    expect(response.body.score).toBeGreaterThan(0);
    expect(response.body.explanations.length).toBeGreaterThan(0);
  });

  describe("GET /matching/jobs/:jobId", () => {
    it("returns match score when profile exists", async () => {
      const tenant = await prisma.tenant.create({ data: { name: "MatchTenant" } });
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
          externalId: "match-job-1",
          title: "Senior Fullstack Developer",
          description: "Build web applications with TypeScript and React",
          location: "Remote",
          url: "https://example.com/job-1",
          contentHash: "hash-match-1",
          postedAt: new Date()
        }
      });

      await prisma.userProfile.create({
        data: {
          tenantId: tenant.id,
          desiredRoles: ["fullstack", "backend"],
          seniority: "senior",
          location: "remote",
          mustHaveSkills: ["typescript", "react"]
        }
      });

      const response = await request(app.getHttpServer())
        .get(`/matching/jobs/${job.id}`)
        .set("x-tenant-id", tenant.id)
        .expect(200);

      expect(response.body.score).toBeGreaterThan(0);
      expect(response.body.explanations).toContain("role match");
      expect(response.body.explanations).toContain("seniority match");
      expect(response.body.explanations).toContain("location match");
      expect(response.body.explanations).toContain("skills match");
      expect(response.body.job.id).toBe(job.id);
      expect(response.body.job.title).toBe("Senior Fullstack Developer");
    });

    it("returns 400 when no profile configured", async () => {
      const tenant = await prisma.tenant.create({ data: { name: "NoProfileTenant" } });
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
          externalId: "match-job-2",
          title: "Backend Developer",
          description: "Build APIs",
          location: "NYC",
          url: "https://example.com/job-2",
          contentHash: "hash-match-2"
        }
      });

      const response = await request(app.getHttpServer())
        .get(`/matching/jobs/${job.id}`)
        .set("x-tenant-id", tenant.id)
        .expect(400);

      expect(response.body.message).toContain("Profile not configured");
    });

    it("returns 404 when job not found", async () => {
      const tenant = await prisma.tenant.create({ data: { name: "JobNotFoundTenant" } });

      await prisma.userProfile.create({
        data: {
          tenantId: tenant.id,
          desiredRoles: ["frontend"],
          seniority: "mid",
          location: "remote",
          mustHaveSkills: ["vue"]
        }
      });

      await request(app.getHttpServer())
        .get("/matching/jobs/nonexistent-job-id")
        .set("x-tenant-id", tenant.id)
        .expect(404);
    });

    it("returns 404 when job belongs to different tenant", async () => {
      const tenant1 = await prisma.tenant.create({ data: { name: "Tenant1" } });
      const tenant2 = await prisma.tenant.create({ data: { name: "Tenant2" } });

      const source = await prisma.jobSource.create({
        data: {
          tenantId: tenant1.id,
          type: "greenhouse",
          name: "Greenhouse",
          config: { baseUrl: "https://boards.greenhouse.io" }
        }
      });

      const job = await prisma.job.create({
        data: {
          tenantId: tenant1.id,
          jobSourceId: source.id,
          externalId: "match-job-3",
          title: "DevOps Engineer",
          description: "Build infrastructure",
          location: "Remote",
          url: "https://example.com/job-3",
          contentHash: "hash-match-3"
        }
      });

      await prisma.userProfile.create({
        data: {
          tenantId: tenant2.id,
          desiredRoles: ["devops"],
          seniority: "senior",
          location: "remote",
          mustHaveSkills: ["kubernetes"]
        }
      });

      // Try to access tenant1's job with tenant2's credentials
      await request(app.getHttpServer())
        .get(`/matching/jobs/${job.id}`)
        .set("x-tenant-id", tenant2.id)
        .expect(404);
    });
  });
});
