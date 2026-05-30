import { randomBytes } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { sha256 } from "../../src/lib/server/crypto/sensitive-data";
import { createSession } from "../../src/lib/server/sessions";
import type { EncryptedEnvelope } from "../../src/types/database";

const token = randomBytes(32).toString("base64url");
const encryptionKey = randomBytes(32).toString("base64");
const envelope: EncryptedEnvelope = {
  kid: "v1",
  algorithm: "aes-256-gcm",
  iv: randomBytes(12).toString("base64"),
  authTag: randomBytes(16).toString("base64"),
  ciphertext: randomBytes(32).toString("base64"),
};
const createdSession = {
  ownerId: "owner-id",
  sessionId: "session-id",
  storageConsentAccepted: false,
  createdAt: "2026-05-30T00:00:00.000Z",
  expiresAt: "2026-06-29T00:00:00.000Z",
};
const input = {
  country: "USA",
  ageBand: "25-34",
  ageConfirmed: true as const,
  consentAccepted: true as const,
  mainConcern: "Work stress",
  mainConcernCategory: "work_study_stress" as const,
  mainConcernText: "A private onboarding note",
};

describe("session service", () => {
  it("keeps transient creation config-free and backward-compatible", async () => {
    const response = await createSession(
      new Request("http://localhost/api/sessions"),
      input,
      {
        getEnvironment: () => ({ mode: "transient" }),
      },
    );

    expect(response).toEqual({
      result: expect.objectContaining({
        status: "created",
        storageConsentAccepted: false,
        serverOwned: false,
        sessionContext: expect.objectContaining({
          countryCode: "US",
          mainConcernText: "A private onboarding note",
          storageConsentAccepted: false,
        }),
      }),
    });
  });

  it("hashes a minted owner token and keeps opted-out free text out of RPC parameters", async () => {
    const createOwnedSession = vi.fn().mockResolvedValue(createdSession);
    const encryptJson = vi.fn();

    const response = await createSession(
      new Request("http://localhost/api/sessions"),
      input,
      {
        createOwnedSession,
        createOwnerToken: () => token,
        encryptJson,
        getEnvironment: supabaseEnvironment,
      },
    );

    expect(createOwnedSession).toHaveBeenCalledWith({
      tokenHash: sha256(token),
      countryCode: "US",
      mainConcernCategory: "work_study_stress",
      storageConsentAccepted: false,
      onboardingNoteEncrypted: null,
    });
    expect(JSON.stringify(createOwnedSession.mock.calls)).not.toContain(token);
    expect(encryptJson).not.toHaveBeenCalled();
    expect(response.result).toMatchObject({
      sessionId: "session-id",
      status: "created",
      storageConsentAccepted: false,
      serverOwned: true,
      expiresAt: "2026-06-29T00:00:00.000Z",
      sessionContext: {
        sessionId: "session-id",
        mainConcernText: "A private onboarding note",
        storageConsentAccepted: false,
      },
    });
    expect(response.setCookie).toContain("mindbridge_anon_owner=");
  });

  it("encrypts one structured onboarding payload when storage consent is accepted", async () => {
    const createOwnedSession = vi.fn().mockResolvedValue({
      ...createdSession,
      storageConsentAccepted: true,
    });
    const encryptJson = vi.fn().mockReturnValue(envelope);

    await createSession(
      new Request("http://localhost/api/sessions", {
        headers: { Cookie: `mindbridge_anon_owner=${token}` },
      }),
      { ...input, storageConsentAccepted: true },
      {
        createOwnedSession,
        createOwnerToken: vi.fn(),
        encryptJson,
        getEnvironment: supabaseEnvironment,
      },
    );

    expect(encryptJson).toHaveBeenCalledWith(
      {
        version: "onboarding_context.v1",
        ageBand: "25-34",
        mainConcern: "Work stress",
        mainConcernText: "A private onboarding note",
      },
      encryptionKey,
    );
    expect(createOwnedSession).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: sha256(token),
        storageConsentAccepted: true,
        onboardingNoteEncrypted: envelope,
      }),
    );
    expect(JSON.stringify(createOwnedSession.mock.calls)).not.toContain(
      "A private onboarding note",
    );
  });

  it("does not create an empty encrypted onboarding payload", async () => {
    const createOwnedSession = vi.fn().mockResolvedValue({
      ...createdSession,
      storageConsentAccepted: true,
    });
    const encryptJson = vi.fn();

    await createSession(
      new Request("http://localhost/api/sessions"),
      {
        country: "India",
        ageConfirmed: true,
        consentAccepted: true,
        mainConcernCategory: "overwhelmed",
        storageConsentAccepted: true,
      },
      {
        createOwnedSession,
        createOwnerToken: () => token,
        encryptJson,
        getEnvironment: supabaseEnvironment,
      },
    );

    expect(encryptJson).not.toHaveBeenCalled();
    expect(createOwnedSession).toHaveBeenCalledWith(
      expect.objectContaining({ onboardingNoteEncrypted: null }),
    );
  });
});

function supabaseEnvironment() {
  return {
    mode: "supabase" as const,
    supabaseUrl: "https://example.supabase.co",
    supabaseServerKey: "server-secret",
    encryptionKeyV1: encryptionKey,
    rateLimitHmacKey: randomBytes(32).toString("base64"),
  };
}
