"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { approveJob, rejectJob, snoozeJob, getJobs, type JobListResponse } from "../lib/api";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Pagination } from "./pagination";
import { StatusFilter, type ApprovalStatus } from "./status-filter";

interface Job {
  id: string;
  title: string;
  location: string | null;
  approvalStatus: string;
  latestArtefact: { id: string; status: string; content: string } | null;
}

const PAGE_SIZE = 20;

export function ApprovalConsole(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract URL params
  const page = Number(searchParams.get("page")) || 1;
  const statusFilter = (searchParams.get("status") as ApprovalStatus) || "ALL";

  // State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch jobs when page or filter changes
  const fetchJobsData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const params: Parameters<typeof getJobs>[0] = {
        page,
        pageSize: PAGE_SIZE,
      };
      // Only pass status if not "ALL"
      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }
      const response: JobListResponse = await getJobs(params);
      setJobs(response.jobs);
      setTotal(response.total);
      // Select first job if none selected or selected job not in new list
      if (response.jobs.length > 0) {
        setSelectedJobId((currentSelectedId) => {
          const currentJobStillExists = response.jobs.some((j) => j.id === currentSelectedId);
          return currentJobStillExists ? currentSelectedId : response.jobs[0].id;
        });
      } else {
        setSelectedJobId(null);
      }
    } catch {
      setFetchError("Failed to load jobs");
      setJobs([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchJobsData();
  }, [fetchJobsData]);

  // Update URL helper
  const updateParams = useCallback(
    (updates: Record<string, string | number>): void => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === "" || value === "ALL" || (key === "page" && value === 1)) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });
      const queryString = params.toString();
      router.push(queryString ? `?${queryString}` : "/");
    },
    [router, searchParams]
  );

  const handlePageChange = (newPage: number): void => {
    updateParams({ page: newPage });
  };

  const handleStatusChange = (newStatus: ApprovalStatus): void => {
    // Reset to page 1 when changing filter
    updateParams({ status: newStatus, page: 1 });
  };

  const selectedJob = jobs.find((j) => j.id === selectedJobId);
  const actionsDisabled = isPending || !selectedJob;

  const handleAction = (action: "approve" | "reject" | "snooze"): void => {
    if (!selectedJob) return;

    const actionFn = { approve: approveJob, reject: rejectJob, snooze: snoozeJob }[action];
    const statusMap = { approve: "APPROVED", reject: "REJECTED", snooze: "SNOOZED" };

    startTransition(async () => {
      try {
        setError(null);
        await actionFn(selectedJob.id);
        setStatuses((prev) => ({ ...prev, [selectedJob.id]: statusMap[action] }));
      } catch {
        setError(`${action} failed`);
      }
    });
  };

  const getJobStatus = (job: Job): string => statuses[job.id] ?? job.approvalStatus;

  // Loading state
  if (isLoading) {
    return (
      <section className="flex gap-8">
        <Card className="w-80 p-4">
          <div className="flex items-center justify-center h-40">
            <span className="text-slate-500">Loading jobs...</span>
          </div>
        </Card>
        <Card className="flex-1 p-6">
          <div className="flex items-center justify-center h-40">
            <span className="text-slate-500">Loading...</span>
          </div>
        </Card>
      </section>
    );
  }

  // Fetch error state
  if (fetchError) {
    return (
      <section className="flex gap-8">
        <Card className="w-80 p-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-red-800">{fetchError}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-2"
              onClick={() => fetchJobsData()}
            >
              Retry
            </Button>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="flex gap-8">
      {/* Job List */}
      <Card className="w-80 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Jobs ({total})</h2>
        </div>
        <div className="mb-4">
          <StatusFilter value={statusFilter} onChange={handleStatusChange} />
        </div>
        {jobs.length === 0 ? (
          <p className="text-slate-500 text-center py-4">No jobs found</p>
        ) : (
          <>
            <ul className="space-y-2">
              {jobs.map((job) => (
                <li key={job.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedJobId(job.id)}
                    className={`w-full text-left p-3 rounded-md transition-colors ${
                      selectedJobId === job.id
                        ? "bg-slate-100 border-2 border-slate-300"
                        : "hover:bg-slate-50 border-2 border-transparent"
                    }`}
                  >
                    <div className="font-medium">{job.title}</div>
                    <div className="text-sm text-slate-600">{job.location ?? "Unknown"}</div>
                    <Badge className="mt-1">{getJobStatus(job)}</Badge>
                  </button>
                </li>
              ))}
            </ul>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </Card>

      {/* Artefact Panel */}
      <Card className="flex-1 p-6">
        <h2 className="text-lg font-semibold">Artefact</h2>
        {selectedJob ? (
          <>
            <h3 className="mt-4 font-medium text-slate-900">{selectedJob.title}</h3>
            <p className="mt-2 text-slate-700">
              {selectedJob.latestArtefact?.content ?? "No artefact yet"}
            </p>
            <div className="mt-6 flex gap-3">
              <Button type="button" disabled={actionsDisabled} onClick={() => handleAction("approve")}>
                Approve
              </Button>
              <Button type="button" variant="outline" disabled={actionsDisabled} onClick={() => handleAction("reject")}>
                Reject
              </Button>
              <Button type="button" variant="outline" disabled={actionsDisabled} onClick={() => handleAction("snooze")}>
                Snooze
              </Button>
            </div>
            {statuses[selectedJob.id] && (
              <Badge className="mt-4">Current: {statuses[selectedJob.id]}</Badge>
            )}
            {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
          </>
        ) : (
          <p className="mt-4 text-slate-500">Select a job to view details</p>
        )}
      </Card>
    </section>
  );
}
