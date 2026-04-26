import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "SNOOZED";

export interface JobListItemDto {
  id: string;
  title: string;
  company: string | null;
  salary: string | null;
  tags: string[];
  origin: "all" | "linkedin";
  sourceLabel: string | null;
  matchedQueryIds: string[];
  location: string | null;
  postedAt: string | null;
  latestArtefact: {
    id: string;
    cvVersionId: string;
    status: "DRAFT" | "APPROVED" | "REJECTED";
    content: string;
    documentUrl: string | null;
    documentTitle: string | null;
  } | null;
  approvalStatus: ApprovalStatus;
}

export interface JobListResponseDto {
  jobs: JobListItemDto[];
  page: number;
  pageSize: number;
  total: number;
}

export class JobListQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number;

  @IsOptional()
  @IsIn(["seenAt"])
  sort?: "seenAt";

  @IsOptional()
  @IsIn(["PENDING", "APPROVED", "REJECTED", "SNOOZED"])
  status?: ApprovalStatus;
}

export interface JobDetailDto {
  id: string;
  title: string;
  description: string;
  company: string | null;
  salary: string | null;
  tags: string[];
  origin: "all" | "linkedin";
  sourceLabel: string | null;
  matchedQueryIds: string[];
  location: string | null;
  url: string;
  postedAt: string | null;
  artefacts: Array<{
    id: string;
    cvVersionId: string;
    status: "DRAFT" | "APPROVED" | "REJECTED";
    content: string;
    documentUrl: string | null;
    documentTitle: string | null;
  }>;
}
