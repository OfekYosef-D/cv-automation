import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import { beforeEach, describe, expect, it, vi } from "vitest";

expect.extend(matchers);

import { ApprovalConsole } from "../components/approval-console";
import * as api from "../lib/api";

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

function mockSupportingCalls() {
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
  vi.mocked(api.getCvTemplate).mockRejectedValue(new api.ApiError(404, "missing"));
  vi.mocked(api.connectCvTemplate).mockRejectedValue(new Error("unused"));
  vi.mocked(api.updateCvTemplatePlaceholders).mockRejectedValue(new Error("unused"));
  vi.mocked(api.generateCvDraft).mockRejectedValue(new Error("unused"));
  vi.mocked(api.updateGeneratedCvDraft).mockRejectedValue(new Error("unused"));
  vi.mocked(api.syncGeneratedCvDraft).mockRejectedValue(new Error("unused"));
  vi.mocked(api.approveJob).mockResolvedValue(undefined);
  vi.mocked(api.rejectJob).mockResolvedValue(undefined);
  vi.mocked(api.snoozeJob).mockResolvedValue(undefined);
  vi.mocked(api.listSearchQueries).mockResolvedValue([]);
  vi.mocked(api.createSearchQuery).mockRejectedValue(new Error("unused"));
  vi.mocked(api.updateSearchQuery).mockRejectedValue(new Error("unused"));
  vi.mocked(api.deleteSearchQuery).mockRejectedValue(new Error("unused"));
  vi.mocked(api.previewSearchQuery).mockResolvedValue({ jobs: [] });
  vi.mocked(api.runSearchQuery).mockRejectedValue(new Error("unused"));
  vi.mocked(api.getAlerts).mockResolvedValue([]);
  vi.mocked(api.getAlertPreferences).mockResolvedValue({
    emailEnabled: false,
    emailAddress: null,
    immediateAlerts: false,
    minMatchScore: null,
    cooldownSeconds: 0
  });
  vi.mocked(api.updateAlertPreferences).mockRejectedValue(new Error("unused"));
  vi.mocked(api.getJobDetail).mockResolvedValue({
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
    postedAt: null,
    artefacts: []
  });
  vi.mocked(api.getMatchScore).mockResolvedValue({
    score: 75,
    explanations: ["role match"],
    job: { id: "job-1", title: "Fullstack Developer" }
  });
}

describe("Approval Console UI states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupportingCalls();
  });

  it("displays loading placeholders while jobs are fetching", async () => {
    let resolveJobs:
      | ((value: { jobs: []; page: number; pageSize: number; total: number }) => void)
      | undefined;
    vi.mocked(api.getJobs).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveJobs = resolve;
        })
    );

    render(<ApprovalConsole />);

    expect(screen.getByText("Loading jobs...")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    await act(async () => {
      resolveJobs?.({
        jobs: [],
        page: 1,
        pageSize: 20,
        total: 0
      });
    });
  });

  it("shows an error and retry when job loading fails", async () => {
    vi.mocked(api.getJobs).mockRejectedValueOnce(new Error("network"));
    vi.mocked(api.getJobs).mockResolvedValueOnce({
      jobs: [],
      page: 1,
      pageSize: 20,
      total: 0
    });

    render(<ApprovalConsole />);

    expect(await screen.findByText("Failed to load jobs")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(api.getJobs).toHaveBeenCalledTimes(2);
    });
  });

  it("shows empty state when there are no jobs", async () => {
    vi.mocked(api.getJobs).mockResolvedValueOnce({
      jobs: [],
      page: 1,
      pageSize: 20,
      total: 0
    });

    render(<ApprovalConsole />);

    expect(await screen.findByText("No jobs found")).toBeInTheDocument();
    expect(screen.getByText("Select a job to view details")).toBeInTheDocument();
  });
});
