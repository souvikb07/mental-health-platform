// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import {
  JOURNEY_LAST_SESSION_ID_KEY,
  JOURNEY_SESSION_CONTEXT_KEY,
  clearAllJourneyStorage,
  getClarityMapStorageKey,
  getChatMetaStorageKey,
  getChatStorageKey,
  loadGeneratedClarityMap,
  loadChatMessages,
  loadChatMeta,
  loadLastSessionId,
  loadSessionContext,
  saveChatMessages,
  saveChatMeta,
  saveGeneratedClarityMap,
  saveSessionContext,
} from "../../src/lib/session/journey-storage";
import type { SessionContext } from "../../src/types/session-context";

const sessionContext: SessionContext = {
  sessionId: "mock_session_storage",
  countryCode: "US",
  countryLabel: "USA",
  ageConfirmed: true,
  consentAccepted: true,
  mainConcernCategory: "overwhelmed",
  mainConcernLabel: "Overwhelmed",
};

describe("journey storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("saves session context and last session id in sessionStorage", () => {
    saveSessionContext(sessionContext);

    expect(window.sessionStorage.getItem(JOURNEY_SESSION_CONTEXT_KEY)).toContain(
      '"sessionId":"mock_session_storage"',
    );
    expect(window.sessionStorage.getItem(JOURNEY_LAST_SESSION_ID_KEY)).toBe(
      sessionContext.sessionId,
    );
    expect(loadSessionContext()).toEqual(sessionContext);
    expect(loadLastSessionId()).toBe(sessionContext.sessionId);
  });

  it("falls back from legacy localStorage session context and migrates it", () => {
    window.localStorage.setItem(
      "mindbridge.sessionContext",
      JSON.stringify(sessionContext),
    );
    window.localStorage.setItem("mindbridge.sessionId", sessionContext.sessionId);

    expect(loadSessionContext()).toEqual(sessionContext);
    expect(window.sessionStorage.getItem(JOURNEY_SESSION_CONTEXT_KEY)).toContain(
      '"sessionId":"mock_session_storage"',
    );
    expect(loadLastSessionId()).toBe(sessionContext.sessionId);
  });

  it("does not throw or return context for malformed session JSON", () => {
    window.sessionStorage.setItem(JOURNEY_SESSION_CONTEXT_KEY, "{bad-json");

    expect(loadSessionContext()).toBeUndefined();
  });

  it("round-trips full chat message UI state by session id", () => {
    saveChatMessages(sessionContext.sessionId, [
      {
        id: "assistant_safety",
        role: "assistant",
        content: "Safety support comes first.",
        createdAt: "2026-05-28T00:00:00.000Z",
        source: "safety",
        risk: { level: "imminent" },
        safety: {
          showInlineSafetyCard: true,
          disableNormalNextStep: true,
          title: "Urgent support",
          message: "Please contact local emergency support now.",
          tone: "urgent",
        },
        resources: [
          {
            id: "us-988",
            title: "988 Lifeline",
            description: "A US crisis support line.",
            type: "crisis",
            country: "US",
            topics: ["self_harm"],
            riskLevels: ["high", "imminent"],
            actionLabel: "Open",
            href: "https://988lifeline.org",
          },
        ],
      },
    ]);

    expect(window.localStorage.getItem(getChatStorageKey(sessionContext.sessionId))).toBeNull();
    expect(loadChatMessages(sessionContext.sessionId)).toEqual([
      expect.objectContaining({
        content: "Safety support comes first.",
        source: "safety",
        risk: { level: "imminent" },
        safety: expect.objectContaining({ disableNormalNextStep: true }),
        resources: [expect.objectContaining({ id: "us-988" })],
      }),
    ]);
  });

  it("returns an empty chat transcript for malformed chat JSON", () => {
    window.sessionStorage.setItem(
      getChatStorageKey(sessionContext.sessionId),
      "{bad-json",
    );

    expect(loadChatMessages(sessionContext.sessionId)).toEqual([]);
  });

  it("round-trips chat meta by session id", () => {
    saveChatMeta(sessionContext.sessionId, {
      updatedAt: "2026-05-28T00:00:00.000Z",
      messageCount: 2,
      normalNextStepDisabled: true,
      clarityNotice: "Share one or two more messages first.",
    });

    expect(
      window.sessionStorage.getItem(getChatMetaStorageKey(sessionContext.sessionId)),
    ).toContain('"normalNextStepDisabled":true');
    expect(loadChatMeta(sessionContext.sessionId)).toEqual({
      updatedAt: "2026-05-28T00:00:00.000Z",
      messageCount: 2,
      normalNextStepDisabled: true,
      clarityNotice: "Share one or two more messages first.",
    });
  });

  it("round-trips generated Clarity Maps in sessionStorage only", () => {
    const response = {
      type: "clarity_map" as const,
      source: "fallback" as const,
      clarityMap: { status: "generated" as const },
    };

    saveGeneratedClarityMap(sessionContext.sessionId, response as never);

    expect(loadGeneratedClarityMap(sessionContext.sessionId)).toEqual(response);
    expect(
      window.localStorage.getItem(getClarityMapStorageKey(sessionContext.sessionId)),
    ).toBeNull();
  });

  it("clears only MindBridge-owned journey keys after anonymous deletion", () => {
    window.sessionStorage.setItem(JOURNEY_SESSION_CONTEXT_KEY, "{}");
    window.sessionStorage.setItem(JOURNEY_LAST_SESSION_ID_KEY, "session-id");
    window.sessionStorage.setItem("mindbridge:last-clarity-map-session", "session-id");
    window.sessionStorage.setItem("mindbridge:chat:session-id", "[]");
    window.sessionStorage.setItem("mindbridge:chat-meta:session-id", "{}");
    window.sessionStorage.setItem("mindbridge:clarity-map:session-id", "{}");
    window.sessionStorage.setItem("other:session-key", "keep");
    window.localStorage.setItem("mindbridge.sessionContext", "{}");
    window.localStorage.setItem("mindbridge.sessionId", "session-id");
    window.localStorage.setItem("other:local-key", "keep");

    clearAllJourneyStorage();

    expect(window.sessionStorage.getItem(JOURNEY_SESSION_CONTEXT_KEY)).toBeNull();
    expect(window.sessionStorage.getItem("mindbridge:chat:session-id")).toBeNull();
    expect(window.sessionStorage.getItem("mindbridge:chat-meta:session-id")).toBeNull();
    expect(window.sessionStorage.getItem("mindbridge:clarity-map:session-id")).toBeNull();
    expect(window.sessionStorage.getItem("other:session-key")).toBe("keep");
    expect(window.localStorage.getItem("mindbridge.sessionContext")).toBeNull();
    expect(window.localStorage.getItem("mindbridge.sessionId")).toBeNull();
    expect(window.localStorage.getItem("other:local-key")).toBe("keep");
  });
});
