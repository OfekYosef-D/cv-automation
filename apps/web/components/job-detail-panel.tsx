"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getJobDetail, getMatchScore } from "@/lib/api";
import type { JobDetailResponse, Artefact, ApprovalStatus } from "@/lib/types";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";
import { MatchScoreDisplay, MatchScoreSkeleton } from "./match-score";
import { cn } from "@/lib/utils";

interface JobDetailPanelProps {
  jobId: string | null;
  approvalStatus: ApprovalStatus;
  onApprove: () => void;
  onReject: () => void;
  onSnooze: () => void;
  isPending: boolean;
  actionError: string | null;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

/**
 * Strip HTML tags and decode entities from text.
 * Defensive measure for descriptions that may contain HTML.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function JobDetailSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-32 mt-2" />
      </div>

      <Separator />

      {/* Match score skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <MatchScoreSkeleton />
      </div>

      <Separator />

      {/* Description skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      <Separator />

      {/* Artefact skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

export function JobDetailPanel({
  jobId,
  approvalStatus,
  onApprove,
  onReject,
  onSnooze,
  isPending,
  actionError
}: JobDetailPanelProps) {
  const [jobDetail, setJobDetail] = useState<JobDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Match score state
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [matchExplanations, setMatchExplanations] = useState<string[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [noProfile, setNoProfile] = useState(false);

  // Request ID guard to prevent race conditions
  const requestIdRef = useRef(0);

  const fetchJobDetail = useCallback(async (id: string) => {
    const currentRequestId = ++requestIdRef.current;

    setIsLoading(true);
    setFetchError(null);
    setMatchLoading(true);
    setMatchError(null);
    setNoProfile(false);
    setMatchScore(null);
    setMatchExplanations([]);

    try {
      // Fetch job detail and match score in parallel
      const [detail, scoreResult] = await Promise.allSettled([
        getJobDetail(id),
        getMatchScore(id)
      ]);

      // Only update state if this is still the latest request
      if (currentRequestId === requestIdRef.current) {
        // Handle job detail result
        if (detail.status === "fulfilled") {
          setJobDetail(detail.value);
        } else {
          setFetchError("Failed to load job details");
        }

        // Handle match score result
        if (scoreResult.status === "fulfilled") {
          setMatchScore(scoreResult.value.score);
          setMatchExplanations(scoreResult.value.explanations);
        } else {
          // Check if it's a 400 error (no profile configured)
          const errorMessage = scoreResult.reason?.message ?? "";
          if (errorMessage.includes("400")) {
            setNoProfile(true);
          } else {
            setMatchError("Failed to load match score");
          }
        }
      }
    } catch {
      if (currentRequestId === requestIdRef.current) {
        setFetchError("Failed to load job details");
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
        setMatchLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (jobId) {
      fetchJobDetail(jobId);
    } else {
      setJobDetail(null);
      setMatchScore(null);
      setMatchExplanations([]);
      setMatchError(null);
      setNoProfile(false);
    }

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally incrementing ref to cancel stale requests
      requestIdRef.current++;
    };
  }, [jobId, fetchJobDetail]);

  // No job selected
  if (!jobId) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <p className="text-muted-foreground">Select a job to view details</p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return <JobDetailSkeleton />;
  }

  // Error state
  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
        <p className="text-destructive">{fetchError}</p>
        <Button variant="outline" onClick={() => fetchJobDetail(jobId)}>
          Retry
        </Button>
      </div>
    );
  }

  // No detail loaded
  if (!jobDetail) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <p className="text-muted-foreground">No job details available</p>
      </div>
    );
  }

  const latestArtefact: Artefact | null = jobDetail.artefacts[0] ?? null;
  const actionsDisabled = isPending;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Section */}
      <div className="space-y-3">
        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {jobDetail.location && (
            <Badge className="flex items-center gap-1 bg-slate-100 text-slate-700">
              <MapPinIcon className="opacity-70" />
              {jobDetail.location}
            </Badge>
          )}
          <Badge
            className={cn(
              "border",
              approvalStatus === "APPROVED" && "border-green-500 bg-green-50 text-green-700",
              approvalStatus === "REJECTED" && "border-red-500 bg-red-50 text-red-700",
              approvalStatus === "SNOOZED" && "border-yellow-500 bg-yellow-50 text-yellow-700",
              approvalStatus === "PENDING" && "border-slate-300 bg-slate-50 text-slate-700"
            )}
          >
            {approvalStatus}
          </Badge>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-semibold tracking-tight">
          {jobDetail.title}
        </h2>

        {/* Posted Date */}
        {jobDetail.postedAt && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <CalendarIcon className="opacity-70" />
            Posted {formatDate(jobDetail.postedAt)}
          </p>
        )}

        {/* Apply Button */}
        <div className="pt-2">
          <a
            href={jobDetail.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Apply Now
            <ExternalLinkIcon />
          </a>
        </div>
      </div>

      <Separator />

      {/* Match Score Section */}
      <MatchScoreDisplay
        score={matchScore}
        explanations={matchExplanations}
        isLoading={matchLoading}
        error={matchError}
        noProfile={noProfile}
      />

      <Separator />

      {/* Description Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Description
        </h3>
        <div className="max-h-[300px] overflow-y-auto pr-2">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {jobDetail.description ? stripHtml(jobDetail.description) : "No description available"}
          </p>
        </div>
      </div>

      <Separator />

      {/* AI Summary Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          AI-Generated Summary
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {latestArtefact?.content ?? "No AI summary generated yet"}
        </p>
      </div>

      <Separator />

      {/* Action Buttons */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Decision
        </h3>
        <div className="flex gap-3">
          <Button
            type="button"
            disabled={actionsDisabled}
            onClick={onApprove}
            className="flex-1"
          >
            Approve
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={actionsDisabled}
            onClick={onReject}
            className="flex-1"
          >
            Reject
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={actionsDisabled}
            onClick={onSnooze}
            className="flex-1"
          >
            Snooze
          </Button>
        </div>
        {actionError && (
          <p className="text-sm text-destructive" role="alert">
            {actionError}
          </p>
        )}
      </div>
    </div>
  );
}
