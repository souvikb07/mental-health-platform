import { describe, expect, it, vi } from "vitest";

import { createChatResponse, createMockChatResponse } from "../../src/lib/server/chat";

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
    expect(response.assistantMessage.content).toBe("Supportive medium-risk response.");
    expect(conversationAgent).toHaveBeenCalledTimes(1);
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
    expect(response.source).toBe("safety");
    expect(response.safety?.showInlineSafetyCard).toBe(true);
    expect(response.safety?.disableNormalNextStep).toBe(true);
    expect(response.resources.length).toBeGreaterThan(0);
    expect(response.assistantMessage.content).not.toContain("What part of this");
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
      },
      { conversationAgent },
    );

    expect(response.risk.level).toBe("imminent");
    expect(response.risk.categories).toContain("self_harm");
    expect(response.risk.requiresCrisisResponse).toBe(true);
    expect(response.nextRecommendedAction).toBe("urgent_support");
    expect(response.mode).toBe("crisis");
    expect(response.source).toBe("safety");
    expect(response.safety?.showInlineSafetyCard).toBe(true);
    expect(response.safety?.disableNormalNextStep).toBe(true);
    expect(response.resources[0]?.country).toBe("IN");
    expect(conversationAgent).not.toHaveBeenCalled();
  });

  it("falls back safely when OpenAI env config is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENAI_MODEL", "");

    const response = await createChatResponse({
      sessionId: "mock_session_test",
      message: "I feel exhausted and I do not know why.",
    });

    expect(response.source).toBe("fallback");
    expect(response.assistantMessage.content).toContain("physically tired");
    vi.unstubAllEnvs();
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
