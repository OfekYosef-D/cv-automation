import type { JobDetailResponse, JobListResponse } from "./types";

export type { JobDetailResponse, JobListResponse };

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? "t1";

async function apiFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-tenant-id": TENANT_ID,
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export const getJobs = (params?: { status?: string; page?: number; pageSize?: number }): Promise<JobListResponse> => {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.page) search.set("page", String(params.page));
  if (params?.pageSize) search.set("pageSize", String(params.pageSize));
  search.set("sort", "seenAt");
  return apiFetch(`/jobs?${search.toString()}`);
};

export const getJobDetail = (jobId: string): Promise<JobDetailResponse> => apiFetch(`/jobs/${jobId}`);

export const approveJob = (jobId: string) =>
  apiFetch("/approvals/approve", { method: "POST", body: JSON.stringify({ jobId }) });

export const rejectJob = (jobId: string) =>
  apiFetch("/approvals/reject", { method: "POST", body: JSON.stringify({ jobId }) });

export const snoozeJob = (jobId: string) =>
  apiFetch("/approvals/snooze", { method: "POST", body: JSON.stringify({ jobId }) });
