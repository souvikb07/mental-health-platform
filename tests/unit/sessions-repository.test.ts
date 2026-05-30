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
  createOwnedAnonymousSession,
  findOwnedSession,
} from "../../src/lib/db/repositories/sessions";

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

  it("finds sessions only through an owner-scoped non-expired query", async () => {
    const query = createSessionQuery({
      data: {
        id: "session-id",
        owner_id: "owner-id",
        expires_at: "2026-06-29T00:00:00.000Z",
      },
      error: null,
    });
    const from = vi.fn(() => query);
    getSupabaseServerClient.mockReturnValue({ rpc, from });

    await expect(findOwnedSession("owner-id", "session-id")).resolves.toEqual({
      id: "session-id",
      ownerId: "owner-id",
      expiresAt: "2026-06-29T00:00:00.000Z",
    });

    expect(from).toHaveBeenCalledWith("sessions");
    expect(query.select).toHaveBeenCalledWith("id, owner_id, expires_at");
    expect(query.eq.mock.calls).toEqual([
      ["owner_id", "owner-id"],
      ["id", "session-id"],
    ]);
    expect(query.gt).toHaveBeenCalledWith("expires_at", expect.any(String));
    expect(query.maybeSingle).toHaveBeenCalledOnce();
  });

  it("returns the same session-not-found error for absent owner-scoped rows", async () => {
    const query = createSessionQuery({ data: null, error: null });
    getSupabaseServerClient.mockReturnValue({ rpc, from: () => query });

    await expect(findOwnedSession("owner-id", "unknown-session")).rejects.toMatchObject({
      code: "SESSION_NOT_FOUND",
      status: 404,
    });
  });

  it("maps session query failures to a safe backend error", async () => {
    const query = createSessionQuery({
      data: null,
      error: { message: "private database detail" },
    });
    getSupabaseServerClient.mockReturnValue({ rpc, from: () => query });

    await expect(findOwnedSession("owner-id", "session-id")).rejects.toMatchObject({
      code: "DATA_BACKEND_UNAVAILABLE",
      status: 503,
    });
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

function createSessionQuery(result: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    gt: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.gt.mockReturnValue(query);
  return query;
}
