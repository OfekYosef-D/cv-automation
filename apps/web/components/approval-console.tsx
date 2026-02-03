"use client";

import { useState, useTransition } from "react";
import { approveJob, rejectJob, snoozeJob } from "../lib/api";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

interface Job {
  id: string;
  title: string;
  location: string | null;
  approvalStatus: string;
  latestArtefact: { id: string; status: string; content: string } | null;
}

interface ApprovalConsoleProps {
  jobs: Job[];
}

export function ApprovalConsole({ jobs }: ApprovalConsoleProps) {
  const [selectedJobId, setSelectedJobId] = useState(jobs[0]?.id ?? null);
  const [isPending, startTransition] = useTransition();
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const selectedJob = jobs.find((j) => j.id === selectedJobId);
  const actionsDisabled = isPending || !selectedJob;

  const handleAction = (action: "approve" | "reject" | "snooze") => {
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

  const getJobStatus = (job: Job) => statuses[job.id] ?? job.approvalStatus;

  return (
    <section className="flex gap-8">
      {/* Job List */}
      <Card className="w-80 p-4">
        <h2 className="text-lg font-semibold mb-4">Jobs ({jobs.length})</h2>
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
