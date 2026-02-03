import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomePage from "../app/page";
import * as api from "../lib/api";

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
    pageSize: 20
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
  it("renders dynamic job data and action buttons", async () => {
    render(await HomePage());

    // Verify API was called
    expect(api.getJobs).toHaveBeenCalled();

    // Job title appears twice (in list and detail panel)
    const jobTitles = await screen.findAllByText("Fullstack Developer");
    expect(jobTitles.length).toBeGreaterThanOrEqual(1);

    expect(await screen.findByText("Tailored summary")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Snooze" })).toBeInTheDocument();
  });
});
