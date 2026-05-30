import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseServerClient, rpc } = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/db/supabase-server", () => ({
  getSupabaseServerClient,
}));

import { consumeRateLimit } from "../../src/lib/db/repositories/rate-limits";

describe("rate-limit repository", () => {
  beforeEach(() => {
    rpc.mockReset();
    getSupabaseServerClient.mockReset();
    getSupabaseServerClient.mockReturnValue({ rpc });
  });

  it("calls only the atomic RPC with a digest bucket key", async () => {
    rpc.mockResolvedValue({
      data: [{ allowed: true, retry_after_seconds: 42 }],
      error: null,
    });
    const bucketKey = "a".repeat(64);

    await expect(
      consumeRateLimit({
        routeKey: "api.chat",
        subjectKind: "owner_hmac",
        bucketKey,
        windowSeconds: 600,
        limit: 30,
      }),
    ).resolves.toEqual({ allowed: true, retryAfterSeconds: 42 });

    expect(rpc).toHaveBeenCalledWith("consume_rate_limit", {
      p_route_key: "api.chat",
      p_subject_kind: "owner_hmac",
      p_bucket_key: bucketKey,
      p_window_seconds: 600,
      p_limit: 30,
    });
  });

  it.each([
    { data: [], error: null },
    { data: [{ allowed: "yes", retry_after_seconds: 42 }], error: null },
    { data: [{ allowed: true, retry_after_seconds: 0 }], error: null },
    { data: null, error: { message: "private database detail" } },
  ])("maps malformed or failed RPC responses to a safe backend error", async (response) => {
    rpc.mockResolvedValue(response);

    await expect(
      consumeRateLimit({
        routeKey: "api.chat",
        subjectKind: "owner_hmac",
        bucketKey: "a".repeat(64),
        windowSeconds: 600,
        limit: 30,
      }),
    ).rejects.toMatchObject({
      code: "DATA_BACKEND_UNAVAILABLE",
      status: 503,
    });
  });
});
