import { describe, expect, it, vi } from "vitest";

import { generateStructuredClarityMap } from "../../src/lib/ai/clarity-map/clarity-map-agent";
import type { ApiChatMessage } from "../../src/types/risk";
import type { SessionContext } from "../../src/types/session-context";

const sessionContext: SessionContext = {
  sessionId: "mock_session_clarity",
  countryCode: "US",
  countryLabel: "USA",
  mainConcernCategory: "overwhelmed",
  mainConcernLabel: "Overwhelmed",
};

const messages: ApiChatMessage[] = [
  {
    id: "u1",
    role: "user",
    content: "I feel overwhelmed after work and keep replaying conversations.",
    createdAt: "2026-05-28T00:00:00.000Z",
  },
  {
    id: "u2",
    role: "user",
    content: "I want one small next step that does not feel too big.",
    createdAt: "2026-05-28T00:01:00.000Z",
  },
];

const validOutput = {
  schemaVersion: "clarity_map.v1",
  status: "generated",
  disclaimer: "This is not a diagnosis. It is a reflection map.",
  harmonySignal: {
    label: "Work pressure is visible",
    score: 60,
    band: "mixed",
    explanation: "The transcript suggests pressure with some clarity.",
    components: {
      emotionalLoad: 3,
      triggerClarity: 3,
      supportConnection: 2,
      actionReadiness: 2,
      safetyStability: 3,
    },
  },
  keyInsight: {
    title: "Work stress may be carrying into recovery time",
    summary: "The user may be replaying work interactions after the day ends.",
    evidence: [
      { point: "The user named overwhelm after work.", evidenceMessageIds: ["u1"] },
      { point: "The user described replaying conversations.", evidenceMessageIds: ["u1"] },
      { point: "The user asked for a small next step.", evidenceMessageIds: ["u2"] },
    ],
  },
  boundaryFocus: {
    title: "Separate work effort from recovery",
    boundaryType: "work_boundary",
    insights: [
      "The boundary may involve ending the work loop.",
      "A small shutdown cue may help.",
    ],
    smallExperiment: "Write one sentence about what is done and what can wait.",
  },
  actionPlan: {
    next24Hours: [
      { action: "Write a short shutdown note.", whyThisHelps: "It can reduce replaying." },
      { action: "Take a five-minute pause.", whyThisHelps: "It can create a reset." },
      { action: "Choose one tiny next step.", whyThisHelps: "It keeps the ask manageable." },
    ],
    next7Days: [
      { action: "Track replay moments.", whyThisHelps: "Patterns become clearer." },
      { action: "Try one work boundary.", whyThisHelps: "It can protect recovery." },
      { action: "Consider support if it continues.", whyThisHelps: "Support can help explore patterns." },
    ],
  },
  supportPath: {
    recommendation: "Start with practical reflection and trusted support.",
    suggestedResourceTopics: ["stress", "support"],
    professionalSupportNote: "This is not a diagnosis.",
  },
  confidence: "medium",
};

describe("generateStructuredClarityMap", () => {
  it("returns fallback when OPENAI_API_KEY is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENAI_CLARITY_MODEL", "clarity-test-model");

    const response = await generateStructuredClarityMap({
      sessionContext,
      messages,
    });

    expect(response.source).toBe("fallback");
    expect(response.clarityMap.disclaimer).toContain("not a diagnosis");
    vi.unstubAllEnvs();
  });

  it("returns fallback when OPENAI_CLARITY_MODEL is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_CLARITY_MODEL", "");

    const response = await generateStructuredClarityMap({
      sessionContext,
      messages,
    });

    expect(response.source).toBe("fallback");
    vi.unstubAllEnvs();
  });

  it("uses Responses API with store false, non-streaming, and configured model", async () => {
    const create = vi.fn().mockResolvedValue({
      output_text: JSON.stringify(validOutput),
    });

    const response = await generateStructuredClarityMap(
      { sessionContext, messages },
      {
        configured: true,
        model: "clarity-test-model",
        client: {
          responses: {
            create,
          },
        },
      },
    );

    expect(response.source).toBe("openai");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "clarity-test-model",
        store: false,
        stream: false,
      }),
    );
  });

  it("returns fallback when OpenAI output is invalid", async () => {
    const create = vi.fn().mockResolvedValue({
      output_text: JSON.stringify({
        ...validOutput,
        keyInsight: {
          ...validOutput.keyInsight,
          summary: "You have depression.",
        },
      }),
    });

    const response = await generateStructuredClarityMap(
      { sessionContext, messages },
      {
        configured: true,
        model: "clarity-test-model",
        client: {
          responses: {
            create,
          },
        },
      },
    );

    expect(response.source).toBe("fallback");
  });
});
