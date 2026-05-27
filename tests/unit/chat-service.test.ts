import { describe, expect, it } from "vitest";

import { createMockChatResponse } from "../../src/lib/server/chat";

describe("createMockChatResponse", () => {
  it("continues normal chat for low-risk exhaustion", () => {
    const response = createMockChatResponse({
      sessionId: "mock_session_test",
      message: "I feel exhausted and I do not know why.",
    });

    expect(response.risk.level).toBe("low");
    expect(response.nextRecommendedAction).toBe("continue_chat");
    expect(response.safety).toBeNull();
    expect(response.assistantMessage.content).toContain("physically tired");
  });

  it("routes high risk to resources without normal reflective questioning", () => {
    const response = createMockChatResponse({
      sessionId: "mock_session_test",
      message: "I want to die.",
    });

    expect(response.risk.level).toBe("high");
    expect(response.nextRecommendedAction).toBe("show_resources");
    expect(response.safety?.showInlineSafetyCard).toBe(true);
    expect(response.safety?.disableNormalNextStep).toBe(true);
    expect(response.resources.length).toBeGreaterThan(0);
    expect(response.assistantMessage.content).not.toContain("What part of this");
  });

  it("routes imminent risk to urgent support", () => {
    const response = createMockChatResponse({
      sessionId: "mock_session_test",
      message: "I have pills and I'm going to take them tonight.",
    });

    expect(response.risk.level).toBe("imminent");
    expect(response.risk.categories).toContain("self_harm");
    expect(response.risk.requiresCrisisResponse).toBe(true);
    expect(response.nextRecommendedAction).toBe("urgent_support");
    expect(response.mode).toBe("crisis");
    expect(response.safety?.showInlineSafetyCard).toBe(true);
    expect(response.safety?.disableNormalNextStep).toBe(true);
    expect(response.resources[0]?.country).toBe("IN");
  });
});
