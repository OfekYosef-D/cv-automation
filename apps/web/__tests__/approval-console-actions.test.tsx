import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import { beforeEach, describe, expect, it, vi } from "vitest";

expect.extend(matchers);

import { ApprovalConsole } from "../components/approval-console";
import * as api from "../lib/api";
import type { JobAlertPreference, JobDetailResponse, JobListResponse, JobSearchQuery } from "../lib/types";

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

const jobsResponse: JobListResponse = {
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
      latestArtefact: null
    }
  ],
  page: 1,
  pageSize: 20,
  total: 1
};

const jobDetail: JobDetailResponse = {
  id: "job-1",
  title: "Fullstack Developer",
  description: "Build web apps",
  company: "OpenAI",
  salary: "$120,000 - $150,000",
  tags: ["react", "nestjs", "ai"],
  origin: "linkedin",
  sourceLabel: "SerpApi",
  matchedQueryIds: ["query-1"],
  location: "Remote",
  url: "https://example.com/jobs/fullstack",
  postedAt: "2026-03-21T09:00:00Z",
  artefacts: []
};

const baseSearchQuery: JobSearchQuery = {
  id: "query-1",
  provider: "serpapi",
  query: "software engineer",
  location: "Remote",
  seniority: "junior",
  sourceOrigin: "linkedin",
  includeKeywords: ["typescript"],
  excludeKeywords: [],
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

const alertPreference: JobAlertPreference = {
  emailEnabled: true,
  emailAddress: "alerts@example.com",
  immediateAlerts: true,
  minMatchScore: 70,
  cooldownSeconds: 0
};

function mockApiDefaults() {
  vi.mocked(api.getJobs).mockResolvedValue(jobsResponse);
  vi.mocked(api.getJobDetail).mockResolvedValue(jobDetail);
  vi.mocked(api.getMatchScore).mockResolvedValue({
    score: 75,
    explanations: ["role match"],
    job: { id: "job-1", title: "Fullstack Developer" }
  });
  vi.mocked(api.getProfile).mockResolvedValue({
    id: "profile-1",
    desiredRoles: ["fullstack developer"],
    seniority: "junior",
    location: "Israel",
    mustHaveSkills: ["TypeScript"],
    createdAt: "2026-03-20T00:00:00Z",
    updatedAt: "2026-03-20T00:00:00Z"
  });
  vi.mocked(api.upsertProfile).mockResolvedValue({
    id: "profile-1",
    desiredRoles: ["fullstack developer"],
    seniority: "junior",
    location: "Israel",
    mustHaveSkills: ["TypeScript"],
    createdAt: "2026-03-20T00:00:00Z",
    updatedAt: "2026-03-20T00:00:00Z"
  });
  vi.mocked(api.getGoogleIntegrationStatus).mockResolvedValue({
    connected: false,
    email: null,
    expiresAt: null,
    scopes: []
  });
  vi.mocked(api.startGoogleConnection).mockResolvedValue({ url: "https://google.test" });
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
  vi.mocked(api.getAlerts).mockResolvedValue([]);
  vi.mocked(api.getAlertPreferences).mockResolvedValue(alertPreference);
  vi.mocked(api.updateAlertPreferences).mockResolvedValue(alertPreference);
  vi.mocked(api.getCvTemplate).mockRejectedValue(new api.ApiError(404, "missing"));
  vi.mocked(api.connectCvTemplate).mockRejectedValue(new Error("unused"));
  vi.mocked(api.updateCvTemplatePlaceholders).mockRejectedValue(new Error("unused"));
  vi.mocked(api.generateCvDraft).mockRejectedValue(new Error("unused"));
  vi.mocked(api.updateGeneratedCvDraft).mockRejectedValue(new Error("unused"));
  vi.mocked(api.syncGeneratedCvDraft).mockRejectedValue(new Error("unused"));
  vi.mocked(api.approveJob).mockResolvedValue(undefined);
  vi.mocked(api.rejectJob).mockResolvedValue(undefined);
  vi.mocked(api.snoozeJob).mockResolvedValue(undefined);
}

async function waitForDetailPanel(): Promise<void> {
  await waitFor(() => {
    expect(api.getJobDetail).toHaveBeenCalledWith("job-1");
  });
  await screen.findByRole("link", { name: "Apply Now" });
}

describe("Approval Console actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiDefaults();
  });

  it("updates status optimistically after approve", async () => {
    render(<ApprovalConsole />);

    await waitForDetailPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Approve" }));

    await waitFor(() => {
      expect(api.approveJob).toHaveBeenCalledWith("job-1");
    });

    expect(screen.getAllByText("APPROVED").length).toBeGreaterThanOrEqual(1);
  });

  it("updates status optimistically after reject", async () => {
    render(<ApprovalConsole />);

    await waitForDetailPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Reject" }));

    await waitFor(() => {
      expect(api.rejectJob).toHaveBeenCalledWith("job-1");
    });

    expect(screen.getAllByText("REJECTED").length).toBeGreaterThanOrEqual(1);
  });

  it("updates status optimistically after snooze", async () => {
    render(<ApprovalConsole />);

    await waitForDetailPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Snooze" }));

    await waitFor(() => {
      expect(api.snoozeJob).toHaveBeenCalledWith("job-1");
    });

    expect(screen.getAllByText("SNOOZED").length).toBeGreaterThanOrEqual(1);
  });

  it("surfaces action failures", async () => {
    vi.mocked(api.approveJob).mockRejectedValueOnce(new Error("network"));

    render(<ApprovalConsole />);

    await waitForDetailPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Approve" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("approve failed");
  });

  it("shows the saved search editor and origin badges", async () => {
    render(<ApprovalConsole />);

    fireEvent.click(await screen.findByRole("button", { name: "Show console setup" }));
    expect(await screen.findByText("Saved Searches")).toBeInTheDocument();
    expect(screen.getAllByText("LinkedIn").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SerpApi").length).toBeGreaterThan(0);
  });
});
