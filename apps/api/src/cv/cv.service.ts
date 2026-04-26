import { Inject, Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { Prisma, PrismaClient, type Cv, type CvVersion } from "@prisma/client";

import type {
  CvTemplateResponseDto,
  CvVersionResponseDto,
  GeneratedCvDraftResponseDto
} from "./cv.dto";
import {
  GOOGLE_DOCS_GATEWAY,
  type GoogleDocsGateway,
  type GoogleDocumentSnapshot
} from "./google-docs.gateway";
import { OpenAiCvGenerationService } from "./openai-cv-generation.service";
import type {
  CvPlaceholderSchemaItem,
  GeneratedCvMetadata
} from "./cv.types";

type CvWithVersions = Cv & { versions: CvVersion[] };

@Injectable()
export class CvService {
  constructor(
    private readonly prismaClient: PrismaClient,
    private readonly generationService: OpenAiCvGenerationService,
    @Inject(GOOGLE_DOCS_GATEWAY) private readonly googleDocsGateway: GoogleDocsGateway
  ) {}

  async getTemplate(tenantId: string): Promise<CvTemplateResponseDto | null> {
    const cv = await this.prismaClient.cv.findFirst({
      where: {
        tenantId,
        isDefault: true
      },
      include: {
        versions: {
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    if (!cv || cv.sourceType !== "GOOGLE_DOCS" || cv.templateMode !== "PLACEHOLDERS") {
      return null;
    }

    return this.mapTemplateResponse(cv);
  }

  async connectTemplate(
    tenantId: string,
    input: { documentUrl: string; title?: string }
  ): Promise<CvTemplateResponseDto> {
    await this.requireGoogleConnection(tenantId);

    const documentId = this.extractGoogleDocumentId(input.documentUrl);
    const snapshot = await this.googleDocsGateway.getDocument(tenantId, documentId);
    if (snapshot.placeholders.length === 0) {
      throw new BadRequestException(
        "The Google Doc does not contain any {{PLACEHOLDER}} tokens."
      );
    }

    const existingDefaultCv = await this.prismaClient.cv.findFirst({
      where: {
        tenantId,
        isDefault: true
      },
      include: {
        versions: {
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    const placeholderSchema = this.buildDefaultPlaceholderSchema(snapshot.placeholders);

    const cv: CvWithVersions = existingDefaultCv
      ? await this.prismaClient.cv.update({
          where: { id: existingDefaultCv.id },
          data: {
            title: input.title?.trim() || snapshot.title,
            sourceType: "GOOGLE_DOCS",
            sourceDocumentId: snapshot.documentId,
            sourceDocumentUrl: snapshot.url,
            sourceDocumentTitle: snapshot.title,
            templateMode: "PLACEHOLDERS",
            placeholderSchema: placeholderSchema as unknown as Prisma.InputJsonValue,
            lastSyncedAt: new Date(),
            isDefault: true
          },
          include: {
            versions: {
              orderBy: {
                createdAt: "desc"
              }
            }
          }
        })
      : await this.prismaClient.cv.create({
          data: {
            tenantId,
            title: input.title?.trim() || snapshot.title,
            sourceType: "GOOGLE_DOCS",
            sourceDocumentId: snapshot.documentId,
            sourceDocumentUrl: snapshot.url,
            sourceDocumentTitle: snapshot.title,
            templateMode: "PLACEHOLDERS",
            placeholderSchema: placeholderSchema as unknown as Prisma.InputJsonValue,
            lastSyncedAt: new Date(),
            isDefault: true
          },
          include: {
            versions: {
              orderBy: {
                createdAt: "desc"
              }
            }
          }
        });

    await this.prismaClient.cv.updateMany({
      where: {
        tenantId,
        NOT: {
          id: cv.id
        }
      },
      data: {
        isDefault: false
      }
    });

    const latestBaseVersion = cv.versions.find((version) => version.kind === "BASE") ?? null;
    if (!latestBaseVersion || latestBaseVersion.content !== snapshot.plainText) {
      await this.prismaClient.cvVersion.create({
        data: {
          tenantId,
          cvId: cv.id,
          content: snapshot.plainText,
          kind: "BASE",
          label: "Connected Google Template",
          externalDocumentId: snapshot.documentId,
          externalDocumentUrl: snapshot.url,
          externalDocumentTitle: snapshot.title
        }
      });
    }

    const refreshed = await this.requireTemplateCvWithVersions(tenantId);
    return this.mapTemplateResponse(refreshed);
  }

  async updateTemplatePlaceholders(
    tenantId: string,
    placeholders: CvPlaceholderSchemaItem[]
  ): Promise<CvTemplateResponseDto> {
    const cv = await this.requireTemplateCvWithVersions(tenantId);
    const currentTokens = new Set(this.getPlaceholderSchema(cv).map((item) => item.token));
    const submittedTokens = new Set(placeholders.map((item) => item.token));

    if (
      currentTokens.size !== submittedTokens.size ||
      Array.from(currentTokens).some((token) => !submittedTokens.has(token))
    ) {
      throw new BadRequestException("Submitted placeholder configuration does not match the template.");
    }

    await this.prismaClient.cv.update({
      where: { id: cv.id },
      data: {
        placeholderSchema: placeholders as unknown as Prisma.InputJsonValue
      }
    });

    const refreshed = await this.requireTemplateCvWithVersions(tenantId);
    return this.mapTemplateResponse(refreshed);
  }

  async generateDraft(
    tenantId: string,
    jobId: string,
    options?: { summaryOnly?: boolean }
  ): Promise<GeneratedCvDraftResponseDto> {
    const cv = await this.requireTemplateCvWithVersions(tenantId);
    const job = await this.requireJob(tenantId, jobId);
    const profile = await this.prismaClient.userProfile.findUnique({
      where: { tenantId }
    });
    const baseVersion = await this.getCurrentBaseVersion(tenantId, cv);
    const placeholderSchema = this.getPlaceholderSchema(cv);
    const deterministicValues = this.buildDeterministicFieldValues(placeholderSchema, job, profile);
    const generatedPlaceholders = this.selectGeneratedPlaceholders(
      placeholderSchema,
      options?.summaryOnly ?? false
    );

    const generatedValues = await this.generationService.generateFieldValues({
      allowedTokens: generatedPlaceholders.map((item) => item.token),
      placeholders: generatedPlaceholders,
      baseCvContent: baseVersion.content,
      job: {
        title: job.title,
        description: job.description,
        company: job.company,
        location: job.location,
        salary: job.salary,
        tags: job.tags
      },
      profile: profile
        ? {
            desiredRoles: profile.desiredRoles,
            seniority: profile.seniority,
            location: profile.location,
            mustHaveSkills: profile.mustHaveSkills
          }
        : null
    });

    const fieldValues = {
      ...deterministicValues,
      ...generatedValues
    };

    const generatedVersion = await this.prismaClient.cvVersion.create({
      data: {
        tenantId,
        cvId: cv.id,
        content: JSON.stringify(fieldValues),
        kind: "GENERATED",
        label: `Tailored draft for ${job.title}`,
        jobId: job.id,
        parentVersionId: baseVersion.id,
        metadata: {
          fieldValues,
          previewState: fieldValues,
          syncStatus: "draft"
        } as Prisma.InputJsonValue
      }
    });

    return this.mapGeneratedDraftResponse(generatedVersion);
  }

  async updateDraft(
    tenantId: string,
    versionId: string,
    fieldValues: Record<string, string>
  ): Promise<GeneratedCvDraftResponseDto> {
    const version = await this.requireGeneratedVersion(tenantId, versionId);
    const metadata = this.getGeneratedMetadata(version);
    const nextMetadata: GeneratedCvMetadata = {
      ...metadata,
      fieldValues,
      previewState: fieldValues
    };

    const updated = await this.prismaClient.cvVersion.update({
      where: { id: version.id },
      data: {
        content: JSON.stringify(fieldValues),
        metadata: nextMetadata as unknown as Prisma.InputJsonValue
      }
    });

    return this.mapGeneratedDraftResponse(updated);
  }

  async syncDraft(tenantId: string, versionId: string): Promise<GeneratedCvDraftResponseDto> {
    const version = await this.requireGeneratedVersion(tenantId, versionId);
    const cv = await this.requireTemplateCvWithVersions(tenantId);
    const job = await this.requireJob(tenantId, version.jobId ?? "");
    const metadata = this.getGeneratedMetadata(version);

    let externalDocumentId = version.externalDocumentId;
    let externalDocumentUrl = version.externalDocumentUrl;
    let externalDocumentTitle = version.externalDocumentTitle;

    if (!cv.sourceDocumentId) {
      throw new BadRequestException("Template Google Doc is not connected.");
    }

    if (!externalDocumentId) {
      const copiedDocument = await this.googleDocsGateway.copyDocument(
        tenantId,
        cv.sourceDocumentId,
        `${cv.title} - ${job.title}`
      );
      externalDocumentId = copiedDocument.documentId;
      externalDocumentUrl = copiedDocument.url;
      externalDocumentTitle = copiedDocument.title;
    }

    await this.googleDocsGateway.replacePlaceholders(
      tenantId,
      externalDocumentId,
      metadata.fieldValues
    );

    const updated = await this.prismaClient.cvVersion.update({
      where: { id: version.id },
      data: {
        externalDocumentId,
        externalDocumentUrl,
        externalDocumentTitle,
        metadata: {
          ...metadata,
          syncStatus: "synced"
        } as Prisma.InputJsonValue
      }
    });

    return this.mapGeneratedDraftResponse(updated);
  }

  private async requireGoogleConnection(tenantId: string) {
    const connection = await this.prismaClient.googleConnection.findUnique({
      where: { tenantId }
    });

    if (!connection || connection.revokedAt) {
      throw new BadRequestException("Connect Google before attaching a base CV template.");
    }

    return connection;
  }

  private async requireTemplateCvWithVersions(tenantId: string) {
    const cv = await this.prismaClient.cv.findFirst({
      where: {
        tenantId,
        isDefault: true
      },
      include: {
        versions: {
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    if (!cv || cv.sourceType !== "GOOGLE_DOCS" || cv.templateMode !== "PLACEHOLDERS") {
      throw new NotFoundException("Google Docs template not configured");
    }

    return cv;
  }

  private async requireJob(tenantId: string, jobId: string) {
    const job = await this.prismaClient.job.findFirst({
      where: {
        id: jobId,
        tenantId
      }
    });

    if (!job) {
      throw new NotFoundException("Job not found");
    }

    return job;
  }

  private async requireGeneratedVersion(tenantId: string, versionId: string) {
    const version = await this.prismaClient.cvVersion.findFirst({
      where: {
        id: versionId,
        tenantId,
        kind: "GENERATED"
      }
    });

    if (!version) {
      throw new NotFoundException("Generated CV draft not found");
    }

    return version;
  }

  private async getCurrentBaseVersion(tenantId: string, cv: CvWithVersions) {
    let latestBaseVersion = cv.versions.find((version) => version.kind === "BASE") ?? null;

    if (cv.sourceType === "GOOGLE_DOCS" && cv.sourceDocumentId) {
      const snapshot = await this.googleDocsGateway.getDocument(tenantId, cv.sourceDocumentId);
      const currentBaseContent = latestBaseVersion?.content ?? "";
      if (
        !latestBaseVersion ||
        currentBaseContent !== snapshot.plainText ||
        cv.sourceDocumentTitle !== snapshot.title
      ) {
        latestBaseVersion = await this.createSyncedBaseVersion(tenantId, cv.id, snapshot);
        await this.prismaClient.cv.update({
          where: { id: cv.id },
          data: {
            sourceDocumentUrl: snapshot.url,
            sourceDocumentTitle: snapshot.title,
            lastSyncedAt: new Date()
          }
        });
      }
    }

    if (!latestBaseVersion) {
      throw new BadRequestException("No base CV version is available. Connect a template first.");
    }

    return latestBaseVersion;
  }

  private async createSyncedBaseVersion(
    tenantId: string,
    cvId: string,
    snapshot: GoogleDocumentSnapshot
  ) {
    return this.prismaClient.cvVersion.create({
      data: {
        tenantId,
        cvId,
        content: snapshot.plainText,
        kind: "BASE",
        label: "Synced Google Template",
        externalDocumentId: snapshot.documentId,
        externalDocumentUrl: snapshot.url,
        externalDocumentTitle: snapshot.title
      }
    });
  }

  private mapTemplateResponse(cv: CvWithVersions): CvTemplateResponseDto {
    const latestBaseVersion = cv.versions.find((version) => version.kind === "BASE") ?? null;

    return {
      id: cv.id,
      title: cv.title,
      sourceType: cv.sourceType,
      templateMode: cv.templateMode,
      documentId: cv.sourceDocumentId,
      documentUrl: cv.sourceDocumentUrl,
      documentTitle: cv.sourceDocumentTitle,
      placeholders: this.getPlaceholderSchema(cv),
      lastSyncedAt: cv.lastSyncedAt?.toISOString() ?? null,
      latestBaseVersion: latestBaseVersion ? this.mapVersionResponse(latestBaseVersion) : null
    };
  }

  private mapVersionResponse(version: CvVersion): CvVersionResponseDto {
    return {
      id: version.id,
      kind: version.kind,
      label: version.label ?? null,
      jobId: version.jobId ?? null,
      content: version.content,
      externalDocumentId: version.externalDocumentId ?? null,
      externalDocumentUrl: version.externalDocumentUrl ?? null,
      externalDocumentTitle: version.externalDocumentTitle ?? null,
      createdAt: version.createdAt.toISOString()
    };
  }

  private mapGeneratedDraftResponse(version: CvVersion): GeneratedCvDraftResponseDto {
    const metadata = this.getGeneratedMetadata(version);

    return {
      versionId: version.id,
      jobId: version.jobId ?? "",
      fieldValues: metadata.fieldValues,
      previewState: metadata.previewState,
      copiedDocumentUrl: version.externalDocumentUrl ?? null,
      copiedDocumentTitle: version.externalDocumentTitle ?? null,
      syncStatus: metadata.syncStatus,
      createdAt: version.createdAt.toISOString()
    };
  }

  private getPlaceholderSchema(cv: Pick<Cv, "placeholderSchema">): CvPlaceholderSchemaItem[] {
    const placeholderSchema = cv.placeholderSchema;
    if (!Array.isArray(placeholderSchema)) {
      return [];
    }

    return placeholderSchema as unknown as CvPlaceholderSchemaItem[];
  }

  private getGeneratedMetadata(version: Pick<CvVersion, "metadata">): GeneratedCvMetadata {
    const metadata = version.metadata as GeneratedCvMetadata | null;

    return {
      fieldValues: metadata?.fieldValues ?? {},
      previewState: metadata?.previewState ?? metadata?.fieldValues ?? {},
      syncStatus: metadata?.syncStatus ?? "draft"
    };
  }

  private buildDefaultPlaceholderSchema(tokens: string[]): CvPlaceholderSchemaItem[] {
    return tokens.map((token) => {
      switch (token) {
        case "JOB_TITLE":
          return { token, bindingType: "JOB_FIELD", sourceKey: "title", instructions: null };
        case "COMPANY_NAME":
          return { token, bindingType: "JOB_FIELD", sourceKey: "company", instructions: null };
        case "JOB_LOCATION":
          return { token, bindingType: "JOB_FIELD", sourceKey: "location", instructions: null };
        case "JOB_SALARY":
          return { token, bindingType: "JOB_FIELD", sourceKey: "salary", instructions: null };
        case "DESIRED_ROLES":
          return {
            token,
            bindingType: "PROFILE_FIELD",
            sourceKey: "desiredRoles",
            instructions: null
          };
        case "SENIORITY":
          return {
            token,
            bindingType: "PROFILE_FIELD",
            sourceKey: "seniority",
            instructions: null
          };
        case "PROFILE_LOCATION":
          return {
            token,
            bindingType: "PROFILE_FIELD",
            sourceKey: "profileLocation",
            instructions: null
          };
        case "MUST_HAVE_SKILLS":
          return {
            token,
            bindingType: "PROFILE_FIELD",
            sourceKey: "mustHaveSkills",
            instructions: null
          };
        case "HEADLINE":
          return {
            token,
            bindingType: "GENERATED",
            sourceKey: "headline",
            instructions: "One concise headline aligned with the target role."
          };
        case "SUMMARY":
          return {
            token,
            bindingType: "GENERATED",
            sourceKey: "summary",
            instructions: "One short summary paragraph tailored to the target role."
          };
        case "SKILLS_BLOCK":
          return {
            token,
            bindingType: "GENERATED",
            sourceKey: "skillsBlock",
            instructions: "A short skills line or block grounded in the base CV."
          };
        case "EXPERIENCE_BULLETS":
          return {
            token,
            bindingType: "GENERATED",
            sourceKey: "experienceBullets",
            instructions: "Three short bullet points tailored to the job requirements."
          };
        default:
          return {
            token,
            bindingType: "CUSTOM",
            sourceKey: "custom",
            instructions: `Fill ${token} with concise CV-ready text grounded in the base CV.`
          };
      }
    });
  }

  private buildDeterministicFieldValues(
    placeholders: CvPlaceholderSchemaItem[],
    job: {
      title: string;
      company: string | null;
      location: string | null;
      salary: string | null;
    },
    profile: {
      desiredRoles: string[];
      seniority: string;
      location: string;
      mustHaveSkills: string[];
    } | null
  ): Record<string, string> {
    return Object.fromEntries(
      placeholders.flatMap((placeholder) => {
        if (placeholder.bindingType === "JOB_FIELD") {
          switch (placeholder.sourceKey) {
            case "title":
              return [[placeholder.token, job.title]];
            case "company":
              return [[placeholder.token, job.company ?? ""]];
            case "location":
              return [[placeholder.token, job.location ?? ""]];
            case "salary":
              return [[placeholder.token, job.salary ?? ""]];
            default:
              return [[placeholder.token, ""]];
          }
        }

        if (placeholder.bindingType === "PROFILE_FIELD") {
          switch (placeholder.sourceKey) {
            case "desiredRoles":
              return [[placeholder.token, profile?.desiredRoles.join(", ") ?? ""]];
            case "seniority":
              return [[placeholder.token, profile?.seniority ?? ""]];
            case "profileLocation":
              return [[placeholder.token, profile?.location ?? ""]];
            case "mustHaveSkills":
              return [[placeholder.token, profile?.mustHaveSkills.join(", ") ?? ""]];
            default:
              return [[placeholder.token, ""]];
          }
        }

        return [];
      })
    );
  }

  private selectGeneratedPlaceholders(
    placeholders: CvPlaceholderSchemaItem[],
    summaryOnly: boolean
  ): CvPlaceholderSchemaItem[] {
    const generated = placeholders.filter(
      (item) => item.bindingType === "GENERATED" || item.bindingType === "CUSTOM"
    );

    if (!summaryOnly) {
      return generated;
    }

    const summaryPlaceholders = generated.filter(
      (item) => item.bindingType === "GENERATED" && item.sourceKey === "summary"
    );

    return summaryPlaceholders.length > 0 ? summaryPlaceholders : generated;
  }

  private extractGoogleDocumentId(documentUrl: string): string {
    const trimmed = documentUrl.trim();
    const directIdMatch = trimmed.match(/^[a-zA-Z0-9_-]{20,}$/);
    if (directIdMatch) {
      return trimmed;
    }

    const urlMatch = trimmed.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }

    throw new BadRequestException("Invalid Google Docs URL");
  }
}
