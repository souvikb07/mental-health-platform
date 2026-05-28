import { describe, expect, it, vi } from "vitest";

import { POST } from "../../src/app/api/context-intake/route";

const validSessionContext = {
  sessionId: "mock_session_route",
  countryCode: "US",
  countryLabel: "USA",
  ageConfirmed: true,
  consentAccepted: true,
  mainConcernCategory: "overwhelmed",
  mainConcernLabel: "Overwhelmed",
};

describe("/api/context-intake route validation", () => {
  it("rejects missing ageConfirmed", async () => {
    const sessionContext = { ...validSessionContext };
    delete (sessionContext as Partial<typeof validSessionContext>).ageConfirmed;

    const response = await postContextIntake({ sessionContext });

    expect(response.status).toBe(400);
    await expectValidationError(response);
  });

  it("rejects ageConfirmed false", async () => {
    const response = await postContextIntake({
      sessionContext: {
        ...validSessionContext,
        ageConfirmed: false,
      },
    });

    expect(response.status).toBe(400);
    await expectValidationError(response);
  });

  it("rejects missing consentAccepted", async () => {
    const sessionContext = { ...validSessionContext };
    delete (sessionContext as Partial<typeof validSessionContext>)
      .consentAccepted;

    const response = await postContextIntake({ sessionContext });

    expect(response.status).toBe(400);
    await expectValidationError(response);
  });

  it("rejects consentAccepted false", async () => {
    const response = await postContextIntake({
      sessionContext: {
        ...validSessionContext,
        consentAccepted: false,
      },
    });

    expect(response.status).toBe(400);
    await expectValidationError(response);
  });

  it("rejects missing mainConcernCategory", async () => {
    const sessionContext = { ...validSessionContext };
    delete (sessionContext as Partial<typeof validSessionContext>)
      .mainConcernCategory;

    const response = await postContextIntake({ sessionContext });

    expect(response.status).toBe(400);
    await expectValidationError(response);
  });

  it("rejects missing mainConcernLabel", async () => {
    const sessionContext = { ...validSessionContext };
    delete (sessionContext as Partial<typeof validSessionContext>)
      .mainConcernLabel;

    const response = await postContextIntake({ sessionContext });

    expect(response.status).toBe(400);
    await expectValidationError(response);
  });

  it("rejects GLOBAL countryCode for the visible onboarding flow", async () => {
    const response = await postContextIntake({
      sessionContext: {
        ...validSessionContext,
        countryCode: "GLOBAL",
      },
    });

    expect(response.status).toBe(400);
    await expectValidationError(response);
  });

  it("accepts valid US context", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENAI_CONTEXT_INTAKE_MODEL", "");

    const response = await postContextIntake({
      sessionContext: validSessionContext,
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      type: "opener",
      source: "fallback",
    });
    vi.unstubAllEnvs();
  });

  it("accepts valid IN context", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENAI_CONTEXT_INTAKE_MODEL", "");

    const response = await postContextIntake({
      sessionContext: {
        ...validSessionContext,
        countryCode: "IN",
        countryLabel: "India",
      },
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      type: "opener",
      source: "fallback",
    });
    vi.unstubAllEnvs();
  });

  it("routes optional high-risk text to safety before normal opener generation", async () => {
    const response = await postContextIntake({
      sessionContext: {
        ...validSessionContext,
        mainConcernText: "i want to kill myself",
      },
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      type: "safety",
      source: "safety",
    });
    expect(payload.risk.level).not.toBe("none");
  });

  it("returns fallback opener for valid context when context-intake env is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENAI_CONTEXT_INTAKE_MODEL", "");

    const response = await postContextIntake({
      sessionContext: validSessionContext,
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.type).toBe("opener");
    expect(payload.source).toBe("fallback");
    expect(payload.assistantMessage.content).toContain("most pressing");
    vi.unstubAllEnvs();
  });
});

async function postContextIntake(body: unknown) {
  return POST(
    new Request("http://localhost/api/context-intake", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }),
  );
}

async function expectValidationError(response: Response) {
  await expect(response.json()).resolves.toMatchObject({
    error: {
      code: "VALIDATION_ERROR",
    },
  });
}
