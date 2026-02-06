import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
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
  };
});

describe("Approval Console actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates status optimistically after approve", async () => {
    render(<ApprovalConsole />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    // Status badges update optimistically (shown in both list and detail panel)
    await waitFor(() => {
      const statusBadges = screen.getAllByText("APPROVED");
      expect(statusBadges.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("updates status optimistically after reject", async () => {
    render(<ApprovalConsole />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    // Status badges update optimistically (shown in both list and detail panel)
    await waitFor(() => {
      const statusBadges = screen.getAllByText("REJECTED");
      expect(statusBadges.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("updates status optimistically after snooze", async () => {
    render(<ApprovalConsole />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Snooze" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Snooze" }));

    // Status badges update optimistically (shown in both list and detail panel)
    await waitFor(() => {
      const statusBadges = screen.getAllByText("SNOOZED");
      expect(statusBadges.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("calls approveJob API with correct job ID", async () => {
    render(<ApprovalConsole />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => {
      expect(api.approveJob).toHaveBeenCalledWith("job-1");
    });
  });

  it("calls rejectJob API with correct job ID", async () => {
    render(<ApprovalConsole />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    await waitFor(() => {
      expect(api.rejectJob).toHaveBeenCalledWith("job-1");
    });
  });

  it("calls snoozeJob API with correct job ID", async () => {
    render(<ApprovalConsole />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Snooze" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Snooze" }));

    await waitFor(() => {
      expect(api.snoozeJob).toHaveBeenCalledWith("job-1");
    });
  });

  it("displays error message when approve action fails", async () => {
    (api.approveJob as Mock).mockRejectedValueOnce(new Error("Network error"));

    render(<ApprovalConsole />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("approve failed");
    });
  });

  it("displays error message when reject action fails", async () => {
    (api.rejectJob as Mock).mockRejectedValueOnce(new Error("Network error"));

    render(<ApprovalConsole />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("reject failed");
    });
  });

  it("displays error message when snooze action fails", async () => {
    (api.snoozeJob as Mock).mockRejectedValueOnce(new Error("Network error"));

    render(<ApprovalConsole />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Snooze" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Snooze" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("snooze failed");
    });
  });
});
