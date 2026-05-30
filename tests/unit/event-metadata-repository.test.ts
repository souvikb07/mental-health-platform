import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseServerClient, rpc } = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/db/supabase-server", () => ({
  getSupabaseServerClient,
}));

import { recordAuthorizedAuditEvent } from "../../src/lib/db/repositories/event-metadata";

describe("event metadata repository", () => {
  beforeEach(() => {
    rpc.mockReset();
    getSupabaseServerClient.mockReset();
    getSupabaseServerClient.mockReturnValue({ rpc });
  });

  it("records an authorized audit event through the owner-scoped RPC", async () => {
    rpc.mockResolvedValue({ error: null });

    await recordAuthorizedAuditEvent({
      ownerId: "owner-id",
      sessionId: "session-id",
      eventBundle: eventBundle(),
    });

    expect(rpc).toHaveBeenCalledWith("record_authorized_audit_event", {
      p_owner_id: "owner-id",
      p_session_id: "session-id",
      p_event_bundle: eventBundle(),
    });
  });

  it("maps backend failures to the generic unavailable error", async () => {
    rpc.mockResolvedValue({ error: { message: "private database detail" } });

    await expect(recordAuthorizedAuditEvent({
      ownerId: "owner-id",
      sessionId: "session-id",
      eventBundle: eventBundle(),
    })).rejects.toMatchObject({
      code: "DATA_BACKEND_UNAVAILABLE",
      status: 503,
    });
  });
});

function eventBundle() {
  return {
    safety_events: [],
    model_events: [],
    audit_event: {
      event_type: "authorized_session_action" as const,
      route_key: "api/chat" as const,
      outcome_code: "replayed" as const,
      error_code: null,
    },
  };
}
