import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import { beforeEach, describe, expect, it, vi } from "vitest";

expect.extend(matchers);

import { ApprovalConsole } from "../components/approval-console";
import * as api from "../lib/api";
import { ApiError } from "../lib/api";
import type {
  CvTemplate,
  GeneratedCvDraft,
  GoogleIntegrationStatus,
  JobDetailResponse,
  JobListResponse,
  JobAlert,
  JobAlertPreference,
  JobSearchQuery,
  UserProfile
} from "../lib/types";

const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    getJobs: vi.fn(),
    getJobDetail: vi.fn(),
    getMatchScore: vi.fn(),
    getProfile: vi.fn(),
    upsertProfile: vi.fn(),
    getGoogleIntegrationStatus: vi.fn(),
    startGoogleConnection: vi.fn(),
    disconnectGoogleConnection: vi.fn(),
    getCvTemplate: vi.fn(),
    connectCvTemplate: vi.fn(),
    updateCvTemplatePlaceholders: vi.fn(),
    generateCvDraft: vi.fn(),
    updateGeneratedCvDraft: vi.fn(),
    syncGeneratedCvDraft: vi.fn(),
    approveJob: vi.fn(),
    rejectJob: vi.fn(),
    snoozeJob: vi.fn(),
    listSearchQueries: vi.fn(),
    createSearchQuery: vi.fn(),
    updateSearchQuery: vi.fn(),
    deleteSearchQuery: vi.fn(),
    previewSearchQuery: vi.fn(),
    runSearchQuery: vi.fn(),
    getAlerts: vi.fn(),
    getAlertPreferences: vi.fn(),
    updateAlertPreferences: vi.fn()
  };
});

const baseJobsResponse: JobListResponse = {
  jobs: [
    {
      id: "job-1",
      title: "Fullstack Developer",
      company: "OpenAI",
      salary: "$120,000 - $150,000",
      tags: ["react", "nestjs", "ai"],
      origin: "linkedin",
      sourceLabel: "SerpApi",
      matchedQueryIds: ["query-1"],
      location: "Remote",
      postedAt: "2026-03-21T09:00:00Z",
      approvalStatus: "PENDING",
      latestArtefact: {
        id: "art-1",
        cvVersionId: "draft-0",
        status: "DRAFT",
        content: "Existing artefact summary",
        documentUrl: null,
        documentTitle: null
      }
    }
  ],
  page: 1,
  pageSize: 20,
  total: 1
};

const baseJobDetail: JobDetailResponse = {
  id: "job-1",
  title: "Fullstack Developer",
  description: "Build web apps with React and NestJS",
  company: "OpenAI",
  salary: "$120,000 - $150,000",
  tags: ["react", "nestjs", "ai"],
  origin: "linkedin",
  sourceLabel: "SerpApi",
  matchedQueryIds: ["query-1"],
  location: "Remote",
  url: "https://example.com/jobs/fullstack",
  postedAt: "2026-03-21T09:00:00Z",
  artefacts: [
    {
      id: "art-1",
      cvVersionId: "draft-0",
      status: "DRAFT",
      content: "Existing artefact summary",
      documentUrl: null,
      documentTitle: null
    }
  ]
};

const baseProfile: UserProfile = {
  id: "profile-1",
  desiredRoles: ["fullstack developer"],
  seniority: "junior",
  location: "Israel",
  mustHaveSkills: ["TypeScript", "React", "NestJS"],
  createdAt: "2026-03-20T00:00:00Z",
  updatedAt: "2026-03-20T00:00:00Z"
};

const baseSearchQuery: JobSearchQuery = {
  id: "query-1",
  provider: "serpapi",
  query: "software engineer",
  location: "Remote",
  seniority: "junior",
  sourceOrigin: "linkedin",
  includeKeywords: ["typescript"],
  excludeKeywords: ["senior"],
  relatedTitles: true,
  postedWithinHours: 24,
  maxResultsPerRun: 25,
  minMatchScore: 60,
  cadenceSeconds: 60,
  enabled: true,
  lastRunAt: "2026-03-22T10:00:00Z",
  lastCompletedAt: "2026-03-22T10:01:00Z",
  lastNewJobsCount: 2,
  lastAlertedCount: 1,
  lastError: null,
  createdAt: "2026-03-22T09:00:00Z",
  updatedAt: "2026-03-22T10:01:00Z"
};

const baseAlertPreference: JobAlertPreference = {
  emailEnabled: true,
  emailAddress: "alerts@example.com",
  immediateAlerts: true,
  minMatchScore: 70,
  cooldownSeconds: 0
};

const baseAlerts: JobAlert[] = [
  {
    id: "alert-1",
    channel: "EMAIL",
    status: "PENDING",
    deliveryError: null,
    sentAt: null,
    createdAt: "2026-03-22T10:00:00Z",
    jobSearchQueryId: "query-1",
    job: {
      id: "job-1",
      title: "Fullstack Developer",
      company: "OpenAI",
      location: "Remote",
      url: "https://example.com/jobs/fullstack"
    }
  }
];

const connectedGoogle: GoogleIntegrationStatus = {
  connected: true,
  email: "owner@example.com",
  expiresAt: "2026-03-23T00:00:00Z",
  scopes: ["email", "profile", "documents", "drive"]
};

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
    label: "Synced Google Template",
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
    JOB_TITLE: "Fullstack Developer",
    SUMMARY: "Original summary"
  },
  previewState: {
    JOB_TITLE: "Fullstack Developer",
    SUMMARY: "Original summary"
  },
  copiedDocumentUrl: null,
  copiedDocumentTitle: null,
  syncStatus: "draft",
  createdAt: "2026-03-22T00:05:00Z"
};

function mockApiDefaults() {
  vi.mocked(api.getJobs).mockResolvedValue(baseJobsResponse);
  vi.mocked(api.getJobDetail).mockResolvedValue(baseJobDetail);
  vi.mocked(api.getMatchScore).mockResolvedValue({
    score: 75,
    explanations: ["role match", "location match"],
    job: { id: "job-1", title: "Fullstack Developer" }
  });
  vi.mocked(api.getProfile).mockResolvedValue(baseProfile);
  vi.mocked(api.upsertProfile).mockResolvedValue(baseProfile);
  vi.mocked(api.getGoogleIntegrationStatus).mockResolvedValue(connectedGoogle);
  vi.mocked(api.startGoogleConnection).mockResolvedValue({
    url: "https://accounts.google.com/o/oauth2/v2/auth?state=abc"
  });
  vi.mocked(api.disconnectGoogleConnection).mockResolvedValue({
    connected: false,
    email: null,
    expiresAt: null,
    scopes: []
  });
  vi.mocked(api.listSearchQueries).mockResolvedValue([baseSearchQuery]);
  vi.mocked(api.createSearchQuery).mockResolvedValue(baseSearchQuery);
  vi.mocked(api.updateSearchQuery).mockResolvedValue({ ok: true });
  vi.mocked(api.deleteSearchQuery).mockResolvedValue({ ok: true });
  vi.mocked(api.previewSearchQuery).mockResolvedValue({ jobs: [] });
  vi.mocked(api.runSearchQuery).mockResolvedValue({
    fetchedCount: 0,
    savedCount: 0,
    alertCount: 0,
    jobs: []
  });
  vi.mocked(api.getAlerts).mockResolvedValue(baseAlerts);
  vi.mocked(api.getAlertPreferences).mockResolvedValue(baseAlertPreference);
  vi.mocked(api.updateAlertPreferences).mockResolvedValue(baseAlertPreference);
  vi.mocked(api.getCvTemplate).mockResolvedValue(baseTemplate);
  vi.mocked(api.connectCvTemplate).mockResolvedValue(baseTemplate);
  vi.mocked(api.updateCvTemplatePlaceholders).mockResolvedValue(baseTemplate);
  vi.mocked(api.generateCvDraft).mockResolvedValue(generatedDraft);
  vi.mocked(api.updateGeneratedCvDraft).mockImplementation(async (_versionId, payload) => ({
    ...generatedDraft,
    fieldValues: payload.fieldValues,
    previewState: payload.fieldValues
  }));
  vi.mocked(api.syncGeneratedCvDraft).mockResolvedValue({
    ...generatedDraft,
    copiedDocumentUrl: "https://docs.google.com/document/d/copied-doc-123/edit",
    copiedDocumentTitle: "Base CV - Fullstack Developer",
    syncStatus: "synced"
  });
  vi.mocked(api.approveJob).mockResolvedValue(undefined);
  vi.mocked(api.rejectJob).mockResolvedValue(undefined);
  vi.mocked(api.snoozeJob).mockResolvedValue(undefined);
}

describe("Approval Console", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.forEach((_, key) => {
      mockSearchParams.delete(key);
    });
    mockApiDefaults();
  });

  it("requires profile onboarding before match score and live pull are active", async () => {
    vi.mocked(api.getProfile).mockRejectedValue(new ApiError(404, "missing"));

    render(<ApprovalConsole />);

    expect(await screen.findByRole("heading", { name: "Jobs (1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show console setup" })).toBeInTheDocument();
    expect(
      screen.getByText(/saved-search polling stay disabled until your role, location, and skills are saved\./)
    ).toBeInTheDocument();
    expect(screen.queryByText("Profile Onboarding")).not.toBeInTheDocument();
    expect(screen.queryByText("Saved Searches")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(api.getJobDetail).toHaveBeenCalledWith("job-1");
    });

    expect(api.getMatchScore).not.toHaveBeenCalled();
  });

  it("toggles the collapsed setup sections", async () => {
    render(<ApprovalConsole />);

    const toggle = await screen.findByRole("button", { name: "Show console setup" });
    expect(screen.queryByText("Profile Onboarding")).not.toBeInTheDocument();
    expect(screen.queryByText("Saved Searches")).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(await screen.findByText("Profile Onboarding")).toBeInTheDocument();
    expect(await screen.findByText("Saved Searches")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide console setup" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hide console setup" }));

    await waitFor(() => {
      expect(screen.queryByText("Profile Onboarding")).not.toBeInTheDocument();
      expect(screen.queryByText("Saved Searches")).not.toBeInTheDocument();
    });
  });

  it("starts the Google OAuth flow from the console", async () => {
    vi.mocked(api.getGoogleIntegrationStatus).mockResolvedValue({
      connected: false,
      email: null,
      expiresAt: null,
      scopes: []
    });
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<ApprovalConsole />);

    fireEvent.click(await screen.findByRole("button", { name: "Show console setup" }));
    const button = await screen.findByRole("button", { name: "Connect Google Workspace" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(api.startGoogleConnection).toHaveBeenCalled();
    });

    expect(openSpy).toHaveBeenCalledWith(
      "https://accounts.google.com/o/oauth2/v2/auth?state=abc",
      "_self"
    );

    openSpy.mockRestore();
  });

  it("connects a template doc and saves placeholder mapping changes", async () => {
    vi.mocked(api.getCvTemplate).mockRejectedValue(new ApiError(404, "missing"));
    vi.mocked(api.connectCvTemplate).mockResolvedValue(baseTemplate);

    render(<ApprovalConsole />);

    fireEvent.click(await screen.findByRole("button", { name: "Show console setup" }));
    const documentInput = await screen.findByPlaceholderText(
      "https://docs.google.com/document/d/..."
    );
    fireEvent.change(documentInput, {
      target: { value: "https://docs.google.com/document/d/base-doc-123/edit" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Connect Template Doc" }));

    await waitFor(() => {
      expect(api.connectCvTemplate).toHaveBeenCalledWith({
        documentUrl: "https://docs.google.com/document/d/base-doc-123/edit"
      });
    });

    const instructionsInput = await screen.findByLabelText("Instructions for SUMMARY");
    fireEvent.change(instructionsInput, {
      target: { value: "Keep this summary focused on platform work." }
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Placeholder Mapping" }));

    await waitFor(() => {
      expect(api.updateCvTemplatePlaceholders).toHaveBeenCalledWith({
        placeholders: expect.arrayContaining([
          expect.objectContaining({
            token: "SUMMARY",
            instructions: "Keep this summary focused on platform work."
          })
        ])
      });
    });
  });

  it("generates, saves, and syncs a tailored draft in app before opening the copied doc", async () => {
    render(<ApprovalConsole />);

    const generateButton = await screen.findByRole("button", { name: "Generate Draft" });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(api.generateCvDraft).toHaveBeenCalledWith({
        jobId: "job-1",
        summaryOnly: true
      });
    });

    const summaryInput = await screen.findByLabelText("Summary");
    fireEvent.change(summaryInput, {
      target: { value: "Updated in-app summary" }
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));

    await waitFor(() => {
      expect(api.updateGeneratedCvDraft).toHaveBeenCalledWith("draft-1", {
        fieldValues: {
          JOB_TITLE: "Fullstack Developer",
          SUMMARY: "Updated in-app summary"
        }
      });
    });

    vi.mocked(api.updateGeneratedCvDraft).mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Sync to Google Doc" }));

    await waitFor(() => {
      expect(api.updateGeneratedCvDraft).toHaveBeenCalledWith("draft-1", {
        fieldValues: {
          JOB_TITLE: "Fullstack Developer",
          SUMMARY: "Updated in-app summary"
        }
      });
    });

    await waitFor(() => {
      expect(api.syncGeneratedCvDraft).toHaveBeenCalledWith("draft-1");
    });

    expect(await screen.findByRole("link", { name: "Open Synced CV" })).toHaveAttribute(
      "href",
      "https://docs.google.com/document/d/copied-doc-123/edit"
    );
  });

  it("refreshes jobs and discovery data on an interval so new matches appear automatically", async () => {
    vi.useFakeTimers();

    try {
      render(<ApprovalConsole />);

      await act(async () => {
        await Promise.resolve();
      });

      expect(api.getJobs).toHaveBeenCalledTimes(1);
      expect(api.listSearchQueries).toHaveBeenCalledTimes(1);
      expect(api.getAlertPreferences).toHaveBeenCalledTimes(1);
      expect(api.getAlerts).toHaveBeenCalledTimes(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });

      expect(api.getJobs).toHaveBeenCalledTimes(2);
      expect(api.listSearchQueries).toHaveBeenCalledTimes(2);
      expect(api.getAlertPreferences).toHaveBeenCalledTimes(2);
      expect(api.getAlerts).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
