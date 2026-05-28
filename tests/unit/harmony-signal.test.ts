import { describe, expect, it } from "vitest";

import {
  computeHarmonyScore,
  deriveHarmonyBand,
  normalizeHarmonySignal,
} from "../../src/lib/ai/clarity-map/harmony-signal";

describe("harmony signal scoring", () => {
  it("returns different scores for distinct component sets", () => {
    const clearWorkBoundary = computeHarmonyScore({
      emotionalLoad: 2,
      triggerClarity: 4,
      supportConnection: 3,
      actionReadiness: 3,
      safetyStability: 4,
    });
    const lowConnection = computeHarmonyScore({
      emotionalLoad: 4,
      triggerClarity: 1,
      supportConnection: 0,
      actionReadiness: 1,
      safetyStability: 2,
    });

    expect(clearWorkBoundary).not.toBe(lowConnection);
    expect(clearWorkBoundary).toBeGreaterThan(lowConnection);
  });

  it("treats higher emotional load as score-lowering", () => {
    const lowerLoad = computeHarmonyScore({
      emotionalLoad: 1,
      triggerClarity: 3,
      supportConnection: 2,
      actionReadiness: 2,
      safetyStability: 3,
    });
    const higherLoad = computeHarmonyScore({
      emotionalLoad: 4,
      triggerClarity: 3,
      supportConnection: 2,
      actionReadiness: 2,
      safetyStability: 3,
    });

    expect(lowerLoad).toBeGreaterThan(higherLoad);
  });

  it.each([
    [75, "steady"],
    [55, "mixed"],
    [35, "strained"],
    [34, "support_first"],
  ] as const)("maps score %s to %s", (score, band) => {
    expect(deriveHarmonyBand(score)).toBe(band);
  });

  it("normalizes score and band from components", () => {
    const signal = normalizeHarmonySignal({
      label: "  Pattern is visible  ",
      explanation: "  Based only on this conversation.  ",
      components: {
        emotionalLoad: 3,
        triggerClarity: 2,
        supportConnection: 2,
        actionReadiness: 2,
        safetyStability: 3,
      },
    });

    expect(signal).toMatchObject({
      label: "Pattern is visible",
      score: 48,
      band: "strained",
      explanation: "Based only on this conversation.",
    });
  });
});
