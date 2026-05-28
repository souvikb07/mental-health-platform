import { describe, expect, it, vi } from "vitest";

import {
  createClarityMapResponse,
  type EnhancedClarityMapResponse,
} from "../../src/lib/server/clarity-map";
import type { StructuredClarityMap } from "../../src/types/clarity-map";
import type { ApiChatMessage } from "../../src/types/risk";
import type { SessionContext } from "../../src/types/session-context";

const sessionContext: SessionContext = {
  sessionId: "mock_session_clarity",
  countryCode: "US",
  countryLabel: "USA",
  ageConfirmed: true,
  consentAccepted: true,
  mainConcernCategory: "overwhelmed",
  mainConcernLabel: "Overwhelmed",
};

const normalMessages: ApiChatMessage[] = [
  {
    id: "a1",
    role: "assistant",
    content: "What feels most pressing today?",
    createdAt: "2026-05-28T00:00:00.000Z",
  },
  {
    id: "u1",
    role: "user",
    content: "I feel overwhelmed after work and keep replaying conversations.",
    createdAt: "2026-05-28T00:01:00.000Z",
  },
  {
    id: "u2",
    role: "user",
    content: "I want one small step that helps me stop carrying it all evening.",
    createdAt: "2026-05-28T00:02:00.000Z",
  },
];

describe("createClarityMapResponse", () => {
  it("keeps legacy sessionId-only request backward-compatible", async () => {
    const response = await createClarityMapResponse({
      sessionId: "mock_session_legacy",
    });

    expect(response).toHaveProperty("clarityMap");
    expect(response).not.toHaveProperty("type");
  });

  it("returns insufficient_context for thin enhanced transcript", async () => {
    const clarityMapAgent = vi.fn();
    const response = await createClarityMapResponse(
      {
        sessionId: sessionContext.sessionId,
        sessionContext,
        messages: [
          {
            id: "u1",
            role: "user",
            content: "Tired.",
            createdAt: "2026-05-28T00:00:00.000Z",
          },
        ],
      },
      { clarityMapAgent },
    );

    expect(response).toMatchObject({
      type: "insufficient_context",
      source: "fallback",
    });
    expect(clarityMapAgent).not.toHaveBeenCalled();
  });

  it.each([
    "Can you diagnose me with depression?",
    "What medication should I take?",
    "Can you be my therapist?",
  ])(
    "blocks one-message boundary request before insufficient context: %s",
    async (content) => {
      const clarityMapAgent = vi.fn();
      const response = await createClarityMapResponse(
        {
          sessionId: sessionContext.sessionId,
          sessionContext,
          messages: [
            {
              id: "u1",
              role: "user",
              content,
              createdAt: "2026-05-28T00:00:00.000Z",
            },
          ],
        },
        { clarityMapAgent },
      );

      expect(response).toMatchObject({
        type: "boundary_blocked",
        source: "boundary",
      });
      expect(clarityMapAgent).not.toHaveBeenCalled();
    },
  );

  it("blocks one-message imminent safety request before insufficient context", async () => {
    const clarityMapAgent = vi.fn();
    const response = await createClarityMapResponse(
      {
        sessionId: sessionContext.sessionId,
        sessionContext,
        messages: [
          {
            id: "u1",
            role: "user",
            content: "I have pills and I am going to take them tonight.",
            createdAt: "2026-05-28T00:00:00.000Z",
          },
        ],
      },
      { clarityMapAgent },
    );

    expect(response).toMatchObject({
      type: "safety_blocked",
      source: "safety",
    });
    expect(clarityMapAgent).not.toHaveBeenCalled();
  });

  it("returns a fallback clarity map for normal transcript", async () => {
    const response = await createClarityMapResponse({
      sessionId: sessionContext.sessionId,
      sessionContext,
      messages: normalMessages,
    });

    expect(response).toMatchObject({
      type: "clarity_map",
      source: "fallback",
    });
    const clarityMap = (response as Extract<
      EnhancedClarityMapResponse,
      { type: "clarity_map" }
    >).clarityMap;
    expect(clarityMap.disclaimer).toContain("not a diagnosis");
    expect(
      clarityMap.keyInsight.evidence.flatMap((item) => item.evidenceMessageIds),
    ).toContain("u1");
  });

  it("can return an injected OpenAI clarity map for normal transcript", async () => {
    const clarityMap = buildStructuredMap();
    const clarityMapAgent = vi.fn().mockResolvedValue({
      clarityMap,
      source: "openai",
    });
    const response = await createClarityMapResponse(
      {
        sessionId: sessionContext.sessionId,
        sessionContext,
        messages: normalMessages,
      },
      { clarityMapAgent },
    );

    expect(response).toMatchObject({
      type: "clarity_map",
      source: "openai",
      clarityMap,
    });
    expect(clarityMapAgent).toHaveBeenCalledTimes(1);
  });

  it("blocks high-risk latest message before model generation", async () => {
    const clarityMapAgent = vi.fn();
    const response = await createClarityMapResponse(
      {
        sessionId: sessionContext.sessionId,
        sessionContext,
        messages: [
          ...normalMessages,
          {
            id: "u3",
            role: "user",
            content: "i want to kill myself and I do not know what to do now",
            createdAt: "2026-05-28T00:03:00.000Z",
          },
        ],
      },
      { clarityMapAgent },
    );

    expect(response).toMatchObject({
      type: "safety_blocked",
      source: "safety",
    });
    expect(clarityMapAgent).not.toHaveBeenCalled();
  });

  it("blocks imminent latest message before model generation", async () => {
    const clarityMapAgent = vi.fn();
    const response = await createClarityMapResponse(
      {
        sessionId: sessionContext.sessionId,
        sessionContext,
        messages: [
          ...normalMessages,
          {
            id: "u3",
            role: "user",
            content: "I have pills and I'm going to take them tonight.",
            createdAt: "2026-05-28T00:03:00.000Z",
          },
        ],
      },
      { clarityMapAgent },
    );

    expect(response).toMatchObject({
      type: "safety_blocked",
      source: "safety",
    });
    expect(clarityMapAgent).not.toHaveBeenCalled();
  });

  it("blocks third-party imminent message before model generation", async () => {
    const clarityMapAgent = vi.fn();
    const response = await createClarityMapResponse(
      {
        sessionId: sessionContext.sessionId,
        sessionContext,
        messages: [
          ...normalMessages,
          {
            id: "u3",
            role: "user",
            content: "My friend has pills and says he will take them tonight.",
            createdAt: "2026-05-28T00:03:00.000Z",
          },
        ],
      },
      { clarityMapAgent },
    );

    expect(response).toMatchObject({
      type: "safety_blocked",
      source: "safety",
    });
    expect(clarityMapAgent).not.toHaveBeenCalled();
  });

  it("blocks diagnosis boundary before model generation", async () => {
    const clarityMapAgent = vi.fn();
    const response = await createClarityMapResponse(
      {
        sessionId: sessionContext.sessionId,
        sessionContext,
        messages: [
          ...normalMessages,
          {
            id: "u3",
            role: "user",
            content: "Can you diagnose me with depression?",
            createdAt: "2026-05-28T00:03:00.000Z",
          },
        ],
      },
      { clarityMapAgent },
    );

    expect(response).toMatchObject({
      type: "boundary_blocked",
      source: "boundary",
    });
    expect(clarityMapAgent).not.toHaveBeenCalled();
  });
});

function buildStructuredMap(): StructuredClarityMap {
  return {
    schemaVersion: "clarity_map.v1",
    status: "generated",
    disclaimer: "This is not a diagnosis. It is a reflection map.",
    harmonySignal: {
      label: "Pressure is visible",
      score: 60,
      band: "mixed",
      explanation: "The transcript suggests pressure with some clarity.",
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
      summary: "The user may be carrying work pressure into recovery time.",
      evidence: [
        { point: "The user named overwhelm.", evidenceMessageIds: ["u1"] },
        { point: "The user mentioned replaying conversations.", evidenceMessageIds: ["u1"] },
        { point: "The user asked for a small step.", evidenceMessageIds: ["u2"] },
      ],
    },
    boundaryFocus: {
      title: "Protect one recovery boundary",
      boundaryType: "energy_boundary",
      insights: ["A small boundary may help.", "Recovery time may need protection."],
      smallExperiment: "Shrink one task today.",
    },
    actionPlan: {
      next24Hours: [
        { action: "Write two sentences.", whyThisHelps: "It clarifies pressure." },
        { action: "Take a short pause.", whyThisHelps: "It supports reflection." },
        { action: "Text a trusted person.", whyThisHelps: "It adds support." },
      ],
      next7Days: [
        { action: "Track pressure moments.", whyThisHelps: "It reveals patterns." },
        { action: "Try a shutdown cue.", whyThisHelps: "It protects recovery." },
        { action: "Consider support.", whyThisHelps: "It can help explore patterns." },
      ],
    },
    supportPath: {
      recommendation: "Start with practical reflection and trusted support.",
      suggestedResourceTopics: ["stress", "support"],
      professionalSupportNote: "This is not a diagnosis.",
    },
    confidence: "medium",
  };
}
