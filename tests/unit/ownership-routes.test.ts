import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createChatResponse,
  createClarityMapResponse,
  createContextIntakeResponse,
  createPersistedChatResponse,
  createPersistedContextIntakeResponse,
  createSession,
  receiveMockFeedback,
  resolveOwnedSession,
} = vi.hoisted(() => ({
  createChatResponse: vi.fn(),
  createClarityMapResponse: vi.fn(),
  createContextIntakeResponse: vi.fn(),
  createPersistedChatResponse: vi.fn(),
  createPersistedContextIntakeResponse: vi.fn(),
  createSession: vi.fn(),
  receiveMockFeedback: vi.fn(),
  resolveOwnedSession: vi.fn(),
}));

vi.mock("@/lib/server/chat", () => ({
  createChatResponse,
  createPersistedChatResponse,
}));
vi.mock("@/lib/server/clarity-map", () => ({ createClarityMapResponse }));
vi.mock("@/lib/server/context-intake", () => ({
  createContextIntakeResponse,
  createPersistedContextIntakeResponse,
}));
vi.mock("@/lib/server/feedback", () => ({ receiveMockFeedback }));
vi.mock("@/lib/server/session/ownership", () => ({ resolveOwnedSession }));
vi.mock("@/lib/server/sessions", () => ({ createSession }));

import { POST as postChat } from "../../src/app/api/chat/route";
import { POST as postClarityMap } from "../../src/app/api/clarity-map/route";
import { POST as postContextIntake } from "../../src/app/api/context-intake/route";
import { POST as postFeedback } from "../../src/app/api/feedback/route";
import { POST as postSessions } from "../../src/app/api/sessions/route";
import { sessionNotFound } from "../../src/lib/server/http/api-errors";

const sessionId = "11111111-1111-4111-8111-111111111111";

describe("session-bound route ownership guards", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resolveOwnedSession.mockResolvedValue(null);
    createContextIntakeResponse.mockResolvedValue({ type: "opener" });
    createPersistedContextIntakeResponse.mockResolvedValue({ type: "opener" });
    createChatResponse.mockResolvedValue({ source: "fallback" });
    createPersistedChatResponse.mockResolvedValue({ source: "fallback" });
    createClarityMapResponse.mockResolvedValue({ clarityMap: {} });
    receiveMockFeedback.mockReturnValue({ status: "received" });
    createSession.mockResolvedValue({
      result: {
        sessionId,
        sessionContext: { sessionId, countryCode: "US" },
        status: "created",
        storageConsentAccepted: false,
        serverOwned: false,
      },
    });
  });

  it("guards context intake before invoking its service", async () => {
    await expectOk(
      postJson(postContextIntake, "/api/context-intake", {
        sessionContext: validSessionContext(),
      }),
    );

    expect(resolveOwnedSession).toHaveBeenCalledWith(
      expect.any(Request),
      sessionId,
    );
    expect(createContextIntakeResponse).toHaveBeenCalledOnce();
  });

  it("uses persisted context-intake orchestration after a Supabase ownership lookup", async () => {
    const owned = { owner: { id: "owner-id" }, session: { id: sessionId } };
    resolveOwnedSession.mockResolvedValue(owned);

    await expectOk(
      postJson(postContextIntake, "/api/context-intake", {
        sessionContext: validSessionContext(),
      }),
    );

    expect(createPersistedContextIntakeResponse).toHaveBeenCalledWith(
      validSessionContext(),
      owned,
    );
    expect(createContextIntakeResponse).not.toHaveBeenCalled();
  });

  it("guards chat before invoking its service", async () => {
    await expectOk(
      postJson(postChat, "/api/chat", {
        sessionId,
        message: "I feel stretched thin this week.",
      }),
    );

    expect(resolveOwnedSession).toHaveBeenCalledWith(
      expect.any(Request),
      sessionId,
    );
    expect(createChatResponse).toHaveBeenCalledOnce();
  });

  it("uses persisted chat orchestration after a Supabase ownership lookup", async () => {
    const owned = { owner: { id: "owner-id" }, session: { id: sessionId } };
    resolveOwnedSession.mockResolvedValue(owned);

    await expectOk(
      postJson(postChat, "/api/chat", {
        sessionId,
        message: "I feel stretched thin this week.",
      }),
    );

    expect(createPersistedChatResponse).toHaveBeenCalledWith(
      expect.any(Object),
      owned,
    );
    expect(createChatResponse).not.toHaveBeenCalled();
  });

  it("guards legacy Clarity Map generation before invoking its service", async () => {
    await expectOk(postJson(postClarityMap, "/api/clarity-map", { sessionId }));

    expect(resolveOwnedSession).toHaveBeenCalledWith(
      expect.any(Request),
      sessionId,
    );
    expect(createClarityMapResponse).toHaveBeenCalledOnce();
  });

  it("guards feedback before invoking its service", async () => {
    await expectOk(
      postJson(postFeedback, "/api/feedback", {
        sessionId,
        clarityRating: 4,
        helpfulnessRating: 4,
      }),
    );

    expect(resolveOwnedSession).toHaveBeenCalledWith(
      expect.any(Request),
      sessionId,
    );
    expect(receiveMockFeedback).toHaveBeenCalledOnce();
  });

  it("does not invoke the chat service after a rejected ownership lookup", async () => {
    resolveOwnedSession.mockRejectedValue(sessionNotFound());

    const response = await postJson(postChat, "/api/chat", {
      sessionId,
      message: "I feel stretched thin this week.",
    });

    expect(response.status).toBe(404);
    expect(createChatResponse).not.toHaveBeenCalled();
  });

  it("maps unexpected lookup failures to safe backend errors", async () => {
    resolveOwnedSession.mockRejectedValue(
      new Error("private database detail raw-token"),
    );

    const response = await postJson(postChat, "/api/chat", {
      sessionId,
      message: "I feel stretched thin this week.",
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "DATA_BACKEND_UNAVAILABLE",
        message: "Please try again later.",
      },
    });
    expect(createChatResponse).not.toHaveBeenCalled();
  });

  it("rejects malformed chat client message ids before ownership lookup", async () => {
    const response = await postJson(postChat, "/api/chat", {
      sessionId,
      clientMessageId: "not-a-uuid",
      message: "I feel stretched thin this week.",
    });

    expect(response.status).toBe(400);
    expect(resolveOwnedSession).not.toHaveBeenCalled();
  });

  it("rejects cross-origin session creation before invoking its service", async () => {
    const response = await postJson(
      postSessions,
      "/api/sessions",
      {
        country: "USA",
        ageConfirmed: true,
        consentAccepted: true,
        mainConcernCategory: "overwhelmed",
      },
      { Origin: "https://other.example" },
    );

    expect(response.status).toBe(403);
    expect(createSession).not.toHaveBeenCalled();
  });

  it.each([
    [
      postChat,
      "/api/chat",
      {
        sessionId,
        message: "I feel stretched thin this week.",
        sessionContext: { ...validSessionContext(), sessionId: crypto.randomUUID() },
      },
    ],
    [
      postClarityMap,
      "/api/clarity-map",
      {
        sessionId,
        sessionContext: { ...validSessionContext(), sessionId: crypto.randomUUID() },
        messages: [],
      },
    ],
  ])("rejects contradictory nested session locators", async (handler, path, body) => {
    const response = await postJson(handler, path, body);

    expect(response.status).toBe(400);
    expect(resolveOwnedSession).not.toHaveBeenCalled();
  });
});

function validSessionContext() {
  return {
    sessionId,
    countryCode: "US",
    countryLabel: "USA",
    ageConfirmed: true,
    consentAccepted: true,
    mainConcernCategory: "overwhelmed",
    mainConcernLabel: "Overwhelmed",
  };
}

async function expectOk(responsePromise: Promise<Response>) {
  expect((await responsePromise).status).toBe(200);
}

function postJson(
  handler: (request: Request) => Promise<Response>,
  path: string,
  body: unknown,
  headers: HeadersInit = {},
) {
  return handler(
    new Request(`https://mindbridge.example${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    }),
  );
}
