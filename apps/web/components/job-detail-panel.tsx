"use client";

import { useState, useEffect, useRef, useCallback, type ReactElement } from "react";
import { ApiError, getJobDetail, getMatchScore } from "@/lib/api";
import type {
  ApprovalStatus,
  Artefact,
  CvTemplate,
  GeneratedCvDraft,
  JobDetailResponse
} from "@/lib/types";
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
  profileConfigured?: boolean;
  template?: CvTemplate | null;
  generatedDraft?: GeneratedCvDraft | null;
  onGenerateDraft?: () => void;
  onDraftFieldChange?: (token: string, value: string) => void;
  onSaveDraft?: () => void;
  onSyncDraft?: () => void;
  isGeneratingDraft?: boolean;
  isSavingDraft?: boolean;
  isSyncingDraft?: boolean;
  draftError?: string | null;
  draftSuccess?: string | null;
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

function formatDateTime(dateString: string | null): string {
  if (!dateString) return "Unknown";
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function humanizeToken(token: string): string {
  return token
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getEditableDraftTokens(template: CvTemplate | null): string[] {
  if (!template) {
    return [];
  }

  const generatedPlaceholders = template.placeholders.filter(
    (placeholder) =>
      placeholder.bindingType === "GENERATED" || placeholder.bindingType === "CUSTOM"
  );
  const summaryPlaceholders = generatedPlaceholders.filter(
    (placeholder) =>
      placeholder.bindingType === "GENERATED" && placeholder.sourceKey === "summary"
  );

  return (summaryPlaceholders.length > 0 ? summaryPlaceholders : generatedPlaceholders).map(
    (placeholder) => placeholder.token
  );
}

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
    <div
      className="space-y-6 animate-in fade-in duration-300"
      data-testid="job-detail-skeleton"
    >
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

      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <MatchScoreSkeleton />
      </div>

      <Separator />

      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-full" />
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
  actionError,
  profileConfigured = true,
  template = null,
  generatedDraft = null,
  onGenerateDraft = () => undefined,
  onDraftFieldChange = () => undefined,
  onSaveDraft = () => undefined,
  onSyncDraft = () => undefined,
  isGeneratingDraft = false,
  isSavingDraft = false,
  isSyncingDraft = false,
  draftError = null,
  draftSuccess = null
}: JobDetailPanelProps): ReactElement {
  const [jobDetail, setJobDetail] = useState<JobDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [matchExplanations, setMatchExplanations] = useState<string[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [noProfile, setNoProfile] = useState(!profileConfigured);
  const requestIdRef = useRef(0);

  const fetchJobDetail = useCallback(
    async (id: string) => {
      const currentRequestId = ++requestIdRef.current;

      setIsLoading(true);
      setFetchError(null);
      setMatchLoading(profileConfigured);
      setMatchError(null);
      setNoProfile(!profileConfigured);
      setMatchScore(null);
      setMatchExplanations([]);

      try {
        const detailPromise = getJobDetail(id);

        if (!profileConfigured) {
          const detail = await detailPromise;
          if (currentRequestId === requestIdRef.current) {
            setJobDetail(detail);
          }
          return;
        }

        const [detail, scoreResult] = await Promise.allSettled([
          detailPromise,
          getMatchScore(id)
        ]);

        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        if (detail.status === "fulfilled") {
          setJobDetail(detail.value);
        } else {
          setFetchError("Failed to load job details");
        }

        if (scoreResult.status === "fulfilled") {
          setMatchScore(scoreResult.value.score);
          setMatchExplanations(scoreResult.value.explanations);
        } else if (
          scoreResult.reason instanceof ApiError &&
          scoreResult.reason.status === 400
        ) {
          setNoProfile(true);
        } else {
          setMatchError("Failed to load match score");
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
    },
    [profileConfigured]
  );

  useEffect(() => {
    if (jobId) {
      void fetchJobDetail(jobId);
    } else {
      setJobDetail(null);
      setMatchScore(null);
      setMatchExplanations([]);
      setMatchError(null);
      setNoProfile(!profileConfigured);
    }

    return () => {
      requestIdRef.current++;
    };
  }, [jobId, fetchJobDetail, profileConfigured]);

  if (!jobId) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <p className="text-muted-foreground">Select a job to view details</p>
      </div>
    );
  }

  if (isLoading) {
    return <JobDetailSkeleton />;
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
        <p className="text-destructive">{fetchError}</p>
        <Button
          variant="outline"
          onClick={() => {
            void fetchJobDetail(jobId);
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!jobDetail) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <p className="text-muted-foreground">No job details available</p>
      </div>
    );
  }

  const latestArtefact: Artefact | null = jobDetail.artefacts[0] ?? null;
  const actionsDisabled = isPending;
  const selectedDraft = generatedDraft?.jobId === jobId ? generatedDraft : null;
  const editableDraftTokens = new Set(getEditableDraftTokens(template));
  const editableDraftFields = selectedDraft
    ? Object.entries(selectedDraft.fieldValues).filter(([token]) => editableDraftTokens.has(token))
    : [];
  const latestSummary =
    selectedDraft?.fieldValues.SUMMARY ??
    selectedDraft?.fieldValues.HEADLINE ??
    latestArtefact?.content ??
    null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {jobDetail.company && (
            <Badge className="border border-slate-200 bg-white text-slate-700">
              {jobDetail.company}
            </Badge>
          )}
          {jobDetail.location && (
            <Badge className="flex items-center gap-1 bg-slate-100 text-slate-700">
              <MapPinIcon className="opacity-70" />
              {jobDetail.location}
            </Badge>
          )}
          {jobDetail.salary && (
            <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700">
              {jobDetail.salary}
            </Badge>
          )}
          <Badge className="border border-slate-200 bg-white text-slate-700">
            {jobDetail.origin === "linkedin" ? "LinkedIn" : "All sources"}
          </Badge>
          {jobDetail.sourceLabel ? (
            <Badge className="border border-slate-200 bg-white text-slate-700">
              {jobDetail.sourceLabel}
            </Badge>
          ) : null}
          {jobDetail.matchedQueryIds.length > 0 ? (
            <Badge className="border border-slate-200 bg-white text-slate-700">
              {jobDetail.matchedQueryIds.length} matched
            </Badge>
          ) : null}
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

        <h2 className="text-2xl font-semibold tracking-tight">{jobDetail.title}</h2>

        {jobDetail.postedAt && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <CalendarIcon className="opacity-70" />
            Posted {formatDate(jobDetail.postedAt)}
          </p>
        )}

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

      <MatchScoreDisplay
        score={matchScore}
        explanations={matchExplanations}
        isLoading={matchLoading}
        error={matchError}
        noProfile={noProfile}
      />

      <Separator />

      <div className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Description
        </h3>
        {jobDetail.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {jobDetail.tags.map((tag) => (
              <Badge
                key={tag}
                className="border-slate-200 bg-slate-50 text-slate-600"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
        <div className="max-h-[300px] overflow-y-auto pr-2">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {jobDetail.description ? stripHtml(jobDetail.description) : "No description available"}
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          AI-Generated Summary
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {latestSummary ?? "No AI summary generated yet"}
        </p>
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Tailored CV Draft
        </h3>
        {!template ? (
          <p className="text-sm text-muted-foreground">
            Connect Google and attach a placeholder-based CV template to generate a tailored draft.
          </p>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900">
                Template: {template.documentTitle ?? template.title}
              </p>
              <p className="text-xs text-slate-600">
                Latest template sync: {formatDateTime(template.lastSyncedAt)}
              </p>
            </div>

            {!selectedDraft ? (
              <>
                <p className="text-sm text-slate-600">
                  Generate an in-app draft first. Only the summary gets rewritten so the rest of
                  your base CV stays untouched before you sync a copied Google Doc.
                </p>
                <Button
                  type="button"
                  className="w-full"
                  onClick={onGenerateDraft}
                  disabled={isGeneratingDraft}
                >
                  {isGeneratingDraft ? "Generating..." : "Generate Draft"}
                </Button>
              </>
            ) : (
              <>
                {editableDraftFields.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    This template does not expose a summary placeholder to edit in app.
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {editableDraftFields.map(([token, value]) => (
                      <label key={token} className="grid gap-1 text-sm">
                        <span className="font-medium text-slate-800">{humanizeToken(token)}</span>
                        <textarea
                          aria-label={humanizeToken(token)}
                          value={value}
                          onChange={(event) => onDraftFieldChange(token, event.target.value)}
                          className="min-h-24 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                        />
                      </label>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onSaveDraft}
                    disabled={isSavingDraft}
                  >
                    {isSavingDraft ? "Saving..." : "Save Draft"}
                  </Button>
                  <Button
                    type="button"
                    onClick={onSyncDraft}
                    disabled={isSyncingDraft}
                  >
                    {isSyncingDraft ? "Syncing..." : "Sync to Google Doc"}
                  </Button>
                  {selectedDraft.copiedDocumentUrl ? (
                    <a
                      href={selectedDraft.copiedDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm font-medium text-slate-900 underline underline-offset-4"
                    >
                      Open Synced CV
                    </a>
                  ) : null}
                </div>
                <p className="text-xs text-slate-600">
                  Sync status: {selectedDraft.syncStatus}. Placeholder replacement preserves the
                  original template layout and styling.
                </p>
              </>
            )}
          </div>
        )}
        {draftSuccess ? (
          <p className="text-sm text-emerald-700" role="status">
            {draftSuccess}
          </p>
        ) : null}
        {draftError ? (
          <p className="text-sm text-destructive" role="alert">
            {draftError}
          </p>
        ) : null}
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Decision
        </h3>
        <div className="flex gap-3">
          <Button type="button" disabled={actionsDisabled} onClick={onApprove} className="flex-1">
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
