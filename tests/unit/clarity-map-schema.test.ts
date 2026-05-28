import { describe, expect, it } from "vitest";

import {
  clarityMapJsonSchema,
  clarityMapSchemaVersion,
  parseStructuredClarityMap,
} from "../../src/lib/ai/clarity-map/clarity-map-schema";

const messages = [
  { id: "a1", role: "assistant" as const },
  { id: "u1", role: "user" as const },
  { id: "u2", role: "user" as const },
];

const validMap = {
  schemaVersion: "clarity_map.v1",
  status: "generated",
  disclaimer: "This is not a diagnosis. It is a reflection map.",
  harmonySignal: {
    label: "Pressure is visible",
    score: 80,
    band: "steady",
    explanation: "The components suggest a mixed reflection signal.",
    components: {
      emotionalLoad: 3,
      triggerClarity: 2,
      supportConnection: 2,
      actionReadiness: 2,
      safetyStability: 3,
    },
  },
  keyInsight: {
    title: "Overload may be crowding clarity",
    summary: "The transcript suggests several pressures may be competing.",
    evidence: [
      { point: "The user named pressure.", evidenceMessageIds: ["u1"] },
      { point: "The user described work stress.", evidenceMessageIds: ["u2"] },
      { point: "The user is seeking a small next step.", evidenceMessageIds: ["u1"] },
    ],
  },
  boundaryFocus: {
    title: "Protect one small pocket of capacity",
    boundaryType: "energy_boundary",
    insights: [
      "A smaller commitment may be useful.",
      "Recovery time may need clearer protection.",
    ],
    smallExperiment: "Shrink one task today.",
  },
  actionPlan: {
    next24Hours: [
      { action: "Write two sentences.", whyThisHelps: "It can clarify the pressure." },
      { action: "Drink water.", whyThisHelps: "Basic care supports reflection." },
      { action: "Text a trusted person.", whyThisHelps: "Support can reduce isolation." },
    ],
    next7Days: [
      { action: "Track pressure moments.", whyThisHelps: "Patterns become easier to see." },
      { action: "Try one shutdown cue.", whyThisHelps: "It can protect recovery." },
      { action: "Consider qualified support.", whyThisHelps: "A professional can help explore patterns." },
    ],
  },
  supportPath: {
    recommendation: "Start with trusted support and practical reflection.",
    suggestedResourceTopics: ["stress", "support"],
    professionalSupportNote: "This is not a diagnosis.",
  },
  confidence: "medium",
};

describe("clarity map schema", () => {
  it("defines a strict structured output schema", () => {
    expect(clarityMapJsonSchema).toMatchObject({
      type: "object",
      additionalProperties: false,
      properties: {
        schemaVersion: { const: clarityMapSchemaVersion },
      },
    });
  });

  it("parses a valid clarity map and recomputes score and band", () => {
    const parsed = parseStructuredClarityMap(validMap, { messages });

    expect(parsed).toMatchObject({
      schemaVersion: "clarity_map.v1",
      status: "generated",
      harmonySignal: {
        score: 60,
        band: "mixed",
      },
    });
  });

  it("rejects extra unknown root properties", () => {
    expect(
      parseStructuredClarityMap({ ...validMap, unexpected: true }, { messages }),
    ).toBeNull();
  });

  it("rejects extra unknown nested properties", () => {
    expect(
      parseStructuredClarityMap(
        {
          ...validMap,
          harmonySignal: {
            ...validMap.harmonySignal,
            unexpected: true,
          },
        },
        { messages },
      ),
    ).toBeNull();
  });

  it("rejects missing required fields", () => {
    const missingStatus: Partial<typeof validMap> = { ...validMap };
    delete missingStatus.status;

    expect(parseStructuredClarityMap(missingStatus, { messages })).toBeNull();
  });

  it("rejects invalid enums", () => {
    expect(
      parseStructuredClarityMap(
        {
          ...validMap,
          boundaryFocus: {
            ...validMap.boundaryFocus,
            boundaryType: "clinical_boundary",
          },
        },
        { messages },
      ),
    ).toBeNull();
  });

  it("rejects component values out of range", () => {
    expect(
      parseStructuredClarityMap(
        {
          ...validMap,
          harmonySignal: {
            ...validMap.harmonySignal,
            components: {
              ...validMap.harmonySignal.components,
              emotionalLoad: 5,
            },
          },
        },
        { messages },
      ),
    ).toBeNull();
  });

  it("rejects score values out of range", () => {
    expect(
      parseStructuredClarityMap(
        {
          ...validMap,
          harmonySignal: {
            ...validMap.harmonySignal,
            score: 101,
          },
        },
        { messages },
      ),
    ).toBeNull();
  });

  it("rejects evidence IDs that are unknown", () => {
    expect(
      parseStructuredClarityMap(
        {
          ...validMap,
          keyInsight: {
            ...validMap.keyInsight,
            evidence: [
              { point: "Unknown evidence.", evidenceMessageIds: ["missing"] },
              ...validMap.keyInsight.evidence.slice(1),
            ],
          },
        },
        { messages },
      ),
    ).toBeNull();
  });

  it("rejects evidence that lacks a user message ID", () => {
    expect(
      parseStructuredClarityMap(
        {
          ...validMap,
          keyInsight: {
            ...validMap.keyInsight,
            evidence: [
              { point: "Assistant only.", evidenceMessageIds: ["a1"] },
              ...validMap.keyInsight.evidence.slice(1),
            ],
          },
        },
        { messages },
      ),
    ).toBeNull();
  });

  it("rejects unsafe diagnosis or medication language", () => {
    expect(
      parseStructuredClarityMap(
        {
          ...validMap,
          keyInsight: {
            ...validMap.keyInsight,
            summary: "You have depression.",
          },
        },
        { messages },
      ),
    ).toBeNull();

    expect(
      parseStructuredClarityMap(
        {
          ...validMap,
          actionPlan: {
            ...validMap.actionPlan,
            next24Hours: [
              {
                action: "You should take medication.",
                whyThisHelps: "This is not appropriate.",
              },
              ...validMap.actionPlan.next24Hours.slice(1),
            ],
          },
        },
        { messages },
      ),
    ).toBeNull();
  });

  it("rejects malformed generated counts", () => {
    expect(
      parseStructuredClarityMap(
        {
          ...validMap,
          actionPlan: {
            ...validMap.actionPlan,
            next24Hours: validMap.actionPlan.next24Hours.slice(0, 2),
          },
        },
        { messages },
      ),
    ).toBeNull();
  });
});
