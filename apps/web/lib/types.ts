/**
 * Shared types for the web application.
 * These types align with the API response DTOs.
 */

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "SNOOZED";
export type ApprovalStatusFilter = ApprovalStatus | "ALL";
export type ArtefactStatus = "DRAFT" | "APPROVED" | "REJECTED";

export interface Artefact {
  id: string;
  status: ArtefactStatus;
  content: string;
}

export interface Job {
  id: string;
  title: string;
  location: string | null;
  postedAt: string | null;
  approvalStatus: ApprovalStatus;
  latestArtefact: Artefact | null;
}

export interface JobListResponse {
  jobs: Job[];
  page: number;
  pageSize: number;
  total: number;
}

export interface JobDetailResponse {
  id: string;
  title: string;
  description: string;
  location: string | null;
  postedAt: string | null;
  artefacts: Artefact[];
}
