import { describe, expect, it, vi } from "vitest";

import {
  createContextIntakeResponse,
  type ContextIntakeResponse,
} from "../../src/lib/server/context-intake";
import type { ContextIntakeAgentResult } from "../../src/lib/ai/context-intake";
import type { SessionContext } from "../../src/types/session-context";

const baseSessionContext: SessionContext = {
  sessionId: "mock_session_context_intake",
  countryCode: "US",
  countryLabel: "USA",
  ageConfirmed: true,
  consentAccepted: true,
  mainConcernCategory: "overwhelmed",
  mainConcernLabel: "Overwhelmed",
};

const generatedOpener: ContextIntakeAgentResult = {
  source: "openai",
  contextIntake: {
    schemaVersion: "context_intake.v1",
    openingMessage:
      "It sounds like there is a lot to sort through; what feels most pressing today?",
    inferredFocusAreas: ["overwhelm"],
    firstQuestionType: "clarify_main_pressure",
    tone: "warm_grounded",
    safetyNoteNeeded: false,
    shouldMentionProfessionalSupport: false,
    confidence: "medium",
  },
};

describe("createContextIntakeResponse", () => {
  it("uses the selected reason to generate a fallback opener when no optional text exists", async () => {
    const response = await createContextIntakeResponse(baseSessionContext);

    expect(response.type).toBe("opener");
    expect(response.source).toBe("fallback");
    expect(response.assistantMessage.content).toContain("most pressing");
  });

  it("routes optional high-risk onboarding text to safety without calling the context-intake model", async () => {
    const contextIntakeAgent = vi.fn().mockResolvedValue(generatedOpener);
    const response = await createContextIntakeResponse(
      {
        ...baseSessionContext,
        mainConcernText: "i want to kill myself",
      },
      { contextIntakeAgent },
    );

    expect(response.type).toBe("safety");
    expect(response.source).toBe("safety");
    expect((response as Extract<ContextIntakeResponse, { type: "safety" }>).risk.level).not.toBe("none");
    expect(contextIntakeAgent).not.toHaveBeenCalled();
  });

  it("routes optional boundary text to a boundary response without calling the context-intake model", async () => {
    const contextIntakeAgent = vi.fn().mockResolvedValue(generatedOpener);
    const response = await createContextIntakeResponse(
      {
        ...baseSessionContext,
        mainConcernText: "Can you diagnose me with depression?",
      },
      { contextIntakeAgent },
    );

    expect(response.type).toBe("boundary");
    expect(response.source).toBe("boundary");
    expect(
      (response as Extract<ContextIntakeResponse, { type: "boundary" }>)
        .policyBoundary.categories,
    ).toContain("diagnosis_request");
    expect(contextIntakeAgent).not.toHaveBeenCalled();
  });

  it("allows normal optional text to generate an opener", async () => {
    const contextIntakeAgent = vi.fn().mockResolvedValue(generatedOpener);
    const response = await createContextIntakeResponse(
      {
        ...baseSessionContext,
        mainConcernText: "I have been juggling a lot at work.",
      },
      { contextIntakeAgent },
    );

    expect(response.type).toBe("opener");
    expect(response.source).toBe("openai");
    expect(response.assistantMessage.content).toContain("most pressing");
    expect(contextIntakeAgent).toHaveBeenCalledTimes(1);
  });
});
