import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { prisma } from "@cv/db";
import { AppModule } from "../src/app.module";
import { GOOGLE_DOCS_GATEWAY } from "../src/cv/google-docs.gateway";
import { OpenAiCvGenerationService } from "../src/cv/openai-cv-generation.service";

describe("CV (e2e)", () => {
  let app: INestApplication;

  const googleDocsGateway = {
    getDocument: jest.fn().mockResolvedValue({
      documentId: "base-doc-123",
      title: "Base CV",
      url: "https://docs.google.com/document/d/base-doc-123/edit",
      plainText:
        "Jane Doe\n{{JOB_TITLE}}\n\nSummary\n{{SUMMARY}}\n\nSkills\nTypeScript, React, NestJS",
      placeholders: ["JOB_TITLE", "SUMMARY"]
    }),
    copyDocument: jest.fn().mockResolvedValue({
      documentId: "generated-doc-999",
      title: "Base CV - Platform Engineer",
      url: "https://docs.google.com/document/d/generated-doc-999/edit"
    }),
    replacePlaceholders: jest.fn().mockResolvedValue(undefined)
  };

  const generationService = {
    generateFieldValues: jest.fn().mockResolvedValue({
      SUMMARY: "Platform-focused summary grounded in the base CV."
    })
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(GOOGLE_DOCS_GATEWAY)
      .useValue(googleDocsGateway)
      .overrideProvider(OpenAiCvGenerationService)
      .useValue(generationService)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await prisma.agentArtefact.deleteMany();
    await prisma.cvVersion.deleteMany();
    await prisma.cv.deleteMany();
    await prisma.jobMatch.deleteMany();
    await prisma.approval.deleteMany();
    await prisma.jobAlert.deleteMany();
    await prisma.jobAlertPreference.deleteMany();
    await prisma.jobSearchQuery.deleteMany();
    await prisma.job.deleteMany();
    await prisma.jobSource.deleteMany();
    await prisma.googleConnection.deleteMany();
    await prisma.userProfile.deleteMany();
    await prisma.consentLog.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();
  });

  it("connects a template, generates a draft, and syncs it into a copied Google Doc", async () => {
    const tenant = await prisma.tenant.create({
      data: { name: "Acme" }
    });

    await prisma.googleConnection.create({
      data: {
        tenantId: tenant.id,
        email: "owner@example.com",
        refreshTokenCiphertext: "ciphertext",
        scopes: ["documents", "drive"]
      }
    });

    await prisma.userProfile.create({
      data: {
        tenantId: tenant.id,
        desiredRoles: ["platform engineer"],
        seniority: "junior",
        location: "Remote",
        mustHaveSkills: ["TypeScript", "React"]
      }
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
        externalId: "job-1",
        title: "Platform Engineer",
        description: "Build hiring workflows with React and NestJS.",
        company: "OpenAI",
        salary: "$120,000 - $150,000",
        tags: ["react", "nestjs", "ai"],
        location: "Remote",
        url: "https://example.com/job-1",
        contentHash: "hash-1"
      }
    });

    const connectResponse = await request(app.getHttpServer())
      .post("/cv/template/connect")
      .set("x-tenant-id", tenant.id)
      .send({
        documentUrl: "https://docs.google.com/document/d/base-doc-123/edit"
      })
      .expect(201);

    expect(connectResponse.body.sourceType).toBe("GOOGLE_DOCS");
    expect(connectResponse.body.documentId).toBe("base-doc-123");
    expect(connectResponse.body.templateMode).toBe("PLACEHOLDERS");
    expect(connectResponse.body.placeholders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ token: "JOB_TITLE", bindingType: "JOB_FIELD" }),
        expect.objectContaining({ token: "SUMMARY", bindingType: "GENERATED" })
      ])
    );
    expect(connectResponse.body.latestBaseVersion.kind).toBe("BASE");

    const configuredTemplateResponse = await request(app.getHttpServer())
      .put("/cv/template/placeholders")
      .set("x-tenant-id", tenant.id)
      .send({
        placeholders: [
          {
            token: "JOB_TITLE",
            bindingType: "JOB_FIELD",
            sourceKey: "title",
            instructions: null
          },
          {
            token: "SUMMARY",
            bindingType: "GENERATED",
            sourceKey: "summary",
            instructions: "Keep the summary grounded in the base CV."
          }
        ]
      })
      .expect(200);

    expect(configuredTemplateResponse.body.placeholders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          token: "SUMMARY",
          instructions: "Keep the summary grounded in the base CV."
        })
      ])
    );

    const draftResponse = await request(app.getHttpServer())
      .post("/cv/generate")
      .set("x-tenant-id", tenant.id)
      .send({
        jobId: job.id
      })
      .expect(201);

    expect(generationService.generateFieldValues).toHaveBeenCalled();
    expect(draftResponse.body.jobId).toBe(job.id);
    expect(draftResponse.body.fieldValues).toEqual({
      JOB_TITLE: "Platform Engineer",
      SUMMARY: "Platform-focused summary grounded in the base CV."
    });
    expect(draftResponse.body.syncStatus).toBe("draft");
    expect(googleDocsGateway.copyDocument).not.toHaveBeenCalled();
    expect(googleDocsGateway.replacePlaceholders).not.toHaveBeenCalled();

    const savedDraftResponse = await request(app.getHttpServer())
      .put(`/cv/generated/${draftResponse.body.versionId}`)
      .set("x-tenant-id", tenant.id)
      .send({
        fieldValues: {
          JOB_TITLE: "Platform Engineer",
          SUMMARY: "Edited summary before sync."
        }
      })
      .expect(200);

    expect(savedDraftResponse.body.fieldValues.SUMMARY).toBe("Edited summary before sync.");

    const syncedDraftResponse = await request(app.getHttpServer())
      .post(`/cv/generated/${draftResponse.body.versionId}/sync`)
      .set("x-tenant-id", tenant.id)
      .send({})
      .expect(201);

    expect(googleDocsGateway.copyDocument).toHaveBeenCalledWith(
      tenant.id,
      "base-doc-123",
      expect.stringContaining("Platform Engineer")
    );
    expect(googleDocsGateway.replacePlaceholders).toHaveBeenCalledWith(
      tenant.id,
      "generated-doc-999",
      {
        JOB_TITLE: "Platform Engineer",
        SUMMARY: "Edited summary before sync."
      }
    );
    expect(syncedDraftResponse.body.syncStatus).toBe("synced");
    expect(syncedDraftResponse.body.copiedDocumentUrl).toBe(
      "https://docs.google.com/document/d/generated-doc-999/edit"
    );
  });
});
