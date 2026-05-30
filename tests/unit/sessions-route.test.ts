import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "../../src/app/api/sessions/route";

describe("POST /api/sessions", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates a backward-compatible transient session with additive defaults", async () => {
    const response = await postSession(validInput());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      status: "created",
      storageConsentAccepted: false,
      serverOwned: false,
      sessionContext: {
        countryCode: "US",
        storageConsentAccepted: false,
      },
    });
    expect(payload.sessionId).toMatch(/^mock_session_/);
    expect(payload.expiresAt).toBeUndefined();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("preserves the existing validation error response", async () => {
    const response = await postSession({});

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Please check your input.",
      },
    });
  });

  it("returns a safe backend-unavailable response without leaking configuration details", async () => {
    vi.stubEnv("MIND_BRIDGE_DATA_MODE", "supabase");
    vi.stubEnv("SUPABASE_URL", "");
    const response = await postSession(validInput());

    expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).toBeNull();
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "DATA_BACKEND_UNAVAILABLE",
        message: "Please try again later.",
      },
    });
  });
});

function validInput() {
  return {
    country: "USA",
    ageConfirmed: true,
    consentAccepted: true,
    mainConcernCategory: "overwhelmed",
  };
}

function postSession(body: unknown) {
  return POST(
    new Request("http://localhost/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}
