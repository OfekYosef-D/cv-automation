"use client";

import { useState, useTransition } from "react";
import { approveJob, rejectJob, snoozeJob } from "../lib/api";

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
    <section style={{ display: "flex", gap: "2rem" }}>
      <div style={{ flex: 1 }}>
        <h2>Jobs</h2>
        <ul>
          <li>
            <strong>{job.title}</strong>
            <div>{job.location ?? "Unknown"}</div>
          </li>
        </ul>
      </div>
      <div style={{ flex: 1 }}>
        <h2>Artefacts</h2>
        <p>{artefact?.content ?? "No artefact yet"}</p>
        <div>
          <button
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
          </button>
          <button
            type="button"
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
          </button>
          <button
            type="button"
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
          </button>
          {status ? <div>Current: {status}</div> : null}
          {error ? <div role="alert">{error}</div> : null}
        </div>
      </div>
    </section>
  );
}
