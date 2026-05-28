import { describe, expect, it, vi } from "vitest";

import { classifyWithAiTriage } from "../../src/lib/ai/triage";
import type { TriageSignal } from "../../src/lib/ai/triage/triage-schema";

const passiveIdeationSignal: TriageSignal = {
  schemaVersion: "triage.v1",
  riskLevel: "high",
  safetyStateCandidate: "passive_suicidal_ideation",
  riskCategories: ["self_harm"],
  policyCategories: [],
  subject: "self",
  temporalUrgency: "ongoing",
  intentSignal: "passive_ideation",
  recommendedAction: "show_resources",
  confidence: "medium",
  needsClarifyingSafetyQuestion: true,
  rationaleCode: "passive_life_worth_signal",
};

describe("classifyWithAiTriage", () => {
  it("returns missing_config when OPENAI_API_KEY is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENAI_TRIAGE_MODEL", "triage-test-model");

    const result = await classifyWithAiTriage({
      message: "I feel like a burden.",
    });

    expect(result).toEqual({ available: false, reason: "missing_config" });
    vi.unstubAllEnvs();
  });

  it("returns missing_config when OPENAI_TRIAGE_MODEL is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_TRIAGE_MODEL", "");

    const result = await classifyWithAiTriage({
      message: "I feel like a burden.",
    });

    expect(result).toEqual({ available: false, reason: "missing_config" });
    vi.unstubAllEnvs();
  });

  it("uses Responses API with store false, non-streaming, and configured model", async () => {
    const create = vi.fn().mockResolvedValue({
      output_text: JSON.stringify(passiveIdeationSignal),
    });

    const result = await classifyWithAiTriage(
      {
        message: "I wish I wouldn't wake up.",
        sessionContext: {
          sessionId: "mock_session_test",
          countryCode: "US",
          mainConcernCategory: "overwhelmed",
        },
      },
      {
        configured: true,
        model: "triage-test-model",
        client: {
          responses: { create },
        },
      },
    );

    expect(result).toMatchObject({
      available: true,
      signal: {
        safetyStateCandidate: "passive_suicidal_ideation",
      },
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "triage-test-model",
        store: false,
        stream: false,
        text: expect.objectContaining({
          format: expect.objectContaining({
            type: "json_schema",
            strict: true,
          }),
        }),
      }),
    );
    const requestBody = create.mock.calls[0]?.[0];
    expect(requestBody.input[0].content).toContain("latestUserMessage");
    expect(requestBody.input[0].content).toContain("mainConcernCategory");
    expect(requestBody.input[0].content).not.toContain("mainConcernText");
  });

  it("returns invalid_output for schema-invalid model output", async () => {
    const create = vi.fn().mockResolvedValue({
      output_text: JSON.stringify({
        ...passiveIdeationSignal,
        riskLevel: "emergency",
      }),
    });

    const result = await classifyWithAiTriage(
      { message: "I wish I wouldn't wake up." },
      {
        configured: true,
        model: "triage-test-model",
        client: {
          responses: { create },
        },
      },
    );

    expect(result).toEqual({ available: false, reason: "invalid_output" });
  });

  it("does not throw to callers on API failure", async () => {
    const create = vi.fn().mockRejectedValue(new Error("upstream failed"));

    await expect(
      classifyWithAiTriage(
        { message: "I feel like a burden." },
        {
          configured: true,
          model: "triage-test-model",
          client: {
            responses: { create },
          },
        },
      ),
    ).resolves.toEqual({ available: false, reason: "api_error" });
  });

  it("does not log raw message text when unavailable", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await classifyWithAiTriage(
      { message: "private mental health message" },
      {
        configured: true,
        model: "triage-test-model",
        client: {
          responses: {
            create: vi.fn().mockRejectedValue(new Error("upstream failed")),
          },
        },
      },
    );

    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleLog).not.toHaveBeenCalled();
    consoleError.mockRestore();
    consoleLog.mockRestore();
  });

  it("parses third-party risk with subject other_person", async () => {
    const create = vi.fn().mockResolvedValue({
      output_text: JSON.stringify({
        ...passiveIdeationSignal,
        subject: "other_person",
        rationaleCode: "third_party_risk",
      }),
    });

    const result = await classifyWithAiTriage(
      { message: "My friend says he wants to kill himself." },
      {
        configured: true,
        model: "triage-test-model",
        client: {
          responses: { create },
        },
      },
    );

    expect(result).toMatchObject({
      available: true,
      signal: {
        subject: "other_person",
        rationaleCode: "third_party_risk",
      },
    });
  });

  it("parses negated self-harm without imminent risk", async () => {
    const create = vi.fn().mockResolvedValue({
      output_text: JSON.stringify({
        ...passiveIdeationSignal,
        riskLevel: "low",
        safetyStateCandidate: "normal_support",
        riskCategories: [],
        temporalUrgency: "none",
        intentSignal: "distress",
        recommendedAction: "continue_chat",
        confidence: "high",
        rationaleCode: "ambiguous_distress",
      }),
    });

    const result = await classifyWithAiTriage(
      { message: "I don't want to kill myself, I'm just overwhelmed." },
      {
        configured: true,
        model: "triage-test-model",
        client: {
          responses: { create },
        },
      },
    );

    expect(result).toMatchObject({
      available: true,
      signal: {
        riskLevel: "low",
        safetyStateCandidate: "normal_support",
        temporalUrgency: "none",
      },
    });
  });
});
