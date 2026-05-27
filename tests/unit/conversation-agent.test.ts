import { describe, expect, it, vi } from "vitest";

import { generateConversationReply } from "../../src/lib/ai/conversation-agent";

describe("generateConversationReply", () => {
  it("uses the Responses API with store false and non-streaming", async () => {
    const create = vi.fn().mockResolvedValue({
      output_text: "What changed recently that feels most important?",
    });

    const response = await generateConversationReply(
      {
        message: "I feel overwhelmed at work.",
        risk: {
          level: "low",
          categories: [],
          requiresCrisisResponse: false,
        },
      },
      {
        configured: true,
        model: "test-model",
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
        model: "test-model",
        store: false,
        stream: false,
      }),
    );
  });

  it("returns fallback when config is missing", async () => {
    const create = vi.fn();
    const response = await generateConversationReply(
      {
        message: "I feel overwhelmed at work.",
        risk: {
          level: "low",
          categories: [],
          requiresCrisisResponse: false,
        },
      },
      {
        configured: false,
        model: null,
        client: {
          responses: {
            create,
          },
        },
      },
    );

    expect(response.source).toBe("fallback");
    expect(create).not.toHaveBeenCalled();
  });
});
