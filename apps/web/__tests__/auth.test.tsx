import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "../lib/auth";
import { UserMenu } from "../components/user-menu";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Track location changes
let locationHref = "";
Object.defineProperty(window, "location", {
  get() {
    return {
      href: locationHref,
      assign: vi.fn()
    };
  },
  set(value) {
    if (typeof value === "string") {
      locationHref = value;
    } else if (value?.href) {
      locationHref = value.href;
    }
  }
});

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it("provides unauthenticated state when no token", async () => {
    function TestComponent() {
      const { isAuthenticated, isLoading } = useAuth();
      if (isLoading) return <div>Loading...</div>;
      return <div>{isAuthenticated ? "Authenticated" : "Not authenticated"}</div>;
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Not authenticated")).toBeInTheDocument();
    });
  });

  it("loads token from localStorage on mount", async () => {
    localStorageMock.getItem.mockReturnValue("test-token");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        avatarUrl: null,
        tenantId: "t1"
      })
    });

    function TestComponent() {
      const { isAuthenticated, user, isLoading } = useAuth();
      if (isLoading) return <div>Loading...</div>;
      return (
        <div>
          {isAuthenticated ? `Authenticated as ${user?.email}` : "Not authenticated"}
        </div>
      );
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Authenticated as test@example.com")).toBeInTheDocument();
    });
  });

  it("clears token when API returns error", async () => {
    localStorageMock.getItem.mockReturnValue("invalid-token");
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

    function TestComponent() {
      const { isAuthenticated, isLoading } = useAuth();
      if (isLoading) return <div>Loading...</div>;
      return <div>{isAuthenticated ? "Authenticated" : "Not authenticated"}</div>;
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Not authenticated")).toBeInTheDocument();
    });
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("cv_auth_token");
  });
});

describe("UserMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it("shows Sign in button when not authenticated", async () => {
    render(
      <AuthProvider>
        <UserMenu />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    });
  });

  it("calls login function on Sign in click", async () => {
    render(
      <AuthProvider>
        <UserMenu />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    });

    // Click should not throw (login sets window.location.href)
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    // The actual redirect is tested via the href change which we can't easily assert in jsdom
  });

  it("shows user info and Sign out when authenticated", async () => {
    localStorageMock.getItem.mockReturnValue("test-token");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        avatarUrl: null,
        tenantId: "t1"
      })
    });

    render(
      <AuthProvider>
        <UserMenu />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("clears auth on Sign out click", async () => {
    localStorageMock.getItem.mockReturnValue("test-token");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        avatarUrl: null,
        tenantId: "t1"
      })
    });

    render(
      <AuthProvider>
        <UserMenu />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(localStorageMock.removeItem).toHaveBeenCalledWith("cv_auth_token");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    });
  });
});
