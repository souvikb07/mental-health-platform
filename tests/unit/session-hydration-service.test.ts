import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findLatestHydratedClarityMap: vi.fn(),
  findLatestOwnedSession: vi.fn(),
  findOwnedSessionIfPresent: vi.fn(),
  getDataEnvironment: vi.fn(),
  loadHydratedJourneyMessages: vi.fn(),
  enforceSessionsHydrateRateLimit: vi.fn(),
  createAuthoritativeSessionContext: vi.fn(),
  resolveAnonymousOwnerIfPresent: vi.fn(),
}));

vi.mock("@/lib/db/repositories/clarity-maps", () => ({
  findLatestHydratedClarityMap: mocks.findLatestHydratedClarityMap,
}));
vi.mock("@/lib/db/repositories/messages", () => ({
  loadHydratedJourneyMessages: mocks.loadHydratedJourneyMessages,
}));
vi.mock("@/lib/db/repositories/sessions", () => ({
  findLatestOwnedSession: mocks.findLatestOwnedSession,
  findOwnedSessionIfPresent: mocks.findOwnedSessionIfPresent,
}));
vi.mock("@/lib/server/config/data-env", () => ({
  getDataEnvironment: mocks.getDataEnvironment,
}));
vi.mock("@/lib/server/rate-limit/enforce", () => ({
  enforceSessionsHydrateRateLimit: mocks.enforceSessionsHydrateRateLimit,
}));
vi.mock("@/lib/server/session/authoritative-context", () => ({
  createAuthoritativeSessionContext: mocks.createAuthoritativeSessionContext,
}));
vi.mock("@/lib/server/session/ownership", () => ({
  resolveAnonymousOwnerIfPresent: mocks.resolveAnonymousOwnerIfPresent,
}));

import { hydrateAnonymousSession } from "../../src/lib/server/session/hydration";

describe("session hydration service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getDataEnvironment.mockReturnValue({ mode: "supabase" });
    mocks.resolveAnonymousOwnerIfPresent.mockResolvedValue({ id: "owner-id" });
    mocks.findOwnedSessionIfPresent.mockResolvedValue(session(true));
    mocks.findLatestOwnedSession.mockResolvedValue(session(true));
    mocks.createAuthoritativeSessionContext.mockReturnValue(sessionContext());
    mocks.loadHydratedJourneyMessages.mockResolvedValue([journeyMessage()]);
    mocks.findLatestHydratedClarityMap.mockResolvedValue(null);
  });

  it("returns unavailable without database work in transient mode", async () => {
    mocks.getDataEnvironment.mockReturnValue({ mode: "transient" });

    await expect(hydrateAnonymousSession(request())).resolves.toEqual({
      status: "unavailable",
    });
    expect(mocks.resolveAnonymousOwnerIfPresent).not.toHaveBeenCalled();
  });

  it("returns empty for a missing cookie owner", async () => {
    mocks.resolveAnonymousOwnerIfPresent.mockResolvedValue(null);

    await expect(hydrateAnonymousSession(request())).resolves.toEqual({
      status: "empty",
    });
    expect(mocks.enforceSessionsHydrateRateLimit).not.toHaveBeenCalled();
  });

  it("hydrates an exact opted-in owner-scoped journey after rate limiting", async () => {
    await expect(
      hydrateAnonymousSession(request(), sessionId),
    ).resolves.toMatchObject({
      status: "hydrated",
      retainedContentHydrated: true,
      messages: [journeyMessage()],
    });

    expect(mocks.enforceSessionsHydrateRateLimit).toHaveBeenCalledWith({
      id: "owner-id",
    });
    expect(mocks.findOwnedSessionIfPresent).toHaveBeenCalledWith(
      "owner-id",
      sessionId,
    );
    expect(mocks.findLatestOwnedSession).not.toHaveBeenCalled();
  });

  it("uses the latest active owned session only when no locator is supplied", async () => {
    await hydrateAnonymousSession(request());

    expect(mocks.findLatestOwnedSession).toHaveBeenCalledWith("owner-id");
    expect(mocks.findOwnedSessionIfPresent).not.toHaveBeenCalled();
  });

  it("returns raw-free context without retained-content reads after opt-out", async () => {
    mocks.findOwnedSessionIfPresent.mockResolvedValue(session(false));

    await expect(
      hydrateAnonymousSession(request(), sessionId),
    ).resolves.toMatchObject({
      status: "hydrated",
      retainedContentHydrated: false,
      messages: [],
    });
    expect(mocks.loadHydratedJourneyMessages).not.toHaveBeenCalled();
    expect(mocks.findLatestHydratedClarityMap).not.toHaveBeenCalled();
  });
});

const sessionId = "11111111-1111-4111-8111-111111111111";

function session(storageConsentAccepted: boolean) {
  return {
    id: sessionId,
    ownerId: "owner-id",
    expiresAt: "2026-06-29T00:00:00.000Z",
    storageConsentAccepted,
  };
}

function sessionContext() {
  return {
    sessionId,
    countryCode: "US" as const,
    storageConsentAccepted: true,
  };
}

function journeyMessage() {
  return {
    id: "assistant-id",
    role: "assistant" as const,
    content: "Retained response",
    createdAt: "2026-05-31T00:00:00.000Z",
  };
}

function request() {
  return new Request("https://mindbridge.example/api/sessions");
}
