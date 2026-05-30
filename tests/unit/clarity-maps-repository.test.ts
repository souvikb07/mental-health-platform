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
  claimClarityMapGeneration,
  mergeOwnedSessionSafetyState,
  persistClarityMapResult,
} from "../../src/lib/db/repositories/clarity-maps";

describe("Clarity Maps repository", () => {
  beforeEach(() => {
    rpc.mockReset();
    getSupabaseServerClient.mockReset();
    getSupabaseServerClient.mockReturnValue({ rpc });
  });

  it("claims generation with raw-free hashes only", async () => {
    rpc.mockResolvedValue({
      data: [{ claim_status: "claimed", map_encrypted: null }],
      error: null,
    });

    await expect(claimClarityMapGeneration({
      ownerId: "owner-id",
      sessionId: "session-id",
      transcriptFingerprint: "a".repeat(64),
      leaseTokenHash: "b".repeat(64),
    })).resolves.toEqual({
      status: "claimed",
      mapEncrypted: null,
    });

    expect(rpc).toHaveBeenCalledWith("claim_clarity_map_generation", {
      p_owner_id: "owner-id",
      p_session_id: "session-id",
      p_transcript_fingerprint: "a".repeat(64),
      p_lease_token_hash: "b".repeat(64),
    });
  });

  it("persists encrypted map envelopes through the owner-scoped RPC", async () => {
    const envelope = encryptedEnvelope();
    rpc.mockResolvedValue({
      data: [{ map_encrypted: envelope }],
      error: null,
    });

    await expect(persistClarityMapResult({
      ownerId: "owner-id",
      sessionId: "session-id",
      mapEncrypted: envelope,
      source: "fallback",
      schemaVersion: "clarity_map.v1",
      transcriptFingerprint: "a".repeat(64),
      leaseTokenHash: "b".repeat(64),
      riskLevel: "low",
      safetyState: "normal_support",
    })).resolves.toEqual(envelope);

    expect(rpc).toHaveBeenCalledWith("persist_clarity_map_result", expect.objectContaining({
      p_map_encrypted: envelope,
      p_transcript_fingerprint: "a".repeat(64),
      p_lease_token_hash: "b".repeat(64),
    }));
  });

  it("merges raw-free safety state through the owner-scoped RPC", async () => {
    rpc.mockResolvedValue({ error: null });

    await mergeOwnedSessionSafetyState({
      ownerId: "owner-id",
      sessionId: "session-id",
      riskLevel: "high",
      safetyState: "active_suicidal_ideation",
    });

    expect(rpc).toHaveBeenCalledWith("merge_owned_session_safety_state", {
      p_owner_id: "owner-id",
      p_session_id: "session-id",
      p_risk_level: "high",
      p_safety_state: "active_suicidal_ideation",
    });
  });

  it("maps backend failures to a safe error", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "private detail" } });

    await expect(claimClarityMapGeneration({
      ownerId: "owner-id",
      sessionId: "session-id",
      transcriptFingerprint: "a".repeat(64),
      leaseTokenHash: "b".repeat(64),
    })).rejects.toMatchObject({
      code: "DATA_BACKEND_UNAVAILABLE",
      status: 503,
    });
  });
});

describe("0005 persisted Clarity Map and feedback migration", () => {
  const migration = readFileSync(
    "supabase/migrations/0005_sprint1_persisted_clarity_feedback.sql",
    "utf8",
  );

  it("adds raw-free replay claims, fingerprints, RLS, and five-minute leases", () => {
    expect(migration).toContain("create table public.clarity_map_claims");
    expect(migration).toContain("add column transcript_fingerprint text");
    expect(migration).toContain("current_time + interval '5 minutes'");
    expect(migration).toContain("clarity_map_claims_session_map_fk");
    expect(migration).toContain("alter table public.clarity_map_claims enable row level security");
    expect(migration).toContain("grant select, insert, update, delete on table public.clarity_map_claims");
    expect(migration).not.toMatch(/clarity_map_claims[\\s\\S]*\\b(metadata|ip|cookie|ciphertext)\\b/);
  });

  it("adds service-role-only owner-scoped RPCs", () => {
    expect(migration).toContain("public.claim_clarity_map_generation");
    expect(migration).toContain("public.persist_clarity_map_result");
    expect(migration).toContain("public.merge_owned_session_safety_state");
    expect(migration).toContain("public.persist_feedback");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
    expect(migration).toContain("owner_id = p_owner_id");
    expect(migration).toContain("map_json");
    expect(migration).toContain("comment");
    expect(migration).toContain("Feedback ratings must be between 1 and 5.");
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
