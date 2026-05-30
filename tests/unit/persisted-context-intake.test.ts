import { Buffer } from "node:buffer";

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findPersistedContextIntakeResponse,
  persistContextIntakeResult,
} = vi.hoisted(() => ({
  findPersistedContextIntakeResponse: vi.fn(),
  persistContextIntakeResult: vi.fn(),
}));

vi.mock("@/lib/db/repositories/messages", () => ({
  findPersistedContextIntakeResponse,
}));
vi.mock("@/lib/db/repositories/chat-turns", () => ({
  persistContextIntakeResult,
}));

import {
  createPersistedContextIntakeResponse,
  type ContextIntakeResponse,
} from "../../src/lib/server/context-intake";
import { encryptSensitiveJson } from "../../src/lib/server/crypto/sensitive-data";
import { decryptContextIntakeResponse } from "../../src/lib/server/persistence/message-payloads";

const encryptionKey = Buffer.alloc(32, 5).toString("base64");

describe("persisted context intake", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("MIND_BRIDGE_DATA_ENCRYPTION_KEY_V1", encryptionKey);
    findPersistedContextIntakeResponse.mockResolvedValue(null);
    persistContextIntakeResult.mockImplementation(async (input) =>
      input.responseEncrypted
    );
  });

  it("replays an opted-in retained result without generating another opener", async () => {
    const retained = openerResponse();
    const contextIntakeAgent = vi.fn();
    findPersistedContextIntakeResponse.mockResolvedValue(retained);

    await expect(
      createPersistedContextIntakeResponse(
        transientContext(),
        owned(true),
        { contextIntakeAgent },
      ),
    ).resolves.toEqual(retained);
    expect(contextIntakeAgent).not.toHaveBeenCalled();
    expect(persistContextIntakeResult).not.toHaveBeenCalled();
  });

  it.each([
    ["opener", undefined],
    ["safety", "i want to kill myself"],
    ["boundary", "Can you diagnose me with depression?"],
  ])("encrypts and retains one opted-in %s response", async (type, note) => {
    const contextIntakeAgent = vi.fn().mockResolvedValue({
      source: "fallback",
      contextIntake: openerResponse().contextIntake,
    });

    const response = await createPersistedContextIntakeResponse(
      transientContext(),
      owned(true, note),
      { contextIntakeAgent },
    );

    expect(response.type).toBe(type);
    const input = persistContextIntakeResult.mock.calls[0][0];
    expect(input.responseEncrypted).not.toBeNull();
    expect(
      decryptContextIntakeResponse(input.responseEncrypted).type,
    ).toBe(type);
  });

  it("keeps opt-out text transient while using database-owned structured fields", async () => {
    const contextIntakeAgent = vi.fn().mockResolvedValue({
      source: "fallback",
      contextIntake: openerResponse().contextIntake,
    });

    await createPersistedContextIntakeResponse(
      {
        ...transientContext(),
        countryCode: "IN",
        mainConcernCategory: "sleep_energy",
        mainConcernText: "Transient note only.",
      },
      owned(false),
      { contextIntakeAgent },
    );

    expect(findPersistedContextIntakeResponse).not.toHaveBeenCalled();
    expect(contextIntakeAgent).toHaveBeenCalledWith(expect.objectContaining({
      countryCode: "US",
      mainConcernCategory: "overwhelmed",
      mainConcernText: "Transient note only.",
    }));
    expect(persistContextIntakeResult).toHaveBeenCalledWith(expect.objectContaining({
      responseEncrypted: null,
    }));
  });

  it("returns a safety route when its persistence write fails", async () => {
    persistContextIntakeResult.mockRejectedValue(
      new Error("private database detail"),
    );

    await expect(
      createPersistedContextIntakeResponse(
        transientContext(),
        owned(true, "i want to kill myself"),
      ),
    ).resolves.toMatchObject({
      type: "safety",
      persistenceStatus: "unavailable",
    });
  });

  it("preserves a stored high-risk state during a benign context-intake retry", async () => {
    const contextIntakeAgent = vi.fn();

    await expect(
      createPersistedContextIntakeResponse(
        {
          ...transientContext(),
          mainConcernText: "I am checking in again today.",
        },
        owned(false, undefined, "active_suicidal_ideation"),
        { contextIntakeAgent },
      ),
    ).resolves.toMatchObject({
      type: "safety",
    });
    expect(contextIntakeAgent).not.toHaveBeenCalled();
    expect(persistContextIntakeResult).toHaveBeenCalledWith(expect.objectContaining({
      safetyState: "active_suicidal_ideation",
    }));
  });

  it("returns a boundary route when its persistence write fails", async () => {
    persistContextIntakeResult.mockRejectedValue(
      new Error("private database detail"),
    );

    await expect(
      createPersistedContextIntakeResponse(
        transientContext(),
        owned(true, "Can you diagnose me with depression?"),
      ),
    ).resolves.toMatchObject({
      type: "boundary",
      persistenceStatus: "unavailable",
    });
  });

  it("fails a normal opener safely when its persistence write fails", async () => {
    persistContextIntakeResult.mockRejectedValue(
      new Error("private database detail"),
    );

    await expect(
      createPersistedContextIntakeResponse(transientContext(), owned(true)),
    ).rejects.toMatchObject({
      code: "DATA_BACKEND_UNAVAILABLE",
      status: 503,
    });
  });
});

function owned(
  storageConsentAccepted: boolean,
  mainConcernText?: string,
  currentSafetyState: "active_suicidal_ideation" | null = null,
) {
  return {
    owner: { id: "owner-id" },
    session: {
      id: "11111111-1111-4111-8111-111111111111",
      ownerId: "owner-id",
      expiresAt: "2026-06-29T00:00:00.000Z",
      storageConsentAccepted,
      currentSafetyState,
      countryCode: "US" as const,
      mainConcernCategory: "overwhelmed" as const,
      onboardingNoteEncrypted:
        storageConsentAccepted && mainConcernText
          ? encryptSensitiveJson({
              version: "onboarding_context.v1",
              mainConcernText,
            })
          : null,
    },
  };
}

function transientContext() {
  return {
    sessionId: "11111111-1111-4111-8111-111111111111",
    countryCode: "US" as const,
    countryLabel: "USA",
    ageConfirmed: true,
    consentAccepted: true,
    mainConcernCategory: "overwhelmed" as const,
    mainConcernLabel: "Overwhelmed",
  };
}

function openerResponse(): Extract<ContextIntakeResponse, { type: "opener" }> {
  return {
    type: "opener",
    assistantMessage: {
      id: "opener-id",
      role: "assistant",
      content: "What feels most pressing today?",
      createdAt: "2026-05-30T00:00:00.000Z",
    },
    contextIntake: {
      schemaVersion: "context_intake.v1",
      openingMessage: "What feels most pressing today?",
      inferredFocusAreas: ["overwhelm"],
      firstQuestionType: "clarify_main_pressure",
      tone: "warm_grounded",
      safetyNoteNeeded: false,
      shouldMentionProfessionalSupport: false,
      confidence: "medium",
    },
    source: "fallback",
  };
}
