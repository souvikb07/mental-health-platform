import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseServerClient, rpc } = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/db/supabase-server", () => ({
  getSupabaseServerClient,
}));

import { createOwnedAnonymousSession } from "../../src/lib/db/repositories/sessions";

const rpcRow = {
  owner_id: "owner-id",
  session_id: "session-id",
  storage_consent_accepted: false,
  created_at: "2026-05-30T00:00:00.000Z",
  expires_at: "2026-06-29T00:00:00.000Z",
};

describe("sessions repository", () => {
  beforeEach(() => {
    rpc.mockReset();
    getSupabaseServerClient.mockReset();
    getSupabaseServerClient.mockReturnValue({ rpc });
    rpc.mockResolvedValue({ data: [rpcRow], error: null });
  });

  it("passes only hashed ownership and raw-free structured values to the RPC", async () => {
    await expect(
      createOwnedAnonymousSession({
        tokenHash: "a".repeat(64),
        countryCode: "US",
        mainConcernCategory: "overwhelmed",
        storageConsentAccepted: false,
        onboardingNoteEncrypted: null,
      }),
    ).resolves.toEqual({
      ownerId: "owner-id",
      sessionId: "session-id",
      storageConsentAccepted: false,
      createdAt: "2026-05-30T00:00:00.000Z",
      expiresAt: "2026-06-29T00:00:00.000Z",
    });

    expect(rpc).toHaveBeenCalledWith("create_anonymous_session", {
      p_token_hash: "a".repeat(64),
      p_country_code: "US",
      p_main_concern_category: "overwhelmed",
      p_storage_consent_accepted: false,
      p_onboarding_note_encrypted: null,
    });
  });

  it("fails safely when the backend or RPC result is unavailable", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "private database detail" },
    });

    await expect(
      createOwnedAnonymousSession({
        tokenHash: "a".repeat(64),
        countryCode: "US",
        mainConcernCategory: "overwhelmed",
        storageConsentAccepted: false,
        onboardingNoteEncrypted: null,
      }),
    ).rejects.toThrow("Anonymous session creation failed.");
  });
});

describe("0003 anonymous session RPC migration", () => {
  const migration = readFileSync(
    "supabase/migrations/0003_sprint1_anonymous_session_creation_rpc.sql",
    "utf8",
  );

  it("keeps owner, session, and consent inserts inside one restricted RPC", () => {
    expect(migration).toContain("create or replace function public.create_anonymous_session");
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = public");
    expect(migration).toContain("insert into public.anonymous_owners");
    expect(migration).toContain("insert into public.sessions");
    expect(migration).toContain("insert into public.consent_events");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
  });

  it("keeps owners expiry-neutral and owner-linked plaintext fields null", () => {
    expect(migration).not.toContain("anonymous_owners (token_hash, expires_at)");
    expect(migration).toMatch(/country,\s+age_band,\s+main_reason,/);
    expect(migration).toMatch(/created_owner_id,\s+null,\s+null,\s+null,/);
    expect(migration).not.toContain("p_country_label");
    expect(migration).not.toContain("p_age_band");
    expect(migration).not.toContain("p_main_reason");
  });
});
