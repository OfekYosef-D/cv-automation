export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "SNOOZED";
export type ApprovalStatusFilter = ApprovalStatus | "ALL";
export type ArtefactStatus = "DRAFT" | "APPROVED" | "REJECTED";
export type JobSearchProvider = "serpapi" | "jsearch";
export type JobSearchSourceOrigin = "all" | "linkedin";
export type JobAlertChannel = "EMAIL";
export type JobAlertStatus = "PENDING" | "SENT" | "FAILED";

export type CvPlaceholderBindingType =
  | "JOB_FIELD"
  | "PROFILE_FIELD"
  | "GENERATED"
  | "CUSTOM";

export type CvPlaceholderSourceKey =
  | "title"
  | "company"
  | "location"
  | "salary"
  | "desiredRoles"
  | "seniority"
  | "profileLocation"
  | "mustHaveSkills"
  | "headline"
  | "summary"
  | "skillsBlock"
  | "experienceBullets"
  | "custom";

export interface Artefact {
  id: string;
  cvVersionId: string;
  status: ArtefactStatus;
  content: string;
  documentUrl: string | null;
  documentTitle: string | null;
}

export interface Job {
  id: string;
  title: string;
  company: string | null;
  salary: string | null;
  tags: string[];
  origin: JobSearchSourceOrigin;
  sourceLabel: string | null;
  matchedQueryIds: string[];
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
  company: string | null;
  salary: string | null;
  tags: string[];
  origin: JobSearchSourceOrigin;
  sourceLabel: string | null;
  matchedQueryIds: string[];
  location: string | null;
  url: string;
  postedAt: string | null;
  artefacts: Artefact[];
}

export interface JobSearchQuery {
  id: string;
  provider: JobSearchProvider;
  query: string;
  location: string | null;
  seniority: string | null;
  sourceOrigin: JobSearchSourceOrigin;
  includeKeywords: string[];
  excludeKeywords: string[];
  relatedTitles: boolean;
  postedWithinHours: number | null;
  maxResultsPerRun: number;
  minMatchScore: number | null;
  cadenceSeconds: number;
  enabled: boolean;
  lastRunAt: string | null;
  lastCompletedAt: string | null;
  lastNewJobsCount: number;
  lastAlertedCount: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobSearchQueryDraft {
  provider: JobSearchProvider;
  query: string;
  location?: string;
  seniority?: string;
  sourceOrigin?: JobSearchSourceOrigin;
  includeKeywords?: string[];
  excludeKeywords?: string[];
  relatedTitles?: boolean;
  postedWithinHours?: number | null;
  maxResultsPerRun?: number;
  minMatchScore?: number | null;
  cadenceSeconds?: number;
  enabled?: boolean;
}

export interface JobSearchPreviewJob {
  id: string | null;
  externalId: string;
  title: string;
  description: string;
  company: string | null;
  salary: string | null;
  tags: string[];
  location: string | null;
  url: string;
  postedAt: string | null;
  contentHash: string;
  origin: JobSearchSourceOrigin;
  sourceLabel: string;
  matchedQueryIds: string[];
  matchScore: number | null;
  matchExplanations: string[];
}

export interface JobSearchPreviewResponse {
  jobs: JobSearchPreviewJob[];
}

export interface JobAlertPreference {
  emailEnabled: boolean;
  emailAddress: string | null;
  immediateAlerts: boolean;
  minMatchScore: number | null;
  cooldownSeconds: number;
}

export interface JobAlert {
  id: string;
  channel: JobAlertChannel;
  status: JobAlertStatus;
  deliveryError: string | null;
  sentAt: string | null;
  createdAt: string;
  jobSearchQueryId: string;
  job: {
    id: string;
    title: string;
    company: string | null;
    location: string | null;
    url: string;
  };
}

export interface MatchScoreResponse {
  score: number;
  explanations: string[];
  job: { id: string; title: string };
}

export interface UserProfile {
  id: string;
  desiredRoles: string[];
  seniority: "junior" | "mid" | "senior";
  location: string;
  mustHaveSkills: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UpsertProfileRequest {
  desiredRoles: string[];
  seniority: "junior" | "mid" | "senior";
  location: string;
  mustHaveSkills: string[];
}

export interface LivePullRequest {
  provider: JobSearchProvider;
  query: string;
  location?: string;
  seniority?: string;
  sourceOrigin?: JobSearchSourceOrigin;
  includeKeywords?: string[];
  excludeKeywords?: string[];
  relatedTitles?: boolean;
  postedWithinHours?: number;
  maxResultsPerRun?: number;
  minMatchScore?: number;
  useProfile?: boolean;
}

export interface LivePullResponse {
  jobs: JobSearchPreviewJob[];
}

export interface CvVersion {
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

export interface CvPlaceholder {
  token: string;
  bindingType: CvPlaceholderBindingType;
  sourceKey: CvPlaceholderSourceKey;
  instructions: string | null;
}

export interface CvTemplate {
  id: string;
  title: string;
  sourceType: "MANUAL" | "GOOGLE_DOCS";
  templateMode: "PLACEHOLDERS" | null;
  documentId: string | null;
  documentUrl: string | null;
  documentTitle: string | null;
  placeholders: CvPlaceholder[];
  lastSyncedAt: string | null;
  latestBaseVersion: CvVersion | null;
}

export interface ConnectCvTemplateRequest {
  documentUrl: string;
}

export interface UpdateCvTemplatePlaceholdersRequest {
  placeholders: CvPlaceholder[];
}

export interface GenerateCvDraftRequest {
  jobId: string;
  summaryOnly?: boolean;
}

export interface UpdateGeneratedCvDraftRequest {
  fieldValues: Record<string, string>;
}

export interface GeneratedCvDraft {
  versionId: string;
  jobId: string;
  fieldValues: Record<string, string>;
  previewState: Record<string, string>;
  copiedDocumentUrl: string | null;
  copiedDocumentTitle: string | null;
  syncStatus: "draft" | "synced";
  createdAt: string;
}

export interface GoogleIntegrationStatus {
  connected: boolean;
  email: string | null;
  expiresAt: string | null;
  scopes: string[];
}

export interface GoogleConnectionStartResponse {
  url: string;
}
