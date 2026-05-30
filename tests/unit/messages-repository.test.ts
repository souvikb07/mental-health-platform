import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseServerClient } = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/db/supabase-server", () => ({
  getSupabaseServerClient,
}));

vi.mock("@/lib/server/persistence/message-payloads", () => ({
  decryptChatAssistantResponse: vi.fn(() => ({ replayed: "chat" })),
  decryptContextIntakeResponse: vi.fn(() => ({ replayed: "intake" })),
}));

import {
  findPersistedChatResponse,
  findPersistedContextIntakeResponse,
} from "../../src/lib/db/repositories/messages";

describe("messages repository", () => {
  beforeEach(() => {
    getSupabaseServerClient.mockReset();
  });

  it("loads the one retained context-intake result by session and source", async () => {
    const query = createQuery({
      data: { content_encrypted: { ciphertext: "encrypted" } },
      error: null,
    });
    getSupabaseServerClient.mockReturnValue({ from: () => query });

    await expect(
      findPersistedContextIntakeResponse("session-id"),
    ).resolves.toEqual({ replayed: "intake" });
    expect(query.eq.mock.calls).toEqual([
      ["session_id", "session-id"],
      ["source", "context_intake_result"],
    ]);
  });

  it("loads a retained assistant response only through its reply id", async () => {
    const query = createQuery({
      data: { content_encrypted: { ciphertext: "encrypted" } },
      error: null,
    });
    getSupabaseServerClient.mockReturnValue({ from: () => query });

    await expect(
      findPersistedChatResponse("session-id", "client-message-id"),
    ).resolves.toEqual({ replayed: "chat" });
    expect(query.eq.mock.calls).toEqual([
      ["session_id", "session-id"],
      ["reply_to_client_message_id", "client-message-id"],
    ]);
  });

  it("fails safely when a replay row is unavailable", async () => {
    const query = createQuery({ data: null, error: null });
    getSupabaseServerClient.mockReturnValue({ from: () => query });

    await expect(
      findPersistedChatResponse("session-id", "client-message-id"),
    ).rejects.toMatchObject({
      code: "DATA_BACKEND_UNAVAILABLE",
      status: 503,
    });
  });
});

function createQuery(result: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}
