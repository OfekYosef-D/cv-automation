import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import { beforeEach, describe, expect, it, vi } from "vitest";

expect.extend(matchers);

import { JobDetailPanel } from "../components/job-detail-panel";
import * as api from "../lib/api";
import type { CvTemplate, GeneratedCvDraft, JobDetailResponse } from "../lib/types";

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    getJobDetail: vi.fn(),
    getMatchScore: vi.fn()
  };
});

const mockGetJobDetail = vi.mocked(api.getJobDetail);
const mockGetMatchScore = vi.mocked(api.getMatchScore);

const baseTemplate: CvTemplate = {
  id: "cv-1",
  title: "Base CV",
  sourceType: "GOOGLE_DOCS",
  templateMode: "PLACEHOLDERS",
  documentId: "base-doc-123",
  documentUrl: "https://docs.google.com/document/d/base-doc-123/edit",
  documentTitle: "Base CV",
  placeholders: [
    {
      token: "JOB_TITLE",
      bindingType: "JOB_FIELD",
      sourceKey: "title",
      instructions: null
    },
    {
      token: "SUMMARY",
      bindingType: "GENERATED",
      sourceKey: "summary",
      instructions: "Tailor the summary."
    }
  ],
  lastSyncedAt: "2026-03-22T00:00:00Z",
  latestBaseVersion: {
    id: "base-version-1",
    kind: "BASE",
    label: "Base",
    jobId: null,
    content: "Base CV content",
    externalDocumentId: "base-doc-123",
    externalDocumentUrl: "https://docs.google.com/document/d/base-doc-123/edit",
    externalDocumentTitle: "Base CV",
    createdAt: "2026-03-22T00:00:00Z"
  }
};

const generatedDraft: GeneratedCvDraft = {
  versionId: "draft-1",
  jobId: "job-1",
  fieldValues: {
    JOB_TITLE: "Senior Fullstack Developer",
    SUMMARY: "Draft summary"
  },
  previewState: {
    JOB_TITLE: "Senior Fullstack Developer",
    SUMMARY: "Draft summary"
  },
  copiedDocumentUrl: "https://docs.google.com/document/d/copied-doc-123/edit",
  copiedDocumentTitle: "Tailored CV",
  syncStatus: "synced",
  createdAt: "2026-03-22T00:05:00Z"
};

const jobDetail: JobDetailResponse = {
  id: "job-1",
  title: "Senior Fullstack Developer",
  description:
    "We are looking for an experienced developer to join our team.\n\nResponsibilities:\n- Build modern web applications",
  company: "OpenAI",
  salary: "$120,000 - $150,000",
  tags: ["react", "nestjs", "ai"],
  origin: "linkedin",
  sourceLabel: "SerpApi",
  matchedQueryIds: ["query-1"],
  location: "Tel Aviv, Israel",
  url: "https://company.com/careers/fullstack",
  postedAt: "2026-01-15T10:00:00Z",
  artefacts: [
    {
      id: "art-1",
      cvVersionId: "cv-version-1",
      status: "DRAFT" as const,
      content: "AI-generated summary of the job",
      documentUrl: null,
      documentTitle: null
    }
  ]
};

describe("JobDetailPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetJobDetail.mockResolvedValue(jobDetail);
    mockGetMatchScore.mockResolvedValue({
      score: 75,
      explanations: ["role match", "seniority match", "location match"],
      job: { id: "job-1", title: "Senior Fullstack Developer" }
    });
  });

  it("shows placeholder when no job is selected", () => {
    render(
      <JobDetailPanel
        jobId={null}
        approvalStatus="PENDING"
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onSnooze={vi.fn()}
        isPending={false}
        actionError={null}
      />
    );

    expect(screen.getByText("Select a job to view details")).toBeInTheDocument();
  });

  it("suppresses match score calls when profile is not configured", async () => {
    render(
      <JobDetailPanel
        jobId="job-1"
        approvalStatus="PENDING"
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onSnooze={vi.fn()}
        isPending={false}
        actionError={null}
        profileConfigured={false}
      />
    );

    expect(await screen.findByText("Senior Fullstack Developer")).toBeInTheDocument();
    expect(mockGetMatchScore).not.toHaveBeenCalled();
    expect(
      screen.getByText("Configure your profile to see match scores.")
    ).toBeInTheDocument();
  });

  it("renders the tailored draft editor and draft actions", async () => {
    const onDraftFieldChange = vi.fn();
    const onSaveDraft = vi.fn();
    const onSyncDraft = vi.fn();

    render(
      <JobDetailPanel
        jobId="job-1"
        approvalStatus="PENDING"
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onSnooze={vi.fn()}
        isPending={false}
        actionError={null}
        template={baseTemplate}
        generatedDraft={generatedDraft}
        onDraftFieldChange={onDraftFieldChange}
        onSaveDraft={onSaveDraft}
        onSyncDraft={onSyncDraft}
      />
    );

    expect(await screen.findByLabelText("Summary")).toHaveValue("Draft summary");
    expect(screen.queryByLabelText("Job Title")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Summary"), {
      target: { value: "Edited summary" }
    });

    expect(onDraftFieldChange).toHaveBeenCalledWith("SUMMARY", "Edited summary");

    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    expect(onSaveDraft).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Sync to Google Doc" }));
    expect(onSyncDraft).toHaveBeenCalledTimes(1);

    expect(screen.getByRole("link", { name: "Open Synced CV" })).toHaveAttribute(
      "href",
      "https://docs.google.com/document/d/copied-doc-123/edit"
    );
  });

  it("renders action buttons that call handlers when clicked", async () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    const onSnooze = vi.fn();

    render(
      <JobDetailPanel
        jobId="job-1"
        approvalStatus="PENDING"
        onApprove={onApprove}
        onReject={onReject}
        onSnooze={onSnooze}
        isPending={false}
        actionError={null}
      />
    );

    await waitFor(() => {
      expect(mockGetJobDetail).toHaveBeenCalledWith("job-1");
    });

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    fireEvent.click(screen.getByRole("button", { name: "Snooze" }));

    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(onSnooze).toHaveBeenCalledTimes(1);
  });
});
