import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, type Mock } from "vitest";

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
    url: "https://example.com/jobs/fullstack",
    postedAt: null,
    artefacts: [{ id: "art-1", status: "DRAFT", content: "Tailored summary" }]
  })),
  getMatchScore: vi.fn(async () => ({
    score: 75,
    explanations: ["role match", "location match"],
    job: { id: "job-1", title: "Fullstack Developer" }
  })),
  approveJob: vi.fn(async () => ({})),
  rejectJob: vi.fn(async () => ({})),
  snoozeJob: vi.fn(async () => ({}))
}));

describe("Approval Console UI states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("styling", () => {
    it("renders action buttons with Tailwind classes", async () => {
      render(<ApprovalConsole />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
      });

      const approveButton = screen.getByRole("button", { name: "Approve" });
      expect(approveButton.className).toContain("inline-flex");
    });
  });

  describe("loading state", () => {
    it("displays loading message while fetching jobs", async () => {
      // Create a deferred promise that we can resolve after assertions
      let resolveDeferred: (value: unknown) => void;
      const deferredPromise = new Promise((resolve) => {
        resolveDeferred = resolve;
      });
      (api.getJobs as Mock).mockImplementationOnce(() => deferredPromise);

      render(<ApprovalConsole />);

      expect(screen.getByText("Loading jobs...")).toBeInTheDocument();
      expect(screen.getByText("Loading...")).toBeInTheDocument();

      // Resolve the promise and flush state updates to clean up
      await act(async () => {
        resolveDeferred!({
          jobs: [],
          page: 1,
          pageSize: 20,
          total: 0
        });
      });
    });

    it("hides loading message after jobs are loaded", async () => {
      render(<ApprovalConsole />);

      await waitFor(() => {
        expect(screen.queryByText("Loading jobs...")).not.toBeInTheDocument();
      });
    });
  });

  describe("error state", () => {
    it("displays error message when job fetch fails", async () => {
      (api.getJobs as Mock).mockRejectedValueOnce(new Error("Network error"));

      render(<ApprovalConsole />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load jobs")).toBeInTheDocument();
      });
    });

    it("displays retry button when job fetch fails", async () => {
      (api.getJobs as Mock).mockRejectedValueOnce(new Error("Network error"));

      render(<ApprovalConsole />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
      });
    });

    it("retries fetching jobs when retry button is clicked", async () => {
      (api.getJobs as Mock)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          jobs: [
            {
              id: "job-1",
              title: "Fullstack Developer",
              location: "Remote",
              approvalStatus: "PENDING",
              latestArtefact: null
            }
          ],
          page: 1,
          pageSize: 20,
          total: 1
        });

      render(<ApprovalConsole />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Retry" }));

      // Job title appears in both list and detail panel
      await waitFor(() => {
        const jobTitles = screen.getAllByText("Fullstack Developer");
        expect(jobTitles.length).toBeGreaterThanOrEqual(1);
      });

      expect(api.getJobs).toHaveBeenCalledTimes(2);
    });
  });

  describe("empty state", () => {
    it("displays empty message when no jobs found", async () => {
      (api.getJobs as Mock).mockResolvedValueOnce({
        jobs: [],
        page: 1,
        pageSize: 20,
        total: 0
      });

      render(<ApprovalConsole />);

      await waitFor(() => {
        expect(screen.getByText("No jobs found")).toBeInTheDocument();
      });
    });

    it("displays 'Select a job' message when no job is selected", async () => {
      (api.getJobs as Mock).mockResolvedValueOnce({
        jobs: [],
        page: 1,
        pageSize: 20,
        total: 0
      });

      render(<ApprovalConsole />);

      await waitFor(() => {
        expect(screen.getByText("Select a job to view details")).toBeInTheDocument();
      });
    });
  });
});
