import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApprovalConsole } from "../components/approval-console";

vi.mock("../lib/api", () => ({
  approveJob: vi.fn(async () => ({})),
  rejectJob: vi.fn(async () => ({})),
  snoozeJob: vi.fn(async () => ({}))
}));

const mockJobs = [
  {
    id: "job-1",
    title: "Fullstack Developer",
    location: "Remote",
    approvalStatus: "PENDING",
    latestArtefact: { id: "art-1", status: "DRAFT", content: "Tailored summary" }
  }
];

describe("Approval Console actions", () => {
  it("updates status optimistically after approve", async () => {
    render(<ApprovalConsole jobs={mockJobs} />);

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => {
      expect(screen.getByText("Current: APPROVED")).toBeInTheDocument();
    });
  });

  it("updates status optimistically after reject", async () => {
    render(<ApprovalConsole jobs={mockJobs} />);

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    await waitFor(() => {
      expect(screen.getByText("Current: REJECTED")).toBeInTheDocument();
    });
  });

  it("updates status optimistically after snooze", async () => {
    render(<ApprovalConsole jobs={mockJobs} />);

    fireEvent.click(screen.getByRole("button", { name: "Snooze" }));

    await waitFor(() => {
      expect(screen.getByText("Current: SNOOZED")).toBeInTheDocument();
    });
  });
});
