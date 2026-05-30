import { Buffer } from "node:buffer";

import { describe, expect, it, vi } from "vitest";

import { encryptSensitiveJson } from "../../src/lib/server/crypto/sensitive-data";
import { createAuthoritativeSessionContext } from "../../src/lib/server/session/authoritative-context";

const encryptionKey = Buffer.alloc(32, 7).toString("base64");

describe("authoritative session context", () => {
  it("uses database codes and derives labels instead of trusting browser copies", () => {
    const context = createAuthoritativeSessionContext(session(false), {
      transientContext: {
        sessionId: "forged",
        countryCode: "IN",
        mainConcernCategory: "sleep_energy",
        mainConcernText: "Transient note.",
      },
      includeTransientOptionalText: true,
    });

    expect(context).toMatchObject({
      sessionId: "session-id",
      countryCode: "US",
      countryLabel: "United States",
      mainConcernCategory: "overwhelmed",
      mainConcernLabel: "Overwhelmed",
      storageConsentAccepted: false,
      mainConcernText: "Transient note.",
    });
  });

  it("decrypts retained onboarding context for opted-in sessions", () => {
    vi.stubEnv("MIND_BRIDGE_DATA_ENCRYPTION_KEY_V1", encryptionKey);
    const context = createAuthoritativeSessionContext({
      ...session(true),
      onboardingNoteEncrypted: encryptSensitiveJson({
        version: "onboarding_context.v1",
        ageBand: "25-34",
        mainConcernText: "Retained note.",
      }),
    });

    expect(context.ageBand).toBe("25-34");
    expect(context.mainConcernText).toBe("Retained note.");
    vi.unstubAllEnvs();
  });

  it("fails safely for malformed retained onboarding payloads", () => {
    vi.stubEnv("MIND_BRIDGE_DATA_ENCRYPTION_KEY_V1", encryptionKey);

    expect(() =>
      createAuthoritativeSessionContext({
        ...session(true),
        onboardingNoteEncrypted: encryptSensitiveJson({
          version: "unexpected",
          mainConcernText: "Do not expose this.",
        }),
      }),
    ).toThrow("Please try again later.");
    vi.unstubAllEnvs();
  });
});

function session(storageConsentAccepted: boolean) {
  return {
    id: "session-id",
    ownerId: "owner-id",
    expiresAt: "2026-06-29T00:00:00.000Z",
    storageConsentAccepted,
    currentSafetyState: null,
    countryCode: "US" as const,
    mainConcernCategory: "overwhelmed" as const,
    onboardingNoteEncrypted: null,
  };
}
