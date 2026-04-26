import type {
  ConnectCvTemplateRequest,
  CvTemplate,
  GenerateCvDraftRequest,
  GeneratedCvDraft,
  GoogleConnectionStartResponse,
  GoogleIntegrationStatus,
  JobAlert,
  JobAlertPreference,
  JobDetailResponse,
  JobListResponse,
  JobSearchPreviewResponse,
  JobSearchQuery,
  JobSearchQueryDraft,
  LivePullRequest,
  LivePullResponse,
  MatchScoreResponse,
  UpdateCvTemplatePlaceholdersRequest,
  UpdateGeneratedCvDraftRequest,
  UpsertProfileRequest,
  UserProfile
} from "./types";

export type { JobDetailResponse, JobListResponse, MatchScoreResponse };

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? "t1";

async function apiFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-tenant-id": TENANT_ID,
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new ApiError(response.status, `API error: ${response.status}`);
  }

  return response.json();
}

export const getJobs = (params?: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<JobListResponse> => {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.page) search.set("page", String(params.page));
  if (params?.pageSize) search.set("pageSize", String(params.pageSize));
  search.set("sort", "seenAt");
  return apiFetch(`/jobs?${search.toString()}`);
};

export const getJobDetail = (jobId: string): Promise<JobDetailResponse> => apiFetch(`/jobs/${jobId}`);

export const listSearchQueries = (): Promise<JobSearchQuery[]> => apiFetch("/jobs/search-queries");

export const createSearchQuery = (payload: JobSearchQueryDraft): Promise<JobSearchQuery> =>
  apiFetch("/jobs/search-queries", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const updateSearchQuery = (
  id: string,
  payload: Partial<JobSearchQueryDraft>
): Promise<{ ok: true }> =>
  apiFetch(`/jobs/search-queries/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });

export const deleteSearchQuery = (id: string): Promise<{ ok: true }> =>
  apiFetch(`/jobs/search-queries/${id}`, {
    method: "DELETE"
  });

export const previewSearchQuery = (payload: JobSearchQueryDraft): Promise<JobSearchPreviewResponse> =>
  apiFetch("/jobs/search-queries/preview", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const runSearchQuery = (id: string): Promise<{
  fetchedCount: number;
  savedCount: number;
  alertCount: number;
  jobs: JobSearchPreviewResponse["jobs"];
}> =>
  apiFetch(`/jobs/search-queries/${id}/run`, {
    method: "POST",
    body: JSON.stringify({})
  });

export const getAlerts = (): Promise<JobAlert[]> => apiFetch("/alerts");

export const getAlertPreferences = (): Promise<JobAlertPreference> =>
  apiFetch("/alerts/preferences");

export const updateAlertPreferences = (
  payload: JobAlertPreference
): Promise<JobAlertPreference> =>
  apiFetch("/alerts/preferences", {
    method: "PUT",
    body: JSON.stringify(payload)
  });

export const approveJob = (jobId: string) =>
  apiFetch("/approvals/approve", { method: "POST", body: JSON.stringify({ jobId }) });

export const rejectJob = (jobId: string) =>
  apiFetch("/approvals/reject", { method: "POST", body: JSON.stringify({ jobId }) });

export const snoozeJob = (jobId: string) =>
  apiFetch("/approvals/snooze", { method: "POST", body: JSON.stringify({ jobId }) });

export const getMatchScore = (jobId: string): Promise<MatchScoreResponse> =>
  apiFetch(`/matching/jobs/${jobId}`);

export const getProfile = (): Promise<UserProfile> => apiFetch("/profile");

export const upsertProfile = (payload: UpsertProfileRequest): Promise<UserProfile> =>
  apiFetch("/profile", {
    method: "PUT",
    body: JSON.stringify(payload)
  });

export const getGoogleIntegrationStatus = (): Promise<GoogleIntegrationStatus> =>
  apiFetch("/integrations/google/status");

export const startGoogleConnection = (): Promise<GoogleConnectionStartResponse> =>
  apiFetch("/integrations/google/connect/start", {
    method: "POST",
    body: JSON.stringify({})
  });

export const disconnectGoogleConnection = (): Promise<GoogleIntegrationStatus> =>
  apiFetch("/integrations/google/disconnect", {
    method: "POST",
    body: JSON.stringify({})
  });

export const getCvTemplate = (): Promise<CvTemplate> => apiFetch("/cv/template");

export const connectCvTemplate = (payload: ConnectCvTemplateRequest): Promise<CvTemplate> =>
  apiFetch("/cv/template/connect", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const updateCvTemplatePlaceholders = (
  payload: UpdateCvTemplatePlaceholdersRequest
): Promise<CvTemplate> =>
  apiFetch("/cv/template/placeholders", {
    method: "PUT",
    body: JSON.stringify(payload)
  });

export const generateCvDraft = (payload: GenerateCvDraftRequest): Promise<GeneratedCvDraft> =>
  apiFetch("/cv/generate", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const updateGeneratedCvDraft = (
  versionId: string,
  payload: UpdateGeneratedCvDraftRequest
): Promise<GeneratedCvDraft> =>
  apiFetch(`/cv/generated/${versionId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });

export const syncGeneratedCvDraft = (versionId: string): Promise<GeneratedCvDraft> =>
  apiFetch(`/cv/generated/${versionId}/sync`, {
    method: "POST",
    body: JSON.stringify({})
  });

export const pullLiveJobs = (payload: LivePullRequest): Promise<LivePullResponse> =>
  apiFetch("/jobs/live", {
    method: "POST",
    body: JSON.stringify(payload)
  });
