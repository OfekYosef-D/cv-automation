import { Type } from "class-transformer";
import {
  IsBoolean,
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  ValidateNested
} from "class-validator";

import {
  CV_PLACEHOLDER_BINDING_TYPES,
  CV_PLACEHOLDER_SOURCE_KEYS,
  type CvPlaceholderSchemaItem
} from "./cv.types";

export interface CvVersionResponseDto {
  id: string;
  kind: "BASE" | "GENERATED";
  label: string | null;
  jobId: string | null;
  content: string;
  externalDocumentId: string | null;
  externalDocumentUrl: string | null;
  externalDocumentTitle: string | null;
  createdAt: string;
}

export interface CvTemplateResponseDto {
  id: string;
  title: string;
  sourceType: "MANUAL" | "GOOGLE_DOCS";
  templateMode: "PLACEHOLDERS" | null;
  documentId: string | null;
  documentUrl: string | null;
  documentTitle: string | null;
  placeholders: CvPlaceholderSchemaItem[];
  lastSyncedAt: string | null;
  latestBaseVersion: CvVersionResponseDto | null;
}

export interface GeneratedCvDraftResponseDto {
  versionId: string;
  jobId: string;
  fieldValues: Record<string, string>;
  previewState: Record<string, string>;
  copiedDocumentUrl: string | null;
  copiedDocumentTitle: string | null;
  syncStatus: "draft" | "synced";
  createdAt: string;
}

export class CvPlaceholderDto {
  @IsString()
  @Matches(/^[A-Z0-9_]+$/)
  token!: string;

  @IsEnum(CV_PLACEHOLDER_BINDING_TYPES)
  bindingType!: CvPlaceholderSchemaItem["bindingType"];

  @IsEnum(CV_PLACEHOLDER_SOURCE_KEYS)
  sourceKey!: CvPlaceholderSchemaItem["sourceKey"];

  @IsOptional()
  @IsString()
  instructions?: string | null;
}

export class ConnectCvTemplateDto {
  @IsString()
  documentUrl!: string;

  @IsOptional()
  @IsString()
  title?: string;
}

export class UpdateCvTemplatePlaceholdersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CvPlaceholderDto)
  placeholders!: CvPlaceholderDto[];
}

export class GenerateCvDto {
  @IsString()
  jobId!: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  summaryOnly?: boolean;
}

export class UpdateGeneratedCvDraftDto {
  @IsObject()
  fieldValues!: Record<string, string>;
}
