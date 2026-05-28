import { describe, expect, it } from "vitest";

import {
  parseTriageSignal,
  triageJsonSchema,
  triageSchemaVersion,
} from "../../src/lib/ai/triage/triage-schema";

const validSignal = {
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
};

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
    expect(parseTriageSignal(validSignal)).toMatchObject({
      riskLevel: "medium",
      safetyStateCandidate: "elevated_distress",
    });
  });

  it("rejects extra unknown root properties", () => {
    expect(
      parseTriageSignal({
        ...validSignal,
        unexpected: "not allowed",
      }),
    ).toBeNull();
  });

  it("rejects missing required fields", () => {
    const missingRiskLevel: Partial<typeof validSignal> = { ...validSignal };
    delete missingRiskLevel.riskLevel;

    expect(parseTriageSignal(missingRiskLevel)).toBeNull();
  });

  it("rejects invalid enum values", () => {
    expect(
      parseTriageSignal({
        ...validSignal,
        riskLevel: "emergency",
      }),
    ).toBeNull();
  });

  it("rejects invalid array enum members", () => {
    expect(
      parseTriageSignal({
        ...validSignal,
        riskCategories: ["self_harm", "unknown_category"],
      }),
    ).toBeNull();
  });
});
