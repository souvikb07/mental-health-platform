import { describe, expect, it } from "vitest";

import {
  parseTriageSignal,
  triageJsonSchema,
  triageSchemaVersion,
} from "../../src/lib/ai/triage/triage-schema";

describe("triage schema", () => {
  it("defines a strict structured output schema", () => {
    expect(triageJsonSchema).toMatchObject({
      type: "object",
      additionalProperties: false,
      properties: {
        schemaVersion: { const: triageSchemaVersion },
      },
    });
  });

  it("parses valid triage signals", () => {
    expect(
      parseTriageSignal({
        schemaVersion: "triage.v1",
        riskLevel: "medium",
        safetyStateCandidate: "elevated_distress",
        riskCategories: [],
        policyCategories: [],
        subject: "self",
        temporalUrgency: "ongoing",
        intentSignal: "distress",
        recommendedAction: "continue_with_supportive_nudge",
        confidence: "medium",
        needsClarifyingSafetyQuestion: true,
        rationaleCode: "ambiguous_distress",
      }),
    ).toMatchObject({
      riskLevel: "medium",
      safetyStateCandidate: "elevated_distress",
    });
  });

  it("rejects invalid triage signals", () => {
    expect(
      parseTriageSignal({
        schemaVersion: "triage.v1",
        riskLevel: "emergency",
        safetyStateCandidate: "normal_support",
        riskCategories: [],
        policyCategories: [],
        subject: "self",
        temporalUrgency: "none",
        intentSignal: "none",
        recommendedAction: "continue_chat",
        confidence: "high",
        needsClarifyingSafetyQuestion: false,
        rationaleCode: "no_safety_signal",
      }),
    ).toBeNull();
  });
});
