import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createChatResponse: vi.fn(),
  createClarityMapResponse: vi.fn(),
  createContextIntakeResponse: vi.fn(),
  createSession: vi.fn(),
  enforceChatRateLimit: vi.fn(),
  enforceClarityMapRateLimit: vi.fn(),
  enforceContextIntakeRateLimit: vi.fn(),
  enforceFeedbackRateLimit: vi.fn(),
  enforceResourcesRateLimit: vi.fn(),
  enforceSessionCreationRateLimit: vi.fn(),
  getMockResources: vi.fn(),
  receiveMockFeedback: vi.fn(),
  resolveOwnedSession: vi.fn(),
}));

vi.mock("@/lib/server/chat", () => ({ createChatResponse: mocks.createChatResponse }));
vi.mock("@/lib/server/clarity-map", () => ({ createClarityMapResponse: mocks.createClarityMapResponse }));
vi.mock("@/lib/server/context-intake", () => ({ createContextIntakeResponse: mocks.createContextIntakeResponse }));
vi.mock("@/lib/server/feedback", () => ({ receiveMockFeedback: mocks.receiveMockFeedback }));
vi.mock("@/lib/server/resources", () => ({ getMockResources: mocks.getMockResources }));
vi.mock("@/lib/server/sessions", () => ({ createSession: mocks.createSession }));
vi.mock("@/lib/server/session/ownership", () => ({ resolveOwnedSession: mocks.resolveOwnedSession }));
vi.mock("@/lib/server/rate-limit/enforce", () => ({
  enforceChatRateLimit: mocks.enforceChatRateLimit,
  enforceClarityMapRateLimit: mocks.enforceClarityMapRateLimit,
  enforceContextIntakeRateLimit: mocks.enforceContextIntakeRateLimit,
  enforceFeedbackRateLimit: mocks.enforceFeedbackRateLimit,
  enforceResourcesRateLimit: mocks.enforceResourcesRateLimit,
  enforceSessionCreationRateLimit: mocks.enforceSessionCreationRateLimit,
}));

import { POST as postChat } from "../../src/app/api/chat/route";
import { POST as postClarityMap } from "../../src/app/api/clarity-map/route";
import { POST as postContextIntake } from "../../src/app/api/context-intake/route";
import { POST as postFeedback } from "../../src/app/api/feedback/route";
import { GET as getResources } from "../../src/app/api/resources/route";
import { POST as postSessions } from "../../src/app/api/sessions/route";
import { rateLimited } from "../../src/lib/server/http/api-errors";

const sessionId = "11111111-1111-4111-8111-111111111111";
const owned = { owner: { id: "owner-id" }, session: { id: sessionId } };

describe("rate-limited routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.resolveOwnedSession.mockResolvedValue(owned);
    mocks.createSession.mockResolvedValue({ result: { status: "created" } });
    mocks.createContextIntakeResponse.mockResolvedValue({ type: "opener" });
    mocks.createChatResponse.mockResolvedValue({ source: "fallback" });
    mocks.createClarityMapResponse.mockResolvedValue({ clarityMap: {} });
    mocks.receiveMockFeedback.mockReturnValue({ status: "received" });
    mocks.getMockResources.mockReturnValue({ resources: [] });
  });

  it("rate-limits session creation before its service", async () => {
    mocks.enforceSessionCreationRateLimit.mockRejectedValue(rateLimited(19));

    await expectDenied(postJson(postSessions, "/api/sessions", sessionRequest()), 19);
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it.each([
    [postContextIntake, "/api/context-intake", { sessionContext: sessionContext() }, mocks.enforceContextIntakeRateLimit, mocks.createContextIntakeResponse],
    [postChat, "/api/chat", { sessionId, message: "I feel stretched thin." }, mocks.enforceChatRateLimit, mocks.createChatResponse],
    [postClarityMap, "/api/clarity-map", { sessionId }, mocks.enforceClarityMapRateLimit, mocks.createClarityMapResponse],
    [postFeedback, "/api/feedback", { sessionId, clarityRating: 4, helpfulnessRating: 4 }, mocks.enforceFeedbackRateLimit, mocks.receiveMockFeedback],
  ])("rate-limits %s after ownership and before its service", async (handler, path, body, enforce, service) => {
    enforce.mockRejectedValue(rateLimited(23));

    await expectDenied(postJson(handler, path, body), 23);
    expect(mocks.resolveOwnedSession).toHaveBeenCalled();
    expect(enforce).toHaveBeenCalledWith(owned);
    expect(service).not.toHaveBeenCalled();
  });

  it("rate-limits resources before static selection", async () => {
    mocks.enforceResourcesRateLimit.mockRejectedValue(rateLimited(29));

    await expectDenied(
      getResources(new Request("https://mindbridge.example/api/resources")),
      29,
    );
    expect(mocks.getMockResources).not.toHaveBeenCalled();
  });
});

async function expectDenied(responsePromise: Promise<Response>, retryAfter: number) {
  const response = await responsePromise;

  expect(response.status).toBe(429);
  expect(response.headers.get("Retry-After")).toBe(String(retryAfter));
  await expect(response.json()).resolves.toEqual({
    error: {
      code: "RATE_LIMITED",
      message: "Please wait before trying again.",
    },
  });
}

function postJson(
  handler: (request: Request) => Promise<Response>,
  path: string,
  body: unknown,
) {
  return handler(
    new Request(`https://mindbridge.example${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function sessionRequest() {
  return {
    country: "USA",
    ageConfirmed: true,
    consentAccepted: true,
    mainConcernCategory: "overwhelmed",
  };
}

function sessionContext() {
  return {
    sessionId,
    countryCode: "US",
    ageConfirmed: true,
    consentAccepted: true,
    mainConcernCategory: "overwhelmed",
    mainConcernLabel: "Overwhelmed",
  };
}
