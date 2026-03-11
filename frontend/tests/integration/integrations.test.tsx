/**
 * Integration flow tests: Connect integration + polling UI.
 *
 * TDD: Written before implementation. Tests the expected behavior of
 * the integrations page and connect modal components.
 */

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the api module
vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
  ApiException: class ApiException extends Error {
    constructor(
      public status: number,
      public error: { code: string; message: string }
    ) {
      super(error.message);
    }
  },
}));

// Mock Supabase
vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: "user-123", email: "test@finandance.test" },
            access_token: "fake-token",
          },
        },
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));

// ---------------------------------------------------------------------------
// ConnectModal tests
// ---------------------------------------------------------------------------

describe("ConnectModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders provider selection buttons", async () => {
    const { ConnectModal } = await import("../../src/components/integrations/ConnectModal");
    render(<ConnectModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.getByText(/Wise/i)).toBeDefined();
    expect(screen.getByText(/Kraken/i)).toBeDefined();
    expect(screen.getByText(/Ledger/i)).toBeDefined();
  });

  it("shows API key input when Wise is selected", async () => {
    const { ConnectModal } = await import("../../src/components/integrations/ConnectModal");
    render(<ConnectModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByText(/Wise/i));
    expect(screen.getByPlaceholderText(/api key/i)).toBeDefined();
  });

  it("shows public address input for Ledger", async () => {
    const { ConnectModal } = await import("../../src/components/integrations/ConnectModal");
    render(<ConnectModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByText(/Ledger/i));
    expect(screen.getByPlaceholderText(/public address/i)).toBeDefined();
  });

  it("calls api.post on submit and triggers onSuccess with job_id", async () => {
    const { api } = await import("@/lib/api");
    const mockPost = vi.mocked(api.post);
    mockPost.mockResolvedValueOnce({
      id: "int-001",
      provider: "WISE",
      status: "PENDING",
      job_id: "job-123",
      message: "Sync started",
    });

    const onSuccess = vi.fn();
    const { ConnectModal } = await import("../../src/components/integrations/ConnectModal");
    render(<ConnectModal isOpen={true} onClose={vi.fn()} onSuccess={onSuccess} />);

    fireEvent.click(screen.getByText(/Wise/i));
    const input = screen.getByPlaceholderText(/api key/i);
    fireEvent.change(input, { target: { value: "my-wise-key-123" } });
    fireEvent.click(screen.getByRole("button", { name: /connect/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/api/v1/integrations/connect", {
        provider: "WISE",
        api_key: "my-wise-key-123",
      });
      expect(onSuccess).toHaveBeenCalledWith("job-123");
    });
  });

  it("shows validation error when submitting empty API key", async () => {
    const { ConnectModal } = await import("../../src/components/integrations/ConnectModal");
    render(<ConnectModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByText(/Wise/i));
    fireEvent.click(screen.getByRole("button", { name: /connect/i }));

    await waitFor(() => {
      expect(screen.getByText(/required/i)).toBeDefined();
    });
  });

  it("does not render when isOpen is false", async () => {
    const { ConnectModal } = await import("../../src/components/integrations/ConnectModal");
    const { container } = render(
      <ConnectModal isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// SyncStatus polling tests
// ---------------------------------------------------------------------------

describe("SyncStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows QUEUED state initially", async () => {
    const { api } = await import("@/lib/api");
    vi.mocked(api.get).mockResolvedValue({
      job_id: "job-123",
      status: "QUEUED",
      integration_id: "int-001",
    });

    const { SyncStatus } = await import("../../src/components/integrations/SyncStatus");
    render(<SyncStatus jobId="job-123" integrationId="int-001" onComplete={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/queued|syncing|pending/i)).toBeDefined();
    });
  });

  it("polls every 2 seconds until COMPLETED", async () => {
    const { api } = await import("@/lib/api");
    const mockGet = vi.mocked(api.get);

    mockGet
      .mockResolvedValueOnce({ job_id: "job-123", status: "RUNNING" })
      .mockResolvedValueOnce({ job_id: "job-123", status: "RUNNING" })
      .mockResolvedValueOnce({
        job_id: "job-123",
        status: "COMPLETED",
        funding_sources_synced: 3,
        transactions_synced: 15,
      });

    const onComplete = vi.fn();
    const { SyncStatus } = await import("../../src/components/integrations/SyncStatus");
    render(<SyncStatus jobId="job-123" integrationId="int-001" onComplete={onComplete} />);

    // Advance timers to trigger polling
    await act(async () => {
      vi.advanceTimersByTime(6000); // 3 polls × 2s
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it("shows error state when job FAILED", async () => {
    const { api } = await import("@/lib/api");
    vi.mocked(api.get).mockResolvedValue({
      job_id: "job-123",
      status: "FAILED",
      error: "INVALID_API_KEY",
    });

    const { SyncStatus } = await import("../../src/components/integrations/SyncStatus");
    render(<SyncStatus jobId="job-123" integrationId="int-001" onComplete={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/failed|error|invalid/i)).toBeDefined();
    });
  });

  it("stops polling after COMPLETED", async () => {
    const { api } = await import("@/lib/api");
    const mockGet = vi.mocked(api.get);
    mockGet.mockResolvedValue({ job_id: "job-123", status: "COMPLETED" });

    const { SyncStatus } = await import("../../src/components/integrations/SyncStatus");
    render(<SyncStatus jobId="job-123" integrationId="int-001" onComplete={vi.fn()} />);

    await act(async () => {
      vi.advanceTimersByTime(10000);
    });

    // Should have called get() just once (on completed, stops)
    await waitFor(() => {
      expect(mockGet.mock.calls.length).toBeLessThanOrEqual(2);
    });
  });
});
