import { describe, expect, it } from "vitest";

import { routeSafety } from "../../src/lib/safety/safety-router";
import type { ApiRiskClassification } from "../../src/types/risk";

function risk(
  risk: Partial<ApiRiskClassification>,
): ApiRiskClassification {
  return {
    level: "none",
    categories: [],
    requiresCrisisResponse: false,
    ...risk,
  };
}

describe("routeSafety", () => {
  it("continues normal chat for low risk", () => {
    expect(routeSafety(risk({ level: "low" }))).toMatchObject({
      mode: "normal",
      nextRecommendedAction: "continue_chat",
      safety: null,
      shouldShowResources: false,
    });
  });

  it("adds a supportive nudge for medium risk", () => {
    expect(
      routeSafety(risk({ level: "medium", categories: ["substance_use"] })),
    ).toMatchObject({
      mode: "support",
      nextRecommendedAction: "continue_with_supportive_nudge",
      shouldShowResources: true,
    });
  });

  it("shows resources and disables the normal next step for high risk", () => {
    const route = routeSafety(
      risk({
        level: "high",
        categories: ["self_harm"],
        requiresCrisisResponse: true,
      }),
    );

    expect(route.nextRecommendedAction).toBe("show_resources");
    expect(route.safety?.showInlineSafetyCard).toBe(true);
    expect(route.safety?.disableNormalNextStep).toBe(true);
  });

  it("uses urgent support routing for imminent risk", () => {
    const route = routeSafety(
      risk({
        level: "imminent",
        categories: ["self_harm"],
        requiresCrisisResponse: true,
      }),
    );

    expect(route.mode).toBe("crisis");
    expect(route.nextRecommendedAction).toBe("urgent_support");
    expect(route.safety?.tone).toBe("urgent");
    expect(route.safety?.disableNormalNextStep).toBe(true);
  });
});
