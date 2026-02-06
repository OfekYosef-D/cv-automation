import { act, render } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import AuthCallbackPage from "../app/auth/callback/page";

const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();
const refreshUser = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ refreshUser })
}));

describe("AuthCallbackPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPush.mockReset();
    refreshUser.mockReset();
    mockSearchParams.delete("error");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("redirects even if refreshUser never resolves", async () => {
    refreshUser.mockReturnValue(new Promise(() => {}));

    render(<AuthCallbackPage />);

    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(1600);
    });

    expect(mockPush).toHaveBeenCalledWith("/");
  });
});
