import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { JobDetailPanel } from "../components/job-detail-panel";
import * as api from "../lib/api";
import { ApiError } from "../lib/api";

// Mock the API module
vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    getJobDetail: vi.fn(),
    getMatchScore: vi.fn()
  };
});

const mockGetJobDetail = api.getJobDetail as ReturnType<typeof vi.fn>;
const mockGetMatchScore = api.getMatchScore as ReturnType<typeof vi.fn>;

const mockMatchScore = {
  score: 75,
  explanations: ["role match", "seniority match", "location match"],
  job: { id: "job-1", title: "Senior Fullstack Developer" }
};

const mockJobDetail = {
  id: "job-1",
  title: "Senior Fullstack Developer",
  description: "We are looking for an experienced developer to join our team.\n\nResponsibilities:\n- Build modern web applications\n- Collaborate with design team",
  location: "Tel Aviv, Israel",
  url: "https://company.com/careers/fullstack",
  postedAt: "2026-01-15T10:00:00Z",
  artefacts: [
    { id: "art-1", status: "DRAFT" as const, content: "AI-generated summary of the job" }
  ]
};

describe("JobDetailPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetJobDetail.mockResolvedValue(mockJobDetail);
    mockGetMatchScore.mockResolvedValue(mockMatchScore);
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

  it("shows skeleton loader while fetching", async () => {
    // Make the API calls hang
    mockGetJobDetail.mockImplementation(() => new Promise(() => {}));
    mockGetMatchScore.mockImplementation(() => new Promise(() => {}));

    render(
      <JobDetailPanel
        jobId="job-1"
        approvalStatus="PENDING"
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onSnooze={vi.fn()}
        isPending={false}
        actionError={null}
      />
    );

    // Should show skeleton elements
    expect(screen.getByTestId("job-detail-skeleton")).toBeInTheDocument();
  });

  it("fetches and displays job details when jobId is provided", async () => {
    render(
      <JobDetailPanel
        jobId="job-1"
        approvalStatus="PENDING"
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onSnooze={vi.fn()}
        isPending={false}
        actionError={null}
      />
    );

    await waitFor(() => {
      expect(mockGetJobDetail).toHaveBeenCalledWith("job-1");
    });

    // Job title
    expect(await screen.findByText("Senior Fullstack Developer")).toBeInTheDocument();
    
    // Location badge
    expect(screen.getByText("Tel Aviv, Israel")).toBeInTheDocument();
    
    // Description
    expect(screen.getByText(/We are looking for an experienced developer/)).toBeInTheDocument();
    
    // AI summary
    expect(screen.getByText("AI-generated summary of the job")).toBeInTheDocument();
    
    // Posted date
    expect(screen.getByText(/Posted Jan 15, 2026/)).toBeInTheDocument();
  });

  it("renders Apply Now link with correct URL", async () => {
    render(
      <JobDetailPanel
        jobId="job-1"
        approvalStatus="PENDING"
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onSnooze={vi.fn()}
        isPending={false}
        actionError={null}
      />
    );

    const applyLink = await screen.findByRole("link", { name: /Apply Now/i });
    expect(applyLink).toHaveAttribute("href", "https://company.com/careers/fullstack");
    expect(applyLink).toHaveAttribute("target", "_blank");
    expect(applyLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("displays approval status badge with correct styling", async () => {
    render(
      <JobDetailPanel
        jobId="job-1"
        approvalStatus="APPROVED"
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onSnooze={vi.fn()}
        isPending={false}
        actionError={null}
      />
    );

    const statusBadge = await screen.findByText("APPROVED");
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge).toHaveClass("text-green-700");
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

    // Wait for content to load
    await screen.findByText("Senior Fullstack Developer");

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(onApprove).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(onReject).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Snooze" }));
    expect(onSnooze).toHaveBeenCalledTimes(1);
  });

  it("disables action buttons when isPending is true", async () => {
    render(
      <JobDetailPanel
        jobId="job-1"
        approvalStatus="PENDING"
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onSnooze={vi.fn()}
        isPending={true}
        actionError={null}
      />
    );

    await screen.findByText("Senior Fullstack Developer");

    expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reject" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Snooze" })).toBeDisabled();
  });

  it("displays action error when present", async () => {
    render(
      <JobDetailPanel
        jobId="job-1"
        approvalStatus="PENDING"
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onSnooze={vi.fn()}
        isPending={false}
        actionError="approve failed"
      />
    );

    await screen.findByText("Senior Fullstack Developer");
    expect(screen.getByRole("alert")).toHaveTextContent("approve failed");
  });

  it("shows error state when API call fails", async () => {
    mockGetJobDetail.mockRejectedValue(new Error("Network error"));

    render(
      <JobDetailPanel
        jobId="job-1"
        approvalStatus="PENDING"
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onSnooze={vi.fn()}
        isPending={false}
        actionError={null}
      />
    );

    expect(await screen.findByText("Failed to load job details")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("refetches when jobId changes", async () => {
    const { rerender } = render(
      <JobDetailPanel
        jobId="job-1"
        approvalStatus="PENDING"
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onSnooze={vi.fn()}
        isPending={false}
        actionError={null}
      />
    );

    await waitFor(() => {
      expect(mockGetJobDetail).toHaveBeenCalledWith("job-1");
    });

    const newJobDetail = { ...mockJobDetail, id: "job-2", title: "Backend Engineer" };
    mockGetJobDetail.mockResolvedValue(newJobDetail);

    rerender(
      <JobDetailPanel
        jobId="job-2"
        approvalStatus="PENDING"
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onSnooze={vi.fn()}
        isPending={false}
        actionError={null}
      />
    );

    await waitFor(() => {
      expect(mockGetJobDetail).toHaveBeenCalledWith("job-2");
    });

    expect(await screen.findByText("Backend Engineer")).toBeInTheDocument();
  });

  it("handles job without artefacts gracefully", async () => {
    mockGetJobDetail.mockResolvedValue({
      ...mockJobDetail,
      artefacts: []
    });

    render(
      <JobDetailPanel
        jobId="job-1"
        approvalStatus="PENDING"
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onSnooze={vi.fn()}
        isPending={false}
        actionError={null}
      />
    );

    await screen.findByText("Senior Fullstack Developer");
    expect(screen.getByText("No AI summary generated yet")).toBeInTheDocument();
  });

  it("handles job without description gracefully", async () => {
    mockGetJobDetail.mockResolvedValue({
      ...mockJobDetail,
      description: ""
    });

    render(
      <JobDetailPanel
        jobId="job-1"
        approvalStatus="PENDING"
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onSnooze={vi.fn()}
        isPending={false}
        actionError={null}
      />
    );

    await screen.findByText("Senior Fullstack Developer");
    expect(screen.getByText("No description available")).toBeInTheDocument();
  });

  describe("Match Score Integration", () => {
    it("displays match score when API returns successfully", async () => {
      render(
        <JobDetailPanel
          jobId="job-1"
          approvalStatus="PENDING"
          onApprove={vi.fn()}
          onReject={vi.fn()}
          onSnooze={vi.fn()}
          isPending={false}
          actionError={null}
        />
      );

      await screen.findByText("Senior Fullstack Developer");

      // Should display the score
      expect(screen.getByText("75")).toBeInTheDocument();
      
      // Should display explanation badges
      expect(screen.getByText("Role Match")).toBeInTheDocument();
      expect(screen.getByText("Seniority Match")).toBeInTheDocument();
      expect(screen.getByText("Location Match")).toBeInTheDocument();
    });

    it("shows configure profile message when no profile exists (400 error)", async () => {
      mockGetMatchScore.mockRejectedValue(new ApiError(400, "API error: 400"));

      render(
        <JobDetailPanel
          jobId="job-1"
          approvalStatus="PENDING"
          onApprove={vi.fn()}
          onReject={vi.fn()}
          onSnooze={vi.fn()}
          isPending={false}
          actionError={null}
        />
      );

      await screen.findByText("Senior Fullstack Developer");
      expect(screen.getByText(/Configure your profile to see match scores/)).toBeInTheDocument();
    });

    it("shows error message when match score API fails (non-400 error)", async () => {
      mockGetMatchScore.mockRejectedValue(new ApiError(500, "API error: 500"));

      render(
        <JobDetailPanel
          jobId="job-1"
          approvalStatus="PENDING"
          onApprove={vi.fn()}
          onReject={vi.fn()}
          onSnooze={vi.fn()}
          isPending={false}
          actionError={null}
        />
      );

      await screen.findByText("Senior Fullstack Developer");
      expect(screen.getByText("Failed to load match score")).toBeInTheDocument();
    });

    it("fetches match score alongside job detail", async () => {
      render(
        <JobDetailPanel
          jobId="job-1"
          approvalStatus="PENDING"
          onApprove={vi.fn()}
          onReject={vi.fn()}
          onSnooze={vi.fn()}
          isPending={false}
          actionError={null}
        />
      );

      await waitFor(() => {
        expect(mockGetJobDetail).toHaveBeenCalledWith("job-1");
        expect(mockGetMatchScore).toHaveBeenCalledWith("job-1");
      });
    });
  });
});
