import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "../app/page";

describe("Approval Console", () => {
  it("renders job list and artefact panel", () => {
    render(<HomePage />);

    expect(screen.getByText("Jobs")).toBeInTheDocument();
    expect(screen.getByText("Fullstack Developer")).toBeInTheDocument();
    expect(screen.getByText("Tailored summary")).toBeInTheDocument();
  });
});
