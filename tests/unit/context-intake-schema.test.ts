import { describe, expect, it } from "vitest";

import {
  contextIntakeJsonSchema,
  contextIntakeSchemaVersion,
  parseContextIntakeResult,
} from "../../src/lib/ai/context-intake/context-intake-schema";

const validContextIntake = {
  schemaVersion: "context_intake.v1",
  openingMessage:
    "It sounds like things feel heavy right now; what feels most pressing today?",
  inferredFocusAreas: ["overwhelm"],
  firstQuestionType: "clarify_main_pressure",
  tone: "warm_grounded",
  safetyNoteNeeded: false,
  shouldMentionProfessionalSupport: false,
  confidence: "medium",
};

describe("context intake schema", () => {
  it("defines a strict structured output schema", () => {
    expect(contextIntakeJsonSchema).toMatchObject({
      type: "object",
      additionalProperties: false,
      properties: {
        schemaVersion: { const: contextIntakeSchemaVersion },
      },
    });
  });

  it("parses a valid context intake result", () => {
    expect(parseContextIntakeResult(validContextIntake)).toMatchObject({
      schemaVersion: "context_intake.v1",
      firstQuestionType: "clarify_main_pressure",
    });
  });

  it("rejects extra unknown root properties", () => {
    expect(
      parseContextIntakeResult({
        ...validContextIntake,
        unexpected: "not allowed",
      }),
    ).toBeNull();
  });

  it("rejects missing required fields", () => {
    const missingOpeningMessage: Partial<typeof validContextIntake> = {
      ...validContextIntake,
    };
    delete missingOpeningMessage.openingMessage;

    expect(parseContextIntakeResult(missingOpeningMessage)).toBeNull();
  });

  it("rejects invalid enum values", () => {
    expect(
      parseContextIntakeResult({
        ...validContextIntake,
        firstQuestionType: "ask_anything",
      }),
    ).toBeNull();
  });

  it("rejects diagnosis language", () => {
    expect(
      parseContextIntakeResult({
        ...validContextIntake,
        openingMessage: "You have depression; what changed recently?",
      }),
    ).toBeNull();
  });

  it("rejects medication language", () => {
    expect(
      parseContextIntakeResult({
        ...validContextIntake,
        openingMessage: "Medication may help; what changed recently?",
      }),
    ).toBeNull();
  });

  it("rejects multiple questions", () => {
    expect(
      parseContextIntakeResult({
        ...validContextIntake,
        openingMessage: "What feels heavy today? What changed recently?",
      }),
    ).toBeNull();
  });
});
