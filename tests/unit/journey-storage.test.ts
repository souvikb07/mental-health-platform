// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import {
  JOURNEY_LAST_SESSION_ID_KEY,
  JOURNEY_SESSION_CONTEXT_KEY,
  getChatMetaStorageKey,
  getChatStorageKey,
  loadChatMessages,
  loadChatMeta,
  loadLastSessionId,
  loadSessionContext,
  saveChatMessages,
  saveChatMeta,
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
});
