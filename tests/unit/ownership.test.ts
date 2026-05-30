import { randomBytes } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { sha256 } from "../../src/lib/server/crypto/sensitive-data";
import { ApiError, sessionNotFound } from "../../src/lib/server/http/api-errors";
import { resolveOwnedSession } from "../../src/lib/server/session/ownership";

const token = randomBytes(32).toString("base64url");
const sessionId = "11111111-1111-4111-8111-111111111111";

describe("owned session coordinator", () => {
  it("skips ownership lookups in transient mode", async () => {
    const findOwnerByTokenHash = vi.fn();
    const findSessionByOwner = vi.fn();

    await expect(
      resolveOwnedSession(request(), "mock_session_transient", {
        findOwnerByTokenHash,
        findSessionByOwner,
        getEnvironment: () => ({ mode: "transient" }),
      }),
    ).resolves.toBeNull();

    expect(findOwnerByTokenHash).not.toHaveBeenCalled();
    expect(findSessionByOwner).not.toHaveBeenCalled();
  });

  it("hashes the cookie immediately and resolves an owner-scoped session", async () => {
    const findOwnerByTokenHash = vi.fn().mockResolvedValue({ id: "owner-id" });
    const findSessionByOwner = vi.fn().mockResolvedValue({
      id: sessionId,
      ownerId: "owner-id",
      expiresAt: "2026-06-29T00:00:00.000Z",
    });

    await expect(
      resolveOwnedSession(request(token), sessionId, {
        findOwnerByTokenHash,
        findSessionByOwner,
        getEnvironment: supabaseEnvironment,
      }),
    ).resolves.toMatchObject({
      owner: { id: "owner-id" },
      session: { id: sessionId, ownerId: "owner-id" },
    });

    expect(findOwnerByTokenHash).toHaveBeenCalledWith(sha256(token));
    expect(findOwnerByTokenHash).not.toHaveBeenCalledWith(token);
    expect(findSessionByOwner).toHaveBeenCalledWith("owner-id", sessionId);
  });

  it.each([
    ["missing", undefined],
    ["malformed", "malformed"],
    ["duplicate", `${token}; mindbridge_anon_owner=${token}`],
  ])("rejects a %s owner cookie", async (_label, cookieValue) => {
    await expectApiError(
      resolveOwnedSession(request(cookieValue), sessionId, {
        findOwnerByTokenHash: vi.fn(),
        findSessionByOwner: vi.fn(),
        getEnvironment: supabaseEnvironment,
      }),
      "UNAUTHORIZED_SESSION",
      401,
    );
  });

  it("rejects an unknown owner cookie", async () => {
    await expectApiError(
      resolveOwnedSession(request(token), sessionId, {
        findOwnerByTokenHash: vi.fn().mockResolvedValue(null),
        findSessionByOwner: vi.fn(),
        getEnvironment: supabaseEnvironment,
      }),
      "UNAUTHORIZED_SESSION",
      401,
    );
  });

  it("rejects invalid session locators before querying sessions", async () => {
    const findSessionByOwner = vi.fn();

    await expectApiError(
      resolveOwnedSession(request(token), "forged-session-id", {
        findOwnerByTokenHash: vi.fn().mockResolvedValue({ id: "owner-id" }),
        findSessionByOwner,
        getEnvironment: supabaseEnvironment,
      }),
      "SESSION_NOT_FOUND",
      404,
    );
    expect(findSessionByOwner).not.toHaveBeenCalled();
  });

  it("preserves the indistinguishable session-not-found error from owner-scoped lookup", async () => {
    await expectApiError(
      resolveOwnedSession(request(token), sessionId, {
        findOwnerByTokenHash: vi.fn().mockResolvedValue({ id: "owner-id" }),
        findSessionByOwner: vi.fn().mockRejectedValue(sessionNotFound()),
        getEnvironment: supabaseEnvironment,
      }),
      "SESSION_NOT_FOUND",
      404,
    );
  });
});

function request(cookieValue?: string) {
  return new Request("https://mindbridge.example/api/chat", {
    headers: cookieValue
      ? { Cookie: `mindbridge_anon_owner=${cookieValue}` }
      : undefined,
  });
}

function supabaseEnvironment() {
  return {
    mode: "supabase" as const,
    supabaseUrl: "https://example.supabase.co",
    supabaseServerKey: "server-secret",
    encryptionKeyV1: randomBytes(32).toString("base64"),
    rateLimitHmacKey: randomBytes(32).toString("base64"),
  };
}

async function expectApiError(
  promise: Promise<unknown>,
  code: string,
  status: number,
) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code, status });
    return;
  }

  throw new Error("Expected ownership resolution to fail.");
}
