import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseServerClient } = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/db/supabase-server", () => ({
  getSupabaseServerClient,
}));

vi.mock("@/lib/server/persistence/message-payloads", () => ({
  decryptChatAssistantResponse: vi.fn(() => ({
    replayed: "chat",
    assistantMessage: { id: "assistant-id", role: "assistant" },
  })),
  decryptChatUserMessage: vi.fn(() => ({ id: "user-id", role: "user" })),
  decryptContextIntakeResponse: vi.fn(() => ({
    replayed: "intake",
    assistantMessage: { id: "intake-id", role: "assistant" },
  })),
}));

import {
  findPersistedChatResponse,
  findPersistedContextIntakeResponse,
  loadPersistedTranscript,
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
    ).resolves.toMatchObject({ replayed: "intake" });
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
    ).resolves.toMatchObject({ replayed: "chat" });
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

  it("loads an ordered decrypted transcript with internal row ids", async () => {
    const query = createListQuery({
      data: [
        {
          id: "row-intake",
          source: "context_intake_result",
          content_encrypted: { ciphertext: "encrypted" },
        },
        {
          id: "row-user",
          source: "chat_user",
          content_encrypted: { ciphertext: "encrypted" },
        },
        {
          id: "row-assistant",
          source: "chat_fallback",
          content_encrypted: { ciphertext: "encrypted" },
        },
      ],
      error: null,
    });
    getSupabaseServerClient.mockReturnValue({ from: () => query });

    await expect(loadPersistedTranscript("session-id")).resolves.toEqual({
      messageRowIds: ["row-intake", "row-user", "row-assistant"],
      hasChatUser: true,
      messages: [
        { id: "intake-id", role: "assistant" },
        { id: "user-id", role: "user" },
        { id: "assistant-id", role: "assistant" },
      ],
    });
    expect(query.order.mock.calls).toEqual([
      ["created_at", { ascending: true }],
      ["id", { ascending: true }],
    ]);
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

function createListQuery(result: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.order.mockReturnValueOnce(query).mockResolvedValueOnce(result);
  return query;
}
