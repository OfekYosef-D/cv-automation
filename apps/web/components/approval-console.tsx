"use client";

import { useState, useTransition } from "react";
import { approveJob, rejectJob, snoozeJob } from "../lib/api";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

interface ApprovalConsoleProps {
  job: {
    id: string;
    title: string;
    location: string | null;
  };
  artefact: { id: string; status: string; content: string } | null;
}

export function ApprovalConsole({ job, artefact }: ApprovalConsoleProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actionsDisabled = isPending;

  return (
    <section className="flex gap-8">
      <Card className="flex-1 p-6">
        <h2 className="text-lg font-semibold">Jobs</h2>
        <div className="mt-4">
          <div className="font-medium">{job.title}</div>
          <div className="text-sm text-slate-600">{job.location ?? "Unknown"}</div>
        </div>
      </Card>
      <Card className="flex-1 p-6">
        <h2 className="text-lg font-semibold">Artefacts</h2>
        <p className="mt-4 text-slate-700">{artefact?.content ?? "No artefact yet"}</p>
        <div className="mt-4 flex gap-3">
          <Button
            type="button"
            disabled={actionsDisabled}
            onClick={() =>
              startTransition(async () => {
                try {
                  setError(null);
                  await approveJob(job.id);
                  setStatus("APPROVED");
                } catch {
                  setError("Approval failed");
                }
              })
            }
          >
            Approve
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={actionsDisabled}
            onClick={() =>
              startTransition(async () => {
                try {
                  setError(null);
                  await rejectJob(job.id);
                  setStatus("REJECTED");
                } catch {
                  setError("Rejection failed");
                }
              })
            }
          >
            Reject
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={actionsDisabled}
            onClick={() =>
              startTransition(async () => {
                try {
                  setError(null);
                  await snoozeJob(job.id);
                  setStatus("SNOOZED");
                } catch {
                  setError("Snooze failed");
                }
              })
            }
          >
            Snooze
          </Button>
        </div>
        {status ? <Badge className="mt-3">Current: {status}</Badge> : null}
        {error ? <p className="mt-2 text-sm text-red-600" role="alert">{error}</p> : null}
      </Card>
    </section>
  );
}
