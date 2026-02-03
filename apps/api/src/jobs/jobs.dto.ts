export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "SNOOZED";

export interface JobListItemDto {
  id: string;
  title: string;
  location: string | null;
  postedAt: string | null;
  latestArtefact: {
    id: string;
    status: "DRAFT" | "APPROVED" | "REJECTED";
    content: string;
  } | null;
  approvalStatus: ApprovalStatus;
}

export interface JobListResponseDto {
  jobs: JobListItemDto[];
  page: number;
  pageSize: number;
}

export interface JobListQueryDto {
  page?: number;
  pageSize?: number;
  sort?: "seenAt";
  status?: ApprovalStatus;
}

export interface JobDetailDto {
  id: string;
  title: string;
  description: string;
  location: string | null;
  postedAt: string | null;
  artefacts: Array<{
    id: string;
    status: "DRAFT" | "APPROVED" | "REJECTED";
    content: string;
  }>;
}
