import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseServerClient, rpc } = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/db/supabase-server", () => ({
  getSupabaseServerClient,
}));

import {
  claimChatTurn,
  completeChatTurn,
  persistContextIntakeResult,
} from "../../src/lib/db/repositories/chat-turns";

describe("chat turns repository", () => {
  beforeEach(() => {
    rpc.mockReset();
    getSupabaseServerClient.mockReset();
    getSupabaseServerClient.mockReturnValue({ rpc });
  });

  it("claims a turn with raw-free identifiers only", async () => {
    rpc.mockResolvedValue({
      data: [{
        claim_status: "claimed",
        storage_consent_accepted: true,
        current_safety_state: "elevated_distress",
      }],
      error: null,
    });

    await expect(claimChatTurn({
      ownerId: "owner-id",
      sessionId: "session-id",
      clientMessageId: "11111111-1111-4111-8111-111111111111",
      leaseTokenHash: "a".repeat(64),
    })).resolves.toEqual({
      status: "claimed",
      storageConsentAccepted: true,
      currentSafetyState: "elevated_distress",
    });

    expect(rpc).toHaveBeenCalledWith("claim_chat_turn", {
      p_owner_id: "owner-id",
      p_session_id: "session-id",
      p_client_message_id: "11111111-1111-4111-8111-111111111111",
      p_lease_token_hash: "a".repeat(64),
    });
  });

  it("completes a turn with envelopes and raw-free structured values", async () => {
    rpc.mockResolvedValue({ error: null });
    const envelope = encryptedEnvelope();

    await completeChatTurn({
      ownerId: "owner-id",
      sessionId: "session-id",
      clientMessageId: "11111111-1111-4111-8111-111111111111",
      leaseTokenHash: "a".repeat(64),
      userContentEncrypted: envelope,
      assistantContentEncrypted: envelope,
      assistantSource: "chat_fallback",
      riskLevel: "low",
      safetyState: "normal_support",
      userCreatedAt: "2026-05-30T00:00:00.000Z",
      assistantCreatedAt: "2026-05-30T00:00:01.000Z",
    });

    expect(rpc).toHaveBeenCalledWith("complete_chat_turn", expect.objectContaining({
      p_user_content_encrypted: envelope,
      p_assistant_content_encrypted: envelope,
      p_assistant_source: "chat_fallback",
    }));
  });

  it("persists one context-intake envelope or an opt-out null", async () => {
    const envelope = encryptedEnvelope();
    rpc.mockResolvedValue({
      data: [{ content_encrypted: envelope }],
      error: null,
    });

    await expect(persistContextIntakeResult({
      ownerId: "owner-id",
      sessionId: "session-id",
      responseEncrypted: envelope,
      riskLevel: null,
      safetyState: null,
    })).resolves.toEqual(envelope);
  });

  it("maps RPC failures to a safe backend error", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "private database detail" },
    });

    await expect(claimChatTurn({
      ownerId: "owner-id",
      sessionId: "session-id",
      clientMessageId: "11111111-1111-4111-8111-111111111111",
      leaseTokenHash: "a".repeat(64),
    })).rejects.toMatchObject({
      code: "DATA_BACKEND_UNAVAILABLE",
      status: 503,
    });
  });
});

describe("0004 persisted chat-turn migration", () => {
  const migration = readFileSync(
    "supabase/migrations/0004_sprint1_persisted_chat_turns.sql",
    "utf8",
  );

  it("adds a raw-free service-role-only chat-turn claim table", () => {
    expect(migration).toContain("create table public.chat_turns");
    expect(migration).toContain("references public.sessions(id) on delete cascade");
    expect(migration).toContain("unique (session_id, client_message_id)");
    expect(migration).toContain("alter table public.chat_turns enable row level security");
    expect(migration).toContain("grant select, insert, update, delete on table public.chat_turns to service_role");
    expect(migration).not.toMatch(/chat_turns[\\s\\S]*\\b(content|metadata|ip|cookie|token)\\b/);
  });

  it("adds atomic claim, completion, intake, and safety-state merge helpers", () => {
    expect(migration).toContain("public.claim_chat_turn");
    expect(migration).toContain("current_time + interval '5 minutes'");
    expect(migration).toContain("public.complete_chat_turn");
    expect(migration).toContain("public.persist_context_intake_result");
    expect(migration).toContain("public.merge_sprint1_safety_state");
    expect(migration).toContain("where source = 'context_intake_result'");
    expect(migration).toContain("'{}'::jsonb");
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
