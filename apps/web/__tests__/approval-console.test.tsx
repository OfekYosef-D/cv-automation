import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { ApprovalConsole } from "../components/approval-console";
import * as api from "../lib/api";

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams
}));

vi.mock("../lib/api", () => ({
  getJobs: vi.fn(async () => ({
    jobs: [
      {
        id: "job-1",
        title: "Fullstack Developer",
        location: "Remote",
        postedAt: null,
        approvalStatus: "PENDING",
        latestArtefact: { id: "art-1", status: "DRAFT", content: "Tailored summary" }
      }
    ],
    page: 1,
    pageSize: 20,
    total: 1
  })),
  getJobDetail: vi.fn(async () => ({
    id: "job-1",
    title: "Fullstack Developer",
    description: "Build web apps",
    location: "Remote",
    postedAt: null,
    artefacts: [{ id: "art-1", status: "DRAFT", content: "Tailored summary" }]
  })),
  approveJob: vi.fn(async () => ({})),
  rejectJob: vi.fn(async () => ({})),
  snoozeJob: vi.fn(async () => ({}))
}));

describe("Approval Console", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dynamic job data and action buttons", async () => {
    render(<ApprovalConsole />);

    // Wait for loading to complete and verify API was called
    await waitFor(() => {
      expect(api.getJobs).toHaveBeenCalled();
    });

    // Job title appears twice (in list and detail panel)
    const jobTitles = await screen.findAllByText("Fullstack Developer");
    expect(jobTitles.length).toBeGreaterThanOrEqual(1);

    expect(await screen.findByText("Tailored summary")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Snooze" })).toBeInTheDocument();
  });
});
