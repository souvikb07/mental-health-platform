import { describe, expect, it } from "vitest";

import { getFallbackStructuredClarityMap } from "../../src/lib/ai/clarity-map/clarity-map-fallback";
import type { ApiChatMessage } from "../../src/types/risk";
import type {
  MainConcernCategory,
  SessionContext,
} from "../../src/types/session-context";

describe("clarity map fallback harmony signal", () => {
  it("scores low-energy disconnection lower than clearer work-boundary fallback", () => {
    const workMap = getFallbackStructuredClarityMap({
      sessionContext: buildSessionContext("work_study_stress", "Work or study stress"),
      messages: buildMessages([
        "I feel overwhelmed after work and keep replaying conversations.",
        "I want one small step that helps me stop carrying it all evening.",
      ]),
    });
    const lowEnergyMap = getFallbackStructuredClarityMap({
      sessionContext: buildSessionContext(
        "low_numb_disconnected",
        "Low / numb / disconnected",
      ),
      messages: buildMessages([
        "I feel low, disconnected, and exhausted most evenings.",
        "I do not have much energy to explain it yet.",
      ]),
    });

    expect(lowEnergyMap.harmonySignal.score).toBeLessThan(
      workMap.harmonySignal.score,
    );
    expect(lowEnergyMap.harmonySignal.label).toContain("Energy");
  });

  it("uses different labels, components, and boundary types for work and relationship scenarios", () => {
    const workMap = getFallbackStructuredClarityMap({
      sessionContext: buildSessionContext("work_study_stress", "Work or study stress"),
      messages: buildMessages([
        "Work deadlines keep leaking into my evening.",
        "I want a small shutdown step after work.",
      ]),
    });
    const relationshipMap = getFallbackStructuredClarityMap({
      sessionContext: buildSessionContext(
        "relationship_family",
        "Relationship or family",
      ),
      messages: buildMessages([
        "I feel responsible for my partner's moods after every conflict.",
        "I need a boundary but I do not want to be harsh.",
      ]),
    });

    expect(workMap.harmonySignal.label).not.toBe(
      relationshipMap.harmonySignal.label,
    );
    expect(workMap.harmonySignal.components).not.toEqual(
      relationshipMap.harmonySignal.components,
    );
    expect(workMap.boundaryFocus.boundaryType).toBe("work_boundary");
    expect(relationshipMap.boundaryFocus.boundaryType).toBe(
      "relationship_boundary",
    );
  });

  it("uses worry-specific harmony copy and components for worry loops", () => {
    const worryMap = getFallbackStructuredClarityMap({
      sessionContext: buildSessionContext("anxious_worried", "Anxious / worried"),
      messages: buildMessages([
        "I keep overthinking the same worry and replaying what might happen.",
        "I want one plan that helps me separate what I can influence.",
      ]),
    });

    expect(worryMap.harmonySignal.label).toContain("worry loop");
    expect(worryMap.harmonySignal.components.triggerClarity).toBeGreaterThanOrEqual(
      3,
    );
    expect(worryMap.harmonySignal.components.actionReadiness).toBeGreaterThanOrEqual(
      3,
    );
  });

  it("keeps unclear maps still-forming and away from the old default score", () => {
    const notSureMap = getFallbackStructuredClarityMap({
      sessionContext: buildSessionContext("not_sure", "I'm not sure"),
      messages: buildMessages([
        "I am not sure what is wrong.",
        "I do not know what pattern to name yet.",
      ]),
    });

    expect(notSureMap.harmonySignal.label).toContain("still forming");
    expect(notSureMap.harmonySignal.score).not.toBe(60);
    expect(notSureMap.confidence).toBe("low");
  });
});

function buildSessionContext(
  mainConcernCategory: MainConcernCategory,
  mainConcernLabel: string,
): SessionContext {
  return {
    sessionId: `mock_session_${mainConcernCategory}`,
    countryCode: "US",
    countryLabel: "USA",
    ageConfirmed: true,
    consentAccepted: true,
    mainConcernCategory,
    mainConcernLabel,
  };
}

function buildMessages(contents: string[]): ApiChatMessage[] {
  return contents.map((content, index) => ({
    id: `u${index + 1}`,
    role: "user",
    content,
    createdAt: `2026-05-28T00:0${index}:00.000Z`,
  }));
}
