import type { PrismaClient } from "@prisma/client";

import { CvService } from "./cv.service";
import type { GoogleDocsGateway } from "./google-docs.gateway";

describe("CvService", () => {
  function createPrismaMock() {
    return {
      googleConnection: {
        findUnique: jest.fn()
      },
      cv: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn()
      },
      cvVersion: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn()
      },
      job: {
        findFirst: jest.fn()
      },
      userProfile: {
        findUnique: jest.fn()
      }
    } as unknown as PrismaClient & {
      googleConnection: {
        findUnique: jest.Mock;
      };
      cv: {
        findFirst: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
        updateMany: jest.Mock;
      };
      cvVersion: {
        create: jest.Mock;
        findFirst: jest.Mock;
        update: jest.Mock;
      };
      job: {
        findFirst: jest.Mock;
      };
      userProfile: {
        findUnique: jest.Mock;
      };
    };
  }

  function createGatewayMock() {
    return {
      getDocument: jest.fn(),
      copyDocument: jest.fn(),
      replacePlaceholders: jest.fn()
    } satisfies GoogleDocsGateway;
  }

  function createGenerationServiceMock() {
    return {
      generateFieldValues: jest.fn()
    };
  }

  it("connects a Google Docs template and extracts placeholders", async () => {
    const prisma = createPrismaMock();
    const gateway = createGatewayMock();
    const generationService = createGenerationServiceMock();
    const service = new CvService(prisma, generationService as never, gateway);

    prisma.googleConnection.findUnique.mockResolvedValue({
      id: "google-1",
      tenantId: "tenant-1",
      email: "owner@example.com",
      refreshTokenCiphertext: "ciphertext",
      scopes: ["https://www.googleapis.com/auth/documents"],
      accessTokenExpiresAt: new Date("2026-03-22T00:00:00.000Z"),
      connectedAt: new Date("2026-03-22T00:00:00.000Z"),
      revokedAt: null,
      createdAt: new Date("2026-03-22T00:00:00.000Z"),
      updatedAt: new Date("2026-03-22T00:00:00.000Z")
    });
    prisma.cv.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "cv-1",
        tenantId: "tenant-1",
        title: "Base CV Template",
        sourceType: "GOOGLE_DOCS",
        isDefault: true,
        sourceDocumentId: "base-doc-123",
        sourceDocumentUrl: "https://docs.google.com/document/d/base-doc-123/edit",
        sourceDocumentTitle: "Base CV Template",
        templateMode: "PLACEHOLDERS",
        placeholderSchema: [
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
            instructions: "One paragraph tailored summary."
          },
          {
            token: "SKILLS_BLOCK",
            bindingType: "GENERATED",
            sourceKey: "skillsBlock",
            instructions: "A short skills line or block grounded in the base CV."
          }
        ],
        lastSyncedAt: new Date("2026-03-22T00:00:00.000Z"),
        createdAt: new Date("2026-03-22T00:00:00.000Z"),
        updatedAt: new Date("2026-03-22T00:00:00.000Z"),
        versions: [
          {
            id: "base-version-1",
            tenantId: "tenant-1",
            cvId: "cv-1",
            content:
              "Name\n{{JOB_TITLE}}\n\nSummary\n{{SUMMARY}}\n\nSkills\n{{SKILLS_BLOCK}}",
            kind: "BASE",
            label: "Connected Google Template",
            jobId: null,
            parentVersionId: null,
            externalDocumentId: "base-doc-123",
            externalDocumentUrl: "https://docs.google.com/document/d/base-doc-123/edit",
            externalDocumentTitle: "Base CV Template",
            metadata: null,
            createdAt: new Date("2026-03-22T00:00:00.000Z")
          }
        ]
      });
    prisma.cv.create.mockResolvedValue({
      id: "cv-1",
      tenantId: "tenant-1",
      title: "Base CV Template",
      sourceType: "GOOGLE_DOCS",
      isDefault: true,
      sourceDocumentId: "base-doc-123",
      sourceDocumentUrl: "https://docs.google.com/document/d/base-doc-123/edit",
      sourceDocumentTitle: "Base CV Template",
      templateMode: "PLACEHOLDERS",
      placeholderSchema: [
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
          instructions: "One paragraph tailored summary."
        },
        {
          token: "SKILLS_BLOCK",
          bindingType: "GENERATED",
          sourceKey: "skillsBlock",
          instructions: "A short skills line or block grounded in the base CV."
        }
      ],
      lastSyncedAt: new Date("2026-03-22T00:00:00.000Z"),
      createdAt: new Date("2026-03-22T00:00:00.000Z"),
      updatedAt: new Date("2026-03-22T00:00:00.000Z"),
      versions: []
    });
    prisma.cv.updateMany.mockResolvedValue({ count: 0 });
    prisma.cvVersion.create.mockResolvedValue({
      id: "base-version-1"
    });
    gateway.getDocument.mockResolvedValue({
      documentId: "base-doc-123",
      title: "Base CV Template",
      url: "https://docs.google.com/document/d/base-doc-123/edit",
      plainText:
        "Name\n{{JOB_TITLE}}\n\nSummary\n{{SUMMARY}}\n\nSkills\n{{SKILLS_BLOCK}}",
      placeholders: ["JOB_TITLE", "SUMMARY", "SKILLS_BLOCK"]
    });

    const result = await service.connectTemplate("tenant-1", {
      documentUrl: "https://docs.google.com/document/d/base-doc-123/edit"
    });

    expect(gateway.getDocument).toHaveBeenCalledWith("tenant-1", "base-doc-123");
    expect(prisma.cv.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: "GOOGLE_DOCS",
          templateMode: "PLACEHOLDERS",
          sourceDocumentId: "base-doc-123"
        })
      })
    );
    expect(result.placeholders.map((item) => item.token)).toEqual([
      "JOB_TITLE",
      "SUMMARY",
      "SKILLS_BLOCK"
    ]);
    expect(result.templateMode).toBe("PLACEHOLDERS");
  });

  it("generates a draft and does not sync Google Docs during draft creation", async () => {
    const prisma = createPrismaMock();
    const gateway = createGatewayMock();
    const generationService = createGenerationServiceMock();
    const service = new CvService(prisma, generationService as never, gateway);

    prisma.googleConnection.findUnique.mockResolvedValue({
      id: "google-1",
      tenantId: "tenant-1",
      email: "owner@example.com",
      refreshTokenCiphertext: "ciphertext",
      scopes: ["https://www.googleapis.com/auth/documents"],
      accessTokenExpiresAt: new Date("2026-03-22T00:00:00.000Z"),
      connectedAt: new Date("2026-03-22T00:00:00.000Z"),
      revokedAt: null,
      createdAt: new Date("2026-03-22T00:00:00.000Z"),
      updatedAt: new Date("2026-03-22T00:00:00.000Z")
    });
    prisma.cv.findFirst.mockResolvedValue({
      id: "cv-1",
      tenantId: "tenant-1",
      title: "Base CV Template",
      sourceType: "GOOGLE_DOCS",
      isDefault: true,
      sourceDocumentId: "base-doc-123",
      sourceDocumentUrl: "https://docs.google.com/document/d/base-doc-123/edit",
      sourceDocumentTitle: "Base CV Template",
      templateMode: "PLACEHOLDERS",
      placeholderSchema: [
        {
          token: "JOB_TITLE",
          bindingType: "JOB_FIELD",
          sourceKey: "title",
          instructions: null
        },
        {
          token: "COMPANY_NAME",
          bindingType: "JOB_FIELD",
          sourceKey: "company",
          instructions: null
        },
        {
          token: "SUMMARY",
          bindingType: "GENERATED",
          sourceKey: "summary",
          instructions: "One paragraph tailored summary."
        },
        {
          token: "SKILLS_BLOCK",
          bindingType: "GENERATED",
          sourceKey: "skillsBlock",
          instructions: "A short skills line or block grounded in the base CV."
        }
      ],
      lastSyncedAt: new Date("2026-03-22T00:00:00.000Z"),
      createdAt: new Date("2026-03-22T00:00:00.000Z"),
      updatedAt: new Date("2026-03-22T00:00:00.000Z"),
      versions: [
        {
          id: "base-version-1",
          tenantId: "tenant-1",
          cvId: "cv-1",
          content: "Summary\n{{SUMMARY}}",
          kind: "BASE",
          label: "Connected Google Template",
          jobId: null,
          parentVersionId: null,
          externalDocumentId: "base-doc-123",
          externalDocumentUrl: "https://docs.google.com/document/d/base-doc-123/edit",
          externalDocumentTitle: "Base CV Template",
          metadata: null,
          createdAt: new Date("2026-03-22T00:00:00.000Z")
        }
      ]
    });
    prisma.job.findFirst.mockResolvedValue({
      id: "job-1",
      tenantId: "tenant-1",
      title: "Platform Engineer",
      description: "Build AI-assisted hiring workflows with React and NestJS.",
      company: "OpenAI",
      salary: "$120,000 - $150,000",
      tags: ["react", "nestjs", "ai"],
      location: "Remote",
      url: "https://example.com/job-1",
      postedAt: new Date("2026-03-21T00:00:00.000Z")
    });
    prisma.userProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      tenantId: "tenant-1",
      desiredRoles: ["Platform Engineer"],
      seniority: "senior",
      location: "Remote",
      mustHaveSkills: ["React", "NestJS", "AI"],
      createdAt: new Date("2026-03-22T00:00:00.000Z"),
      updatedAt: new Date("2026-03-22T00:00:00.000Z")
    });
    gateway.getDocument.mockResolvedValue({
      documentId: "base-doc-123",
      title: "Base CV Template",
      url: "https://docs.google.com/document/d/base-doc-123/edit",
      plainText: "Summary\n{{SUMMARY}}",
      placeholders: ["JOB_TITLE", "COMPANY_NAME", "SUMMARY"]
    });
    generationService.generateFieldValues.mockResolvedValue({
      SUMMARY:
        "Platform-focused engineer with experience building AI-assisted workflow products using React and NestJS."
    });
    prisma.cvVersion.create.mockResolvedValue({
      id: "generated-version-1",
      tenantId: "tenant-1",
      cvId: "cv-1",
      content: JSON.stringify({
        JOB_TITLE: "Platform Engineer",
        COMPANY_NAME: "OpenAI",
        SUMMARY:
          "Platform-focused engineer with experience building AI-assisted workflow products using React and NestJS."
      }),
      kind: "GENERATED",
      label: "Tailored draft for Platform Engineer",
      jobId: "job-1",
      parentVersionId: "base-version-1",
      externalDocumentId: null,
      externalDocumentUrl: null,
      externalDocumentTitle: null,
      metadata: {
        fieldValues: {
          JOB_TITLE: "Platform Engineer",
          COMPANY_NAME: "OpenAI",
          SUMMARY:
            "Platform-focused engineer with experience building AI-assisted workflow products using React and NestJS."
        },
        previewState: {
          JOB_TITLE: "Platform Engineer",
          COMPANY_NAME: "OpenAI",
          SUMMARY:
            "Platform-focused engineer with experience building AI-assisted workflow products using React and NestJS."
        },
        syncStatus: "draft"
      },
      createdAt: new Date("2026-03-22T00:10:00.000Z")
    });

    const result = await service.generateDraft("tenant-1", "job-1");

    expect(generationService.generateFieldValues).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedTokens: ["SUMMARY", "SKILLS_BLOCK"],
        baseCvContent: "Summary\n{{SUMMARY}}"
      })
    );
    expect(gateway.copyDocument).not.toHaveBeenCalled();
    expect(gateway.replacePlaceholders).not.toHaveBeenCalled();
    expect(result.fieldValues.JOB_TITLE).toBe("Platform Engineer");
    expect(result.fieldValues.COMPANY_NAME).toBe("OpenAI");
    expect(result.syncStatus).toBe("draft");
  });

  it("can generate a summary-only draft without blanking other generated placeholders", async () => {
    const prisma = createPrismaMock();
    const gateway = createGatewayMock();
    const generationService = createGenerationServiceMock();
    const service = new CvService(prisma, generationService as never, gateway);

    prisma.googleConnection.findUnique.mockResolvedValue({
      id: "google-1",
      tenantId: "tenant-1",
      email: "owner@example.com",
      refreshTokenCiphertext: "ciphertext",
      scopes: ["https://www.googleapis.com/auth/documents"],
      accessTokenExpiresAt: new Date("2026-03-22T00:00:00.000Z"),
      connectedAt: new Date("2026-03-22T00:00:00.000Z"),
      revokedAt: null,
      createdAt: new Date("2026-03-22T00:00:00.000Z"),
      updatedAt: new Date("2026-03-22T00:00:00.000Z")
    });
    prisma.cv.findFirst.mockResolvedValue({
      id: "cv-1",
      tenantId: "tenant-1",
      title: "Base CV Template",
      sourceType: "GOOGLE_DOCS",
      isDefault: true,
      sourceDocumentId: "base-doc-123",
      sourceDocumentUrl: "https://docs.google.com/document/d/base-doc-123/edit",
      sourceDocumentTitle: "Base CV Template",
      templateMode: "PLACEHOLDERS",
      placeholderSchema: [
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
          instructions: "One paragraph tailored summary."
        },
        {
          token: "SKILLS_BLOCK",
          bindingType: "GENERATED",
          sourceKey: "skillsBlock",
          instructions: "A short skills line or block grounded in the base CV."
        }
      ],
      lastSyncedAt: new Date("2026-03-22T00:00:00.000Z"),
      createdAt: new Date("2026-03-22T00:00:00.000Z"),
      updatedAt: new Date("2026-03-22T00:00:00.000Z"),
      versions: [
        {
          id: "base-version-1",
          tenantId: "tenant-1",
          cvId: "cv-1",
          content: "Summary\n{{SUMMARY}}\n\nSkills\n{{SKILLS_BLOCK}}",
          kind: "BASE",
          label: "Connected Google Template",
          jobId: null,
          parentVersionId: null,
          externalDocumentId: "base-doc-123",
          externalDocumentUrl: "https://docs.google.com/document/d/base-doc-123/edit",
          externalDocumentTitle: "Base CV Template",
          metadata: null,
          createdAt: new Date("2026-03-22T00:00:00.000Z")
        }
      ]
    });
    prisma.job.findFirst.mockResolvedValue({
      id: "job-1",
      tenantId: "tenant-1",
      title: "Platform Engineer",
      description: "Build AI-assisted hiring workflows with React and NestJS.",
      company: "OpenAI",
      salary: "$120,000 - $150,000",
      tags: ["react", "nestjs", "ai"],
      location: "Remote",
      url: "https://example.com/job-1",
      postedAt: new Date("2026-03-21T00:00:00.000Z")
    });
    prisma.userProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      tenantId: "tenant-1",
      desiredRoles: ["Platform Engineer"],
      seniority: "senior",
      location: "Remote",
      mustHaveSkills: ["React", "NestJS", "AI"],
      createdAt: new Date("2026-03-22T00:00:00.000Z"),
      updatedAt: new Date("2026-03-22T00:00:00.000Z")
    });
    gateway.getDocument.mockResolvedValue({
      documentId: "base-doc-123",
      title: "Base CV Template",
      url: "https://docs.google.com/document/d/base-doc-123/edit",
      plainText: "Summary\n{{SUMMARY}}\n\nSkills\n{{SKILLS_BLOCK}}",
      placeholders: ["JOB_TITLE", "SUMMARY", "SKILLS_BLOCK"]
    });
    generationService.generateFieldValues.mockResolvedValue({
      SUMMARY:
        "Platform-focused engineer with experience building AI-assisted workflow products using React and NestJS."
    });
    prisma.cvVersion.create.mockResolvedValue({
      id: "generated-version-1",
      tenantId: "tenant-1",
      cvId: "cv-1",
      content: JSON.stringify({
        JOB_TITLE: "Platform Engineer",
        SUMMARY:
          "Platform-focused engineer with experience building AI-assisted workflow products using React and NestJS."
      }),
      kind: "GENERATED",
      label: "Tailored draft for Platform Engineer",
      jobId: "job-1",
      parentVersionId: "base-version-1",
      externalDocumentId: null,
      externalDocumentUrl: null,
      externalDocumentTitle: null,
      metadata: {
        fieldValues: {
          JOB_TITLE: "Platform Engineer",
          SUMMARY:
            "Platform-focused engineer with experience building AI-assisted workflow products using React and NestJS."
        },
        previewState: {
          JOB_TITLE: "Platform Engineer",
          SUMMARY:
            "Platform-focused engineer with experience building AI-assisted workflow products using React and NestJS."
        },
        syncStatus: "draft"
      },
      createdAt: new Date("2026-03-22T00:10:00.000Z")
    });

    const result = await service.generateDraft("tenant-1", "job-1", {
      summaryOnly: true
    });

    expect(generationService.generateFieldValues).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedTokens: ["SUMMARY"]
      })
    );
    expect(result.fieldValues).toEqual({
      JOB_TITLE: "Platform Engineer",
      SUMMARY:
        "Platform-focused engineer with experience building AI-assisted workflow products using React and NestJS."
    });
    expect(result.fieldValues.SKILLS_BLOCK).toBeUndefined();
  });

  it("syncs an existing draft by copying the template and replacing placeholders", async () => {
    const prisma = createPrismaMock();
    const gateway = createGatewayMock();
    const generationService = createGenerationServiceMock();
    const service = new CvService(prisma, generationService as never, gateway);

    prisma.googleConnection.findUnique.mockResolvedValue({
      id: "google-1",
      tenantId: "tenant-1",
      email: "owner@example.com",
      refreshTokenCiphertext: "ciphertext",
      scopes: ["https://www.googleapis.com/auth/documents"],
      accessTokenExpiresAt: new Date("2026-03-22T00:00:00.000Z"),
      connectedAt: new Date("2026-03-22T00:00:00.000Z"),
      revokedAt: null,
      createdAt: new Date("2026-03-22T00:00:00.000Z"),
      updatedAt: new Date("2026-03-22T00:00:00.000Z")
    });
    prisma.cv.findFirst.mockResolvedValue({
      id: "cv-1",
      tenantId: "tenant-1",
      title: "Base CV Template",
      sourceType: "GOOGLE_DOCS",
      isDefault: true,
      sourceDocumentId: "base-doc-123",
      sourceDocumentUrl: "https://docs.google.com/document/d/base-doc-123/edit",
      sourceDocumentTitle: "Base CV Template",
      templateMode: "PLACEHOLDERS",
      placeholderSchema: [
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
          instructions: "One paragraph tailored summary."
        }
      ],
      lastSyncedAt: new Date("2026-03-22T00:00:00.000Z"),
      createdAt: new Date("2026-03-22T00:00:00.000Z"),
      updatedAt: new Date("2026-03-22T00:00:00.000Z"),
      versions: []
    });
    prisma.cvVersion.findFirst.mockResolvedValue({
      id: "generated-version-1",
      tenantId: "tenant-1",
      cvId: "cv-1",
      content: JSON.stringify({
        JOB_TITLE: "Platform Engineer",
        SUMMARY:
          "Platform-focused engineer with experience building AI-assisted workflow products using React and NestJS."
      }),
      kind: "GENERATED",
      label: "Tailored draft for Platform Engineer",
      jobId: "job-1",
      parentVersionId: "base-version-1",
      externalDocumentId: null,
      externalDocumentUrl: null,
      externalDocumentTitle: null,
      metadata: {
        fieldValues: {
          JOB_TITLE: "Platform Engineer",
          SUMMARY:
            "Platform-focused engineer with experience building AI-assisted workflow products using React and NestJS."
        },
        previewState: {
          JOB_TITLE: "Platform Engineer",
          SUMMARY:
            "Platform-focused engineer with experience building AI-assisted workflow products using React and NestJS."
        },
        syncStatus: "draft"
      },
      createdAt: new Date("2026-03-22T00:10:00.000Z")
    });
    prisma.job.findFirst.mockResolvedValue({
      id: "job-1",
      tenantId: "tenant-1",
      title: "Platform Engineer",
      description: "Build AI-assisted hiring workflows with React and NestJS.",
      company: "OpenAI",
      salary: "$120,000 - $150,000",
      tags: ["react", "nestjs", "ai"],
      location: "Remote",
      url: "https://example.com/job-1",
      postedAt: new Date("2026-03-21T00:00:00.000Z")
    });
    gateway.copyDocument.mockResolvedValue({
      documentId: "generated-doc-999",
      title: "Base CV Template - Platform Engineer",
      url: "https://docs.google.com/document/d/generated-doc-999/edit"
    });
    gateway.replacePlaceholders.mockResolvedValue(undefined);
    prisma.cvVersion.update.mockResolvedValue({
      id: "generated-version-1",
      tenantId: "tenant-1",
      cvId: "cv-1",
      content: JSON.stringify({
        JOB_TITLE: "Platform Engineer",
        SUMMARY:
          "Platform-focused engineer with experience building AI-assisted workflow products using React and NestJS."
      }),
      kind: "GENERATED",
      label: "Tailored draft for Platform Engineer",
      jobId: "job-1",
      parentVersionId: "base-version-1",
      externalDocumentId: "generated-doc-999",
      externalDocumentUrl: "https://docs.google.com/document/d/generated-doc-999/edit",
      externalDocumentTitle: "Base CV Template - Platform Engineer",
      metadata: {
        fieldValues: {
          JOB_TITLE: "Platform Engineer",
          SUMMARY:
            "Platform-focused engineer with experience building AI-assisted workflow products using React and NestJS."
        },
        previewState: {
          JOB_TITLE: "Platform Engineer",
          SUMMARY:
            "Platform-focused engineer with experience building AI-assisted workflow products using React and NestJS."
        },
        syncStatus: "synced"
      },
      createdAt: new Date("2026-03-22T00:10:00.000Z")
    });

    const result = await service.syncDraft("tenant-1", "generated-version-1");

    expect(gateway.copyDocument).toHaveBeenCalledWith(
      "tenant-1",
      "base-doc-123",
      expect.stringContaining("Platform Engineer")
    );
    expect(gateway.replacePlaceholders).toHaveBeenCalledWith("tenant-1", "generated-doc-999", {
      JOB_TITLE: "Platform Engineer",
      SUMMARY:
        "Platform-focused engineer with experience building AI-assisted workflow products using React and NestJS."
    });
    expect(result.copiedDocumentUrl).toBe(
      "https://docs.google.com/document/d/generated-doc-999/edit"
    );
    expect(result.syncStatus).toBe("synced");
  });
});
