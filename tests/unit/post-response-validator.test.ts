import { describe, expect, it } from "vitest";

import { safeFallbackResponse } from "../../src/lib/ai/fallbacks";
import { validateAssistantResponse } from "../../src/lib/ai/post-response-validator";

describe("validateAssistantResponse", () => {
  it("passes safe reflective output unchanged", () => {
    const result = validateAssistantResponse(
      "That sounds heavy. What changed most recently?",
    );

    expect(result.blocked).toBe(false);
    expect(result.content).toBe("That sounds heavy. What changed most recently?");
  });

  it("replaces definitive diagnosis language", () => {
    const result = validateAssistantResponse("You have depression.");

    expect(result.blocked).toBe(true);
    expect(result.reason).toBe("definitive_diagnosis");
    expect(result.content).toBe(safeFallbackResponse);
  });

  it("replaces medication advice", () => {
    const result = validateAssistantResponse("You should take medication for this.");

    expect(result.blocked).toBe(true);
    expect(result.reason).toBe("medication_advice");
    expect(result.content).toBe(safeFallbackResponse);
  });

  it("replaces treatment fix claims", () => {
    const result = validateAssistantResponse("This treatment will fix you.");

    expect(result.blocked).toBe(true);
    expect(result.reason).toBe("treatment_protocol");
  });

  it("replaces unsafe reassurance", () => {
    const result = validateAssistantResponse("You are definitely safe.");

    expect(result.blocked).toBe(true);
    expect(result.reason).toBe("unsafe_reassurance");
  });
});
