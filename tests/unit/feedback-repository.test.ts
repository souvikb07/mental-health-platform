import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseServerClient, rpc } = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/db/supabase-server", () => ({
  getSupabaseServerClient,
}));

import { persistFeedback } from "../../src/lib/db/repositories/feedback";

describe("feedback repository", () => {
  beforeEach(() => {
    rpc.mockReset();
    getSupabaseServerClient.mockReset();
    getSupabaseServerClient.mockReturnValue({ rpc });
  });

  it("persists ratings, flags, and an optional envelope through the owner-scoped RPC", async () => {
    const envelope = encryptedEnvelope();
    rpc.mockResolvedValue({ error: null });

    await persistFeedback({
      ownerId: "owner-id",
      sessionId: "session-id",
      clarityRating: 4,
      helpfulnessRating: 5,
      feltSafe: true,
      unsafeOrUnhelpful: false,
      commentEncrypted: envelope,
    });

    expect(rpc).toHaveBeenCalledWith("persist_feedback", {
      p_owner_id: "owner-id",
      p_session_id: "session-id",
      p_clarity_rating: 4,
      p_helpfulness_rating: 5,
      p_felt_safe: true,
      p_unsafe_or_unhelpful: false,
      p_comment_encrypted: envelope,
    });
  });

  it("maps backend errors to a generic unavailable response", async () => {
    rpc.mockResolvedValue({ error: { message: "private database detail" } });

    await expect(persistFeedback({
      ownerId: "owner-id",
      sessionId: "session-id",
      clarityRating: 4,
      helpfulnessRating: 5,
      feltSafe: null,
      unsafeOrUnhelpful: false,
      commentEncrypted: null,
    })).rejects.toMatchObject({
      code: "DATA_BACKEND_UNAVAILABLE",
      status: 503,
    });
  });
});

function encryptedEnvelope() {
  return {
    kid: "v1" as const,
    algorithm: "aes-256-gcm" as const,
    iv: "AAAAAAAAAAAAAAAA",
    authTag: "AAAAAAAAAAAAAAAAAAAAAA==",
    ciphertext: "YQ==",
  };
}
