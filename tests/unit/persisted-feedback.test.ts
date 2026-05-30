import { Buffer } from "node:buffer";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { persistFeedback } = vi.hoisted(() => ({
  persistFeedback: vi.fn(),
}));

vi.mock("@/lib/db/repositories/feedback", () => ({
  persistFeedback,
}));

import { receivePersistedFeedback } from "../../src/lib/server/feedback";
import { decryptSensitiveJson } from "../../src/lib/server/crypto/sensitive-data";

const encryptionKey = Buffer.alloc(32, 8).toString("base64");

describe("persisted feedback", () => {
  beforeEach(() => {
    persistFeedback.mockReset();
    persistFeedback.mockResolvedValue(undefined);
    vi.stubEnv("MIND_BRIDGE_DATA_ENCRYPTION_KEY_V1", encryptionKey);
  });

  it("persists ratings and silently discards an opted-out comment", async () => {
    await expect(receivePersistedFeedback(
      request("private feedback note"),
      owned(false),
    )).resolves.toEqual({ status: "received" });

    expect(persistFeedback).toHaveBeenCalledWith(expect.objectContaining({
      clarityRating: 4,
      helpfulnessRating: 5,
      feltSafe: true,
      unsafeOrUnhelpful: false,
      commentEncrypted: null,
    }));
  });

  it("encrypts a trimmed opted-in comment before persistence", async () => {
    await receivePersistedFeedback(
      request("  private feedback note  "),
      owned(true),
    );

    const envelope = persistFeedback.mock.calls[0][0].commentEncrypted;
    expect(decryptSensitiveJson(envelope, encryptionKey)).toEqual({
      version: "feedback_comment.v1",
      comment: "private feedback note",
    });
  });

  it("appends each accepted submission through a separate repository call", async () => {
    await receivePersistedFeedback(request(null), owned(false));
    await receivePersistedFeedback(request(null), owned(false));

    expect(persistFeedback).toHaveBeenCalledTimes(2);
  });
});

function request(comment: string | null) {
  return {
    sessionId: "22222222-2222-4222-8222-222222222222",
    clarityRating: 4,
    helpfulnessRating: 5,
    feltSafe: true,
    unsafeOrUnhelpful: false,
    comment,
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
      currentSafetyState: null,
      countryCode: "US" as const,
      mainConcernCategory: "overwhelmed" as const,
      onboardingNoteEncrypted: null,
    },
  };
}
