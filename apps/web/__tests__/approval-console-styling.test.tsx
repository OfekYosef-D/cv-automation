import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApprovalConsole } from "../components/approval-console";

describe("Approval Console styling", () => {
  it("renders action buttons with Tailwind classes", () => {
    render(
      <ApprovalConsole
        job={{ id: "job-1", title: "Fullstack Developer", location: "Remote" }}
        artefact={{ id: "art-1", status: "DRAFT", content: "Tailored summary" }}
      />
    );

    const approveButton = screen.getByRole("button", { name: "Approve" });
    expect(approveButton.className).toContain("inline-flex");
  });
});
