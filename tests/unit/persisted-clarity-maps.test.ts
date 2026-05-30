import { Buffer } from "node:buffer";

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  claimClarityMapGeneration,
  loadPersistedTranscript,
  mergeOwnedSessionSafetyState,
  persistClarityMapResult,
} = vi.hoisted(() => ({
  claimClarityMapGeneration: vi.fn(),
  loadPersistedTranscript: vi.fn(),
  mergeOwnedSessionSafetyState: vi.fn(),
  persistClarityMapResult: vi.fn(),
}));

vi.mock("@/lib/db/repositories/clarity-maps", () => ({
  claimClarityMapGeneration,
  mergeOwnedSessionSafetyState,
  persistClarityMapResult,
}));
vi.mock("@/lib/db/repositories/messages", () => ({
  loadPersistedTranscript,
}));

import {
  createPersistedClarityMapResponse,
  type EnhancedClarityMapResponse,
} from "../../src/lib/server/clarity-map";
import {
  decryptClarityMapResponse,
  encryptClarityMapResponse,
} from "../../src/lib/server/persistence/clarity-map-payloads";

const encryptionKey = Buffer.alloc(32, 9).toString("base64");

describe("persisted Clarity Maps", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("MIND_BRIDGE_DATA_ENCRYPTION_KEY_V1", encryptionKey);
    loadPersistedTranscript.mockResolvedValue(retainedTranscript());
    claimClarityMapGeneration.mockResolvedValue({
      status: "claimed",
      mapEncrypted: null,
    });
    mergeOwnedSessionSafetyState.mockResolvedValue(undefined);
    persistClarityMapResult.mockImplementation(async ({ mapEncrypted }) => (
      mapEncrypted
    ));
  });

  it("prefers the retained transcript and persists an encrypted claimed map", async () => {
    const clarityMapAgent = vi.fn().mockResolvedValue({
      source: "fallback",
      clarityMap: structuredMap(),
    });

    await expect(createPersistedClarityMapResponse(
      request("tampered browser text should not win"),
      owned(true),
      { clarityMapAgent },
    )).resolves.toMatchObject({
      type: "clarity_map",
      source: "fallback",
    });

    expect(clarityMapAgent).toHaveBeenCalledWith(expect.objectContaining({
      messages: retainedTranscript().messages,
    }));
    const claim = claimClarityMapGeneration.mock.calls[0][0];
    expect(claim.transcriptFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(claim.transcriptFingerprint).not.toContain("server-owned");
    expect(persistClarityMapResult).toHaveBeenCalledWith(expect.objectContaining({
      transcriptFingerprint: claim.transcriptFingerprint,
      leaseTokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      mapEncrypted: expect.objectContaining({
        kid: "v1",
        algorithm: "aes-256-gcm",
      }),
    }));
  });

  it("replays a completed fingerprint without calling the map agent", async () => {
    const replay = generatedResponse();
    const clarityMapAgent = vi.fn();
    claimClarityMapGeneration.mockResolvedValue({
      status: "completed",
      mapEncrypted: encryptClarityMapResponse(replay),
    });

    await expect(createPersistedClarityMapResponse(
      request(),
      owned(true),
      { clarityMapAgent },
    )).resolves.toMatchObject({
      type: "clarity_map",
      source: "fallback",
      clarityMap: {
        schemaVersion: "clarity_map.v1",
        status: "generated",
      },
    });

    expect(clarityMapAgent).not.toHaveBeenCalled();
    expect(persistClarityMapResult).not.toHaveBeenCalled();
    expect(mergeOwnedSessionSafetyState).toHaveBeenCalledOnce();
  });

  it("returns a safe conflict while identical generation is active", async () => {
    claimClarityMapGeneration.mockResolvedValue({
      status: "in_progress",
      mapEncrypted: null,
    });

    await expect(createPersistedClarityMapResponse(
      request(),
      owned(true),
      { clarityMapAgent: vi.fn() },
    )).rejects.toMatchObject({
      code: "CLARITY_MAP_IN_PROGRESS",
      status: 409,
      headers: { "Retry-After": "5" },
    });
  });

  it("uses submitted transcript transiently and retains no map after opt-out", async () => {
    const clarityMapAgent = vi.fn().mockResolvedValue({
      source: "fallback",
      clarityMap: structuredMap("browser-user"),
    });

    await expect(createPersistedClarityMapResponse(
      request(),
      owned(false),
      { clarityMapAgent },
    )).resolves.toMatchObject({ type: "clarity_map" });

    expect(loadPersistedTranscript).not.toHaveBeenCalled();
    expect(claimClarityMapGeneration).not.toHaveBeenCalled();
    expect(persistClarityMapResult).not.toHaveBeenCalled();
    expect(mergeOwnedSessionSafetyState).toHaveBeenCalledOnce();
  });

  it("stores an unclaimed encrypted map when opt-in predates retained chat", async () => {
    const clarityMapAgent = vi.fn().mockResolvedValue({
      source: "fallback",
      clarityMap: structuredMap("browser-user"),
    });
    loadPersistedTranscript.mockResolvedValue({
      hasChatUser: false,
      messageRowIds: ["row-intake"],
      messages: [],
    });

    await expect(createPersistedClarityMapResponse(
      request(),
      owned(true),
      { clarityMapAgent },
    )).resolves.toMatchObject({ type: "clarity_map" });

    expect(claimClarityMapGeneration).not.toHaveBeenCalled();
    expect(persistClarityMapResult).toHaveBeenCalledWith(expect.objectContaining({
      transcriptFingerprint: null,
      leaseTokenHash: null,
    }));
  });

  it("passes stored safety state into map gating before normal generation", async () => {
    const preserved = owned(false);
    preserved.session.currentSafetyState = "active_suicidal_ideation";
    const clarityMapAgent = vi.fn();

    await expect(createPersistedClarityMapResponse(
      request(),
      preserved,
      { clarityMapAgent },
    )).resolves.toMatchObject({
      type: "safety_blocked",
      source: "safety",
    });

    expect(clarityMapAgent).not.toHaveBeenCalled();
    expect(mergeOwnedSessionSafetyState).toHaveBeenCalledWith(
      expect.objectContaining({
        safetyState: "active_suicidal_ideation",
      }),
    );
  });

  it("keeps a safety block visible when raw-free state persistence fails", async () => {
    mergeOwnedSessionSafetyState.mockRejectedValue(
      new Error("private database detail"),
    );

    await expect(createPersistedClarityMapResponse(
      request("i want to kill myself right now"),
      owned(false),
    )).resolves.toMatchObject({
      type: "safety_blocked",
      source: "safety",
      persistenceStatus: "unavailable",
    });

    expect(persistClarityMapResult).not.toHaveBeenCalled();
  });

  it("validates encrypted replay payloads against authoritative message ids", () => {
    const envelope = encryptClarityMapResponse(generatedResponse());

    expect(() => decryptClarityMapResponse(envelope, [{
      id: "different-user-id",
      role: "user",
      content: "Different transcript.",
      createdAt: "2026-05-30T00:00:00.000Z",
    }])).toThrow("Please try again later.");
  });
});

function request(message = "browser context has enough useful detail for a map") {
  return {
    sessionId: "22222222-2222-4222-8222-222222222222",
    sessionContext: {
      sessionId: "22222222-2222-4222-8222-222222222222",
      countryCode: "IN" as const,
      mainConcernCategory: "sleep_energy" as const,
    },
    messages: [{
      id: "browser-user",
      role: "user" as const,
      content: message,
      createdAt: "2026-05-30T00:00:00.000Z",
    }],
  };
}

function retainedTranscript() {
  return {
    hasChatUser: true,
    messageRowIds: ["row-user", "row-assistant"],
    messages: [
      {
        id: "server-user",
        role: "user" as const,
        content: "server-owned context has enough useful detail for a map",
        createdAt: "2026-05-30T00:00:00.000Z",
      },
      {
        id: "server-assistant",
        role: "assistant" as const,
        content: "What part would be useful to sort first?",
        createdAt: "2026-05-30T00:00:01.000Z",
      },
    ],
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
      currentSafetyState: null as null | "active_suicidal_ideation",
      countryCode: "US" as const,
      mainConcernCategory: "overwhelmed" as const,
      onboardingNoteEncrypted: null,
    },
  };
}

function generatedResponse(): Extract<
  EnhancedClarityMapResponse,
  { type: "clarity_map" }
> {
  return {
    type: "clarity_map",
    source: "fallback",
    clarityMap: structuredMap(),
  };
}

function structuredMap(evidenceMessageId = "server-user") {
  return {
    schemaVersion: "clarity_map.v1" as const,
    status: "generated" as const,
    disclaimer: "This is a reflective aid, not a diagnosis.",
    harmonySignal: {
      label: "Mixed clarity",
      score: 50,
      band: "mixed" as const,
      explanation: "Some pressure is visible alongside a workable next step.",
      components: {
        emotionalLoad: 2,
        triggerClarity: 2,
        supportConnection: 2,
        actionReadiness: 2,
        safetyStability: 2,
      },
    },
    keyInsight: {
      title: "Sort one pressure first",
      summary: "A smaller first step may make the concern easier to approach.",
      evidence: [{
        point: "The message describes a concern with enough detail to reflect.",
        evidenceMessageIds: [evidenceMessageId],
      }, {
        point: "The user is looking for one useful next step.",
        evidenceMessageIds: [evidenceMessageId],
      }, {
        point: "The transcript offers a practical place to begin.",
        evidenceMessageIds: [evidenceMessageId],
      }],
    },
    boundaryFocus: {
      title: "Protect a small next step",
      boundaryType: "unclear_boundary" as const,
      insights: [
        "Choose one manageable piece.",
        "Leave room to reassess after the first step.",
      ],
      smallExperiment: "Write down the first small action.",
    },
    actionPlan: {
      next24Hours: [{
        action: "Name the smallest useful step.",
        whyThisHelps: "It reduces the amount to hold at once.",
      }, {
        action: "Take a short pause.",
        whyThisHelps: "It creates room for reflection.",
      }, {
        action: "Text a trusted person.",
        whyThisHelps: "It can add support.",
      }],
      next7Days: [{
        action: "Notice when the pressure feels strongest.",
        whyThisHelps: "Patterns can make future choices clearer.",
      }, {
        action: "Try one shutdown cue.",
        whyThisHelps: "It can protect recovery.",
      }, {
        action: "Consider qualified support.",
        whyThisHelps: "A professional can help explore patterns.",
      }],
    },
    supportPath: {
      recommendation: "Consider sharing the next step with someone you trust.",
      suggestedResourceTopics: ["stress"],
    },
    confidence: "medium" as const,
  };
}
