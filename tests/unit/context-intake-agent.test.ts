import { describe, expect, it, vi } from "vitest";

import { generateContextIntake } from "../../src/lib/ai/context-intake/context-intake-agent";
import type { SessionContext } from "../../src/types/session-context";

const sessionContext: SessionContext = {
  sessionId: "mock_session_context_intake",
  countryCode: "US",
  countryLabel: "USA",
  ageConfirmed: true,
  consentAccepted: true,
  mainConcernCategory: "overwhelmed",
  mainConcernLabel: "Overwhelmed",
};

const validModelOutput = {
  schemaVersion: "context_intake.v1",
  openingMessage:
    "It sounds like a lot is competing for your attention; what feels most pressing today?",
  inferredFocusAreas: ["overwhelm"],
  firstQuestionType: "clarify_main_pressure",
  tone: "warm_grounded",
  safetyNoteNeeded: false,
  shouldMentionProfessionalSupport: false,
  confidence: "medium",
};

describe("generateContextIntake", () => {
  it("returns fallback when OPENAI_API_KEY is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENAI_CONTEXT_INTAKE_MODEL", "context-test-model");

    const response = await generateContextIntake(sessionContext);

    expect(response.source).toBe("fallback");
    expect(response.contextIntake.openingMessage).toContain("most pressing");
    vi.unstubAllEnvs();
  });

  it("returns fallback when OPENAI_CONTEXT_INTAKE_MODEL is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_CONTEXT_INTAKE_MODEL", "");

    const response = await generateContextIntake(sessionContext);

    expect(response.source).toBe("fallback");
    expect(response.contextIntake.openingMessage).toContain("most pressing");
    vi.unstubAllEnvs();
  });

  it("uses the Responses API with store false, non-streaming, and configured model", async () => {
    const create = vi.fn().mockResolvedValue({
      output_text: JSON.stringify(validModelOutput),
    });

    const response = await generateContextIntake(sessionContext, {
      configured: true,
      model: "context-test-model",
      client: {
        responses: {
          create,
        },
      },
    });

    expect(response.source).toBe("openai");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "context-test-model",
        store: false,
        stream: false,
      }),
    );
  });

  it("returns fallback when model output is invalid", async () => {
    const create = vi.fn().mockResolvedValue({
      output_text: JSON.stringify({
        ...validModelOutput,
        openingMessage: "You have depression; what changed recently?",
      }),
    });

    const response = await generateContextIntake(sessionContext, {
      configured: true,
      model: "context-test-model",
      client: {
        responses: {
          create,
        },
      },
    });

    expect(response.source).toBe("fallback");
    expect(response.contextIntake.openingMessage).toContain("most pressing");
  });
});
