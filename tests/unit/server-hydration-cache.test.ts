// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchSessionHydration: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  fetchSessionHydration: mocks.fetchSessionHydration,
}));

import { hydrateCurrentJourney } from "../../src/lib/session/server-hydration";
import {
  loadChatMessages,
  loadSessionContext,
  saveChatMessages,
  saveGeneratedClarityMap,
  saveSessionContext,
} from "../../src/lib/session/journey-storage";

describe("browser server hydration cache", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("replaces opted-in cache with retained server safety UI", async () => {
    saveSessionContext(context());
    saveChatMessages(sessionId, [{ ...message(), content: "stale cache" }]);
    mocks.fetchSessionHydration.mockResolvedValue({
      status: "hydrated",
      serverOwned: true,
      expiresAt: "2026-06-29T00:00:00.000Z",
      retainedContentHydrated: true,
      sessionContext: context(),
      messages: [message()],
    });

    await hydrateCurrentJourney({ sessionId });

    expect(loadChatMessages(sessionId)).toEqual([message()]);
  });

  it("preserves matching opted-out transcript and optional browser text", async () => {
    saveSessionContext({ ...context(), mainConcernText: "browser-only note" });
    saveChatMessages(sessionId, [{ ...message(), content: "browser-only reply" }]);
    mocks.fetchSessionHydration.mockResolvedValue({
      status: "hydrated",
      serverOwned: true,
      expiresAt: "2026-06-29T00:00:00.000Z",
      retainedContentHydrated: false,
      sessionContext: context(),
      messages: [],
    });

    await hydrateCurrentJourney({ sessionId });

    expect(loadSessionContext()?.mainConcernText).toBe("browser-only note");
    expect(loadChatMessages(sessionId)[0].content).toBe("browser-only reply");
  });

  it("preserves cache when hydration is unavailable", async () => {
    saveSessionContext(context());
    saveChatMessages(sessionId, [{ ...message(), content: "keep cache" }]);
    mocks.fetchSessionHydration.mockRejectedValue(new Error("offline"));

    await hydrateCurrentJourney({ sessionId });

    expect(loadChatMessages(sessionId)[0].content).toBe("keep cache");
  });

  it("skips UUID-only server hydration for transient mock locators", async () => {
    await hydrateCurrentJourney({ sessionId: "mock_session_demo" });

    expect(mocks.fetchSessionHydration).not.toHaveBeenCalled();
  });

  it("removes stale opted-in cached maps when no retained map exists", async () => {
    saveGeneratedClarityMap(sessionId, mapResponse());
    mocks.fetchSessionHydration.mockResolvedValue({
      status: "hydrated",
      serverOwned: true,
      expiresAt: "2026-06-29T00:00:00.000Z",
      retainedContentHydrated: true,
      sessionContext: context(),
      messages: [],
    });

    await hydrateCurrentJourney({ sessionId });

    expect(
      window.sessionStorage.getItem(`mindbridge:clarity-map:${sessionId}`),
    ).toBeNull();
  });
});

const sessionId = "11111111-1111-4111-8111-111111111111";

function context() {
  return {
    sessionId,
    countryCode: "US" as const,
    storageConsentAccepted: true,
  };
}

function message() {
  return {
    id: "assistant-safety",
    role: "assistant" as const,
    content: "Safety support comes first.",
    createdAt: "2026-05-31T00:00:00.000Z",
    source: "safety" as const,
    risk: { level: "imminent" as const },
    safety: {
      showInlineSafetyCard: true,
      disableNormalNextStep: true,
      title: "Urgent support",
      message: "Please contact local emergency support now.",
      tone: "urgent" as const,
    },
  };
}

function mapResponse() {
  return {
    type: "clarity_map" as const,
    source: "fallback" as const,
    clarityMap: { status: "generated" as const },
  } as never;
}
