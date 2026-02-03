import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { Pagination } from "../components/pagination";
import { StatusFilter } from "../components/status-filter";

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/"
}));

describe("Pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page info correctly", () => {
    render(
      <Pagination page={1} pageSize={20} total={100} onPageChange={vi.fn()} />
    );

    expect(screen.getByText("Page 1 of 5")).toBeInTheDocument();
  });

  it("disables Prev button on first page", () => {
    render(
      <Pagination page={1} pageSize={20} total={100} onPageChange={vi.fn()} />
    );

    expect(screen.getByRole("button", { name: /prev/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled();
  });

  it("disables Next button on last page", () => {
    render(
      <Pagination page={5} pageSize={20} total={100} onPageChange={vi.fn()} />
    );

    expect(screen.getByRole("button", { name: /prev/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("calls onPageChange with correct page when clicking Next", () => {
    const onPageChange = vi.fn();
    render(
      <Pagination page={2} pageSize={20} total={100} onPageChange={onPageChange} />
    );

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("calls onPageChange with correct page when clicking Prev", () => {
    const onPageChange = vi.fn();
    render(
      <Pagination page={2} pageSize={20} total={100} onPageChange={onPageChange} />
    );

    fireEvent.click(screen.getByRole("button", { name: /prev/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("shows correct total when total is less than pageSize", () => {
    render(
      <Pagination page={1} pageSize={20} total={5} onPageChange={vi.fn()} />
    );

    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  });

  it("renders nothing when total is 0", () => {
    const { container } = render(
      <Pagination page={1} pageSize={20} total={0} onPageChange={vi.fn()} />
    );

    // Should render empty fragment
    expect(container.firstChild).toBeNull();
  });
});

describe("StatusFilter", () => {
  it("renders with combobox trigger", () => {
    render(<StatusFilter value="ALL" onChange={vi.fn()} />);

    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("displays current filter value", () => {
    render(<StatusFilter value="PENDING" onChange={vi.fn()} />);

    // The trigger should show the current value label
    expect(screen.getByRole("combobox")).toHaveTextContent(/pending/i);
  });

  it("shows options when opened", async () => {
    render(<StatusFilter value="ALL" onChange={vi.fn()} />);

    // Click to open the select
    fireEvent.click(screen.getByRole("combobox"));

    // Options should be visible in the portal (use getAllByText for "All" since it appears in trigger too)
    await waitFor(() => {
      expect(screen.getAllByText("All").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Pending")).toBeInTheDocument();
      expect(screen.getByText("Approved")).toBeInTheDocument();
      expect(screen.getByText("Rejected")).toBeInTheDocument();
      expect(screen.getByText("Snoozed")).toBeInTheDocument();
    });
  });
});
