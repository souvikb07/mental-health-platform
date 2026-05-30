import { Buffer } from "node:buffer";

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  claimChatTurn,
  completeChatTurn,
  findPersistedChatResponse,
  recordAuthorizedAuditEvent,
} = vi.hoisted(() => ({
  claimChatTurn: vi.fn(),
  completeChatTurn: vi.fn(),
  findPersistedChatResponse: vi.fn(),
  recordAuthorizedAuditEvent: vi.fn(),
}));

vi.mock("@/lib/db/repositories/chat-turns", () => ({
  claimChatTurn,
  completeChatTurn,
}));
vi.mock("@/lib/db/repositories/messages", () => ({
  findPersistedChatResponse,
}));
vi.mock("@/lib/db/repositories/event-metadata", () => ({
  recordAuthorizedAuditEvent,
}));

import {
  createPersistedChatResponse,
  type ChatResponse,
} from "../../src/lib/server/chat";
import { decryptSensitiveJson } from "../../src/lib/server/crypto/sensitive-data";

const encryptionKey = Buffer.alloc(32, 6).toString("base64");
const clientMessageId = "11111111-1111-4111-8111-111111111111";

describe("persisted chat turns", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("MIND_BRIDGE_DATA_ENCRYPTION_KEY_V1", encryptionKey);
    claimChatTurn.mockResolvedValue({
      status: "claimed",
      storageConsentAccepted: true,
      currentSafetyState: null,
    });
    completeChatTurn.mockResolvedValue(undefined);
    recordAuthorizedAuditEvent.mockResolvedValue(undefined);
  });

  it("encrypts an opted-in user and assistant pair before atomic completion", async () => {
    const conversationAgent = vi.fn().mockResolvedValue({
      content: "What part feels hardest?",
      source: "openai",
    });

    await createPersistedChatResponse(request(), owned(true), {
      conversationAgent,
    });

    const completion = completeChatTurn.mock.calls[0][0];
    expect(completion).not.toHaveProperty("message");
    expect(completion).not.toHaveProperty("content");
    expect(
      decryptSensitiveJson<{ message: { content: string } }>(
        completion.userContentEncrypted,
      ).message.content,
    ).toBe("I feel stretched thin.");
    expect(
      decryptSensitiveJson<{ response: ChatResponse }>(
        completion.assistantContentEncrypted,
      ).response.assistantMessage.content,
    ).toBe("What part feels hardest?");
    expect(completion.eventBundle).toMatchObject({
      audit_event: {
        route_key: "api/chat",
        outcome_code: "completed",
      },
      model_events: [
        {
          task_code: "conversation_reply",
          source_code: "openai",
          post_validation_outcome_code: "passed",
          store_disabled: true,
        },
      ],
    });
    expect(JSON.stringify(completion.eventBundle)).not.toContain(
      "I feel stretched thin.",
    );
    expect(JSON.stringify(completion.eventBundle)).not.toContain(
      "What part feels hardest?",
    );
  });

  it("replays an opted-in completed response without invoking AI", async () => {
    const replayed = chatResponse();
    const conversationAgent = vi.fn();
    claimChatTurn.mockResolvedValue({
      status: "completed",
      storageConsentAccepted: true,
      currentSafetyState: "normal_support",
    });
    findPersistedChatResponse.mockResolvedValue(replayed);

    await expect(
      createPersistedChatResponse(request(), owned(true), {
        conversationAgent,
      }),
    ).resolves.toEqual(replayed);
    expect(findPersistedChatResponse).toHaveBeenCalledWith(
      owned(true).session.id,
      clientMessageId,
    );
    expect(conversationAgent).not.toHaveBeenCalled();
    expect(completeChatTurn).not.toHaveBeenCalled();
    expect(recordAuthorizedAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventBundle: expect.objectContaining({
          safety_events: [],
          model_events: [],
          audit_event: expect.objectContaining({
            route_key: "api/chat",
            outcome_code: "replayed",
          }),
        }),
      }),
    );
  });

  it("returns a safe conflict for an active duplicate", async () => {
    claimChatTurn.mockResolvedValue({
      status: "in_progress",
      storageConsentAccepted: true,
      currentSafetyState: null,
    });

    await expect(
      createPersistedChatResponse(request(), owned(true)),
    ).rejects.toMatchObject({
      code: "CHAT_TURN_IN_PROGRESS",
      status: 409,
      headers: { "Retry-After": "5" },
    });
  });

  it("does not regenerate a completed opted-out turn", async () => {
    const conversationAgent = vi.fn();
    claimChatTurn.mockResolvedValue({
      status: "completed",
      storageConsentAccepted: false,
      currentSafetyState: "normal_support",
    });

    await expect(
      createPersistedChatResponse(request(), owned(false), {
        conversationAgent,
      }),
    ).rejects.toMatchObject({
      code: "CHAT_TURN_RETRY_UNAVAILABLE",
      status: 409,
    });
    expect(conversationAgent).not.toHaveBeenCalled();
  });

  it("stores no content for opted-out turns and preserves prior high-risk state", async () => {
    const conversationAgent = vi.fn();
    claimChatTurn.mockResolvedValue({
      status: "claimed",
      storageConsentAccepted: false,
      currentSafetyState: "active_suicidal_ideation",
    });

    const response = await createPersistedChatResponse(
      request(),
      owned(false),
      { conversationAgent },
    );

    expect(response.source).toBe("safety");
    expect(response.safetyState).toBe("active_suicidal_ideation");
    expect(conversationAgent).not.toHaveBeenCalled();
    expect(completeChatTurn).toHaveBeenCalledWith(expect.objectContaining({
      userContentEncrypted: null,
      assistantContentEncrypted: null,
      safetyState: "active_suicidal_ideation",
    }));
  });

  it("returns a safety route when completion storage fails", async () => {
    claimChatTurn.mockResolvedValue({
      status: "claimed",
      storageConsentAccepted: false,
      currentSafetyState: null,
    });
    completeChatTurn.mockRejectedValue(new Error("private database detail"));

    await expect(
      createPersistedChatResponse({
        ...request(),
        message: "i want to kill myself",
      }, owned(false)),
    ).resolves.toMatchObject({
      source: "safety",
      persistenceStatus: "unavailable",
    });
  });

  it("fails a normal response safely when completion storage fails", async () => {
    completeChatTurn.mockRejectedValue(new Error("private database detail"));

    await expect(
      createPersistedChatResponse(request(), owned(true), {
        conversationAgent: vi.fn().mockResolvedValue({
          content: "What part feels hardest?",
          source: "openai",
        }),
      }),
    ).rejects.toMatchObject({
      code: "DATA_BACKEND_UNAVAILABLE",
      status: 503,
    });
  });
});

function request() {
  return {
    sessionId: "22222222-2222-4222-8222-222222222222",
    clientMessageId,
    message: "I feel stretched thin.",
    sessionContext: {
      sessionId: "22222222-2222-4222-8222-222222222222",
      countryCode: "IN" as const,
      mainConcernCategory: "sleep_energy" as const,
    },
  };
}

function owned(storageConsentAccepted: boolean) {
  return {
    owner: { id: "owner-id" },
    session: {
      id: "22222222-2222-4222-8222-222222222222",
      ownerId: "owner-id",
      expiresAt: "2026-06-29T00:00:00.000Z",
      storageConsentAccepted,
      currentSafetyState: null,
      countryCode: "US" as const,
      mainConcernCategory: "overwhelmed" as const,
      onboardingNoteEncrypted: null,
    },
  };
}

function chatResponse(): ChatResponse {
  return {
    assistantMessage: {
      id: "assistant-id",
      role: "assistant",
      content: "Stored response.",
      createdAt: "2026-05-30T00:00:01.000Z",
    },
    risk: {
      level: "low",
      categories: [],
      requiresCrisisResponse: false,
    },
    nextRecommendedAction: "continue_chat",
    mode: "normal",
    safety: null,
    resources: [],
    source: "fallback",
    safetyState: "normal_support",
  };
}
