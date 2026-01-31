import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Health } from "../components/Health";

describe("Health", () => {
  it("renders ok", () => {
    render(<Health />);
    expect(screen.getByText("ok")).toBeInTheDocument();
  });
});
