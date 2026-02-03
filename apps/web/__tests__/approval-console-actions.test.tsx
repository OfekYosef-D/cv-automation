import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { ApprovalConsole } from "../components/approval-console";

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
  approveJob: vi.fn(async () => ({})),
  rejectJob: vi.fn(async () => ({})),
  snoozeJob: vi.fn(async () => ({}))
}));

describe("Approval Console actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates status optimistically after approve", async () => {
    render(<ApprovalConsole />);

    // Wait for jobs to load
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => {
      expect(screen.getByText("Current: APPROVED")).toBeInTheDocument();
    });
  });

  it("updates status optimistically after reject", async () => {
    render(<ApprovalConsole />);

    // Wait for jobs to load
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    await waitFor(() => {
      expect(screen.getByText("Current: REJECTED")).toBeInTheDocument();
    });
  });

  it("updates status optimistically after snooze", async () => {
    render(<ApprovalConsole />);

    // Wait for jobs to load
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Snooze" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Snooze" }));

    await waitFor(() => {
      expect(screen.getByText("Current: SNOOZED")).toBeInTheDocument();
    });
  });
});
