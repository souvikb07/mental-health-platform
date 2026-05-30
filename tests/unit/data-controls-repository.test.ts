import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseServerClient, rpc } = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/db/supabase-server", () => ({
  getSupabaseServerClient,
}));

import {
  deleteAnonymousOwnerData,
  loadAnonymousOwnerExportRows,
} from "../../src/lib/db/repositories/data-controls";

const sessionId = "11111111-1111-4111-8111-111111111111";

describe("data-controls repository", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads parent sessions by owner before querying children by owned session ids", async () => {
    const queries = new Map<string, ReturnType<typeof createQuery>>();
    const from = vi.fn((table: string) => {
      const query = createQuery(
        table === "sessions" ? [sessionRow()] : [],
      );
      queries.set(table, query);
      return query;
    });
    getSupabaseServerClient.mockReturnValue({ from, rpc });

    await expect(loadAnonymousOwnerExportRows("owner-id")).resolves.toMatchObject({
      sessions: [sessionRow()],
    });

    expect(queries.get("sessions")?.eq).toHaveBeenCalledWith(
      "owner_id",
      "owner-id",
    );
    for (const table of [
      "consent_events",
      "messages",
      "clarity_maps",
      "feedback",
      "safety_events",
    ]) {
      expect(queries.get(table)?.in).toHaveBeenCalledWith("session_id", [
        sessionId,
      ]);
    }
    expect(queries.get("safety_events")?.eq).toHaveBeenCalledWith(
      "owner_id",
      "owner-id",
    );
    expect(queries.get("model_events")?.eq).toHaveBeenCalledWith(
      "owner_id",
      "owner-id",
    );
    expect(queries.get("audit_events")?.eq).toHaveBeenCalledWith(
      "owner_id",
      "owner-id",
    );
  });

  it("does not issue child-table reads when an owner has no sessions", async () => {
    const from = vi.fn(() => createQuery([]));
    getSupabaseServerClient.mockReturnValue({ from, rpc });

    await expect(loadAnonymousOwnerExportRows("owner-id")).resolves.toMatchObject({
      sessions: [],
      messages: [],
      clarityMaps: [],
    });

    expect(from).not.toHaveBeenCalledWith("messages");
    expect(from).not.toHaveBeenCalledWith("clarity_maps");
    expect(from).not.toHaveBeenCalledWith("feedback");
    expect(from).toHaveBeenCalledWith("model_events");
    expect(from).toHaveBeenCalledWith("audit_events");
  });

  it("deletes only through the narrow owner RPC", async () => {
    rpc.mockResolvedValue({ error: null });
    getSupabaseServerClient.mockReturnValue({ rpc });

    await deleteAnonymousOwnerData("owner-id");

    expect(rpc).toHaveBeenCalledWith("delete_anonymous_owner_data", {
      p_owner_id: "owner-id",
    });
  });

  it("maps export and delete backend failures to generic errors", async () => {
    getSupabaseServerClient.mockReturnValue({
      from: () => createQuery([], { message: "private detail" }),
      rpc: vi.fn().mockResolvedValue({ error: { message: "private detail" } }),
    });

    await expect(loadAnonymousOwnerExportRows("owner-id")).rejects.toMatchObject({
      code: "DATA_BACKEND_UNAVAILABLE",
      status: 503,
    });
    await expect(deleteAnonymousOwnerData("owner-id")).rejects.toMatchObject({
      code: "DATA_BACKEND_UNAVAILABLE",
      status: 503,
    });
  });
});

function createQuery(data: unknown[], error: unknown = null) {
  const result = Promise.resolve({ data, error });
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    then: result.then.bind(result),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.order.mockReturnValue(query);
  return query;
}

function sessionRow() {
  return {
    id: sessionId,
    created_at: "2026-05-01T00:00:00.000Z",
    expires_at: "2026-05-31T00:00:00.000Z",
    storage_consent_accepted: false,
    storage_policy_version: "sensitive_storage.v1",
    country_code: "US",
    main_concern_category: "overwhelmed",
    current_risk_level: "none",
    current_safety_state: null,
    onboarding_note_encrypted: null,
  };
}
