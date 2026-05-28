import { describe, expect, it, vi } from "vitest";

import { createChatResponse, createMockChatResponse } from "../../src/lib/server/chat";
import type { SessionContext } from "../../src/types/session-context";

const usSessionContext: SessionContext = {
  sessionId: "mock_session_test",
  countryCode: "US",
  countryLabel: "United States",
  ageConfirmed: true,
};

const inSessionContext: SessionContext = {
  sessionId: "mock_session_test",
  countryCode: "IN",
  countryLabel: "India",
  ageConfirmed: true,
};

const globalSessionContext: SessionContext = {
  sessionId: "mock_session_test",
  countryCode: "GLOBAL",
  ageConfirmed: true,
};

describe("createChatResponse", () => {
  it("can call the conversation agent for low-risk exhaustion", async () => {
    const conversationAgent = vi.fn().mockResolvedValue({
      content: "OpenAI-style reflective response.",
      source: "openai",
    });
    const response = await createChatResponse(
      {
        sessionId: "mock_session_test",
        message: "I feel exhausted and I do not know why.",
      },
      { conversationAgent },
    );

    expect(response.risk.level).toBe("low");
    expect(response.nextRecommendedAction).toBe("continue_chat");
    expect(response.safetyState).toBe("normal_support");
    expect(response.safety).toBeNull();
    expect(response.assistantMessage.content).toBe("OpenAI-style reflective response.");
    expect(response.source).toBe("openai");
    expect(conversationAgent).toHaveBeenCalledTimes(1);
  });

  it("can call the conversation agent for medium-risk messages", async () => {
    const conversationAgent = vi.fn().mockResolvedValue({
      content: "Supportive medium-risk response.",
      source: "openai",
    });
    const response = await createChatResponse(
      {
        sessionId: "mock_session_test",
        message: "I cannot function lately.",
      },
      { conversationAgent },
    );

    expect(response.risk.level).toBe("medium");
    expect(response.nextRecommendedAction).toBe("continue_with_supportive_nudge");
    expect(response.safetyState).toBe("elevated_distress");
    expect(response.assistantMessage.content).toBe("Supportive medium-risk response.");
    expect(conversationAgent).toHaveBeenCalledTimes(1);
  });

  it("allows conversation agent for ambiguous elevated distress", async () => {
    const conversationAgent = vi.fn().mockResolvedValue({
      content: "Safety-aware OpenAI-style response.",
      source: "openai",
    });
    const response = await createChatResponse(
      {
        sessionId: "mock_session_test",
        message: "I don't know if I can keep doing this.",
      },
      { conversationAgent },
    );

    expect(response.risk.level).toBe("medium");
    expect(response.safetyState).toBe("elevated_distress");
    expect(response.source).toBe("openai");
    expect(response.safety).toBeNull();
    expect(response.resources.every((resource) =>
      !resource.topics.includes("crisis")
    )).toBe(true);
    expect(conversationAgent).toHaveBeenCalledTimes(1);
  });

  it("uses safety-aware fallback for ambiguous elevated distress", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENAI_MODEL", "");

    const response = await createChatResponse({
      sessionId: "mock_session_test",
      message: "I don't know if I can keep doing this.",
    });

    expect(response.risk.level).toBe("medium");
    expect(response.safetyState).toBe("elevated_distress");
    expect(response.source).toBe("fallback");
    expect(response.assistantMessage.content).toContain("really heavy");
    expect(response.assistantMessage.content).toContain("feeling unsafe");
    expect(response.assistantMessage.content).not.toBe(
      "Thank you for sharing that. What part of this has been affecting your day-to-day life the most?",
    );
    vi.unstubAllEnvs();
  });

  it("routes high risk to resources without calling the conversation model", async () => {
    const conversationAgent = vi.fn().mockResolvedValue({
      content: "This should not be used.",
      source: "openai",
    });
    const response = await createChatResponse(
      {
        sessionId: "mock_session_test",
        message: "I want to die.",
      },
      { conversationAgent },
    );

    expect(response.risk.level).toBe("high");
    expect(response.nextRecommendedAction).toBe("show_resources");
    expect(response.safetyState).toBe("active_suicidal_ideation");
    expect(response.source).toBe("safety");
    expect(response.safety?.showInlineSafetyCard).toBe(true);
    expect(response.safety?.disableNormalNextStep).toBe(true);
    expect(response.resources.length).toBeGreaterThan(0);
    expect(response.assistantMessage.content).not.toContain("What part of this");
    expect(conversationAgent).not.toHaveBeenCalled();
  });

  it("does not call the conversation agent for AI-escalated high risk", async () => {
    const conversationAgent = vi.fn().mockResolvedValue({
      content: "This should not be used.",
      source: "openai",
    });
    const response = await createChatResponse(
      {
        sessionId: "mock_session_test",
        message: "I feel like a burden.",
      },
      {
        conversationAgent,
        aiTriageClassifier: vi.fn().mockResolvedValue({
          available: true,
          signal: {
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
          },
        }),
      },
    );

    expect(response.risk.level).toBe("high");
    expect(response.safetyState).toBe("passive_suicidal_ideation");
    expect(response.source).toBe("safety");
    expect(conversationAgent).not.toHaveBeenCalled();
  });

  it("routes imminent risk to urgent support without calling the conversation model", async () => {
    const conversationAgent = vi.fn().mockResolvedValue({
      content: "This should not be used.",
      source: "openai",
    });
    const response = await createChatResponse(
      {
        sessionId: "mock_session_test",
        message: "I have pills and I'm going to take them tonight.",
        sessionContext: inSessionContext,
      },
      { conversationAgent },
    );

    expect(response.risk.level).toBe("imminent");
    expect(response.risk.categories).toContain("self_harm");
    expect(response.risk.requiresCrisisResponse).toBe(true);
    expect(response.nextRecommendedAction).toBe("urgent_support");
    expect(response.safetyState).toBe("imminent_risk");
    expect(response.mode).toBe("crisis");
    expect(response.source).toBe("safety");
    expect(response.safety?.showInlineSafetyCard).toBe(true);
    expect(response.safety?.disableNormalNextStep).toBe(true);
    expect(response.resources[0]?.country).toBe("IN");
    expect(conversationAgent).not.toHaveBeenCalled();
  });

  it("classifies direct self-harm as high or imminent without calling the model", async () => {
    const conversationAgent = vi.fn();
    const response = await createChatResponse(
      {
        sessionId: "mock_session_test",
        message: "i want to kill myself",
        sessionContext: usSessionContext,
      },
      { conversationAgent },
    );

    expect(["high", "imminent"]).toContain(response.risk.level);
    expect(response.risk.categories).toContain("self_harm");
    expect(response.risk.requiresCrisisResponse).toBe(true);
    expect(response.safetyState).toBe("active_suicidal_ideation");
    expect(response.source).toBe("safety");
    expect(conversationAgent).not.toHaveBeenCalled();
  });

  it("uses United States resources first for US session safety routing", async () => {
    const response = await createChatResponse({
      sessionId: "mock_session_test",
      message: "i want to kill myself",
      sessionContext: usSessionContext,
    });

    expect(response.source).toBe("safety");
    expect(response.safetyState).toBe("active_suicidal_ideation");
    expect(response.resources[0]?.country).toBe("US");
    expect(response.resources[0]?.id).toBe("us-988-lifeline");
  });

  it("uses India resources first for India session safety routing", async () => {
    const response = await createChatResponse({
      sessionId: "mock_session_test",
      message: "i want to kill myself",
      sessionContext: inSessionContext,
    });

    expect(response.source).toBe("safety");
    expect(response.safetyState).toBe("active_suicidal_ideation");
    expect(response.resources[0]?.country).toBe("IN");
  });

  it("uses global resources when session country is missing or global", async () => {
    const response = await createChatResponse({
      sessionId: "mock_session_test",
      message: "i want to kill myself",
      sessionContext: globalSessionContext,
    });

    expect(response.source).toBe("safety");
    expect(response.safetyState).toBe("active_suicidal_ideation");
    expect(response.resources[0]?.country).toBe("global");
    expect(response.resources.some((resource) => resource.country === "IN")).toBe(
      false,
    );
  });

  it("falls back safely when OpenAI env config is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENAI_MODEL", "");

    const response = await createChatResponse({
      sessionId: "mock_session_test",
      message: "I feel exhausted and I do not know why.",
    });

    expect(response.source).toBe("fallback");
    expect(response.safetyState).toBe("normal_support");
    expect(response.assistantMessage.content).toContain("physically tired");
    vi.unstubAllEnvs();
  });

  it("keeps the public chat response shape stable", async () => {
    const response = await createChatResponse({
      sessionId: "mock_session_test",
      message: "Can you diagnose me with depression?",
    });

    expect(response).toMatchObject({
      assistantMessage: {
        role: "assistant",
      },
      risk: expect.any(Object),
      nextRecommendedAction: expect.any(String),
      mode: expect.any(String),
      resources: expect.any(Array),
      source: "boundary",
      safetyState: "policy_boundary",
    });
    expect(response).toHaveProperty("safety");
    expect(response).toHaveProperty("policyBoundary");
    expect(response).not.toHaveProperty("safetyDecision");
  });
});

describe("createMockChatResponse", () => {
  it("aliases createChatResponse for compatibility", async () => {
    const response = await createMockChatResponse({
      sessionId: "mock_session_test",
      message: "I feel overwhelmed at work.",
    });

    expect(response.risk.level).toBe("low");
  });
});
