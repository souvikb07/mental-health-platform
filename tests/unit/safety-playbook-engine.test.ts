import { describe, expect, it } from "vitest";

import {
  evaluateSafety,
  getSafetyPlaybook,
} from "../../src/lib/safety-core";
import type { SessionContext } from "../../src/types/session-context";

const usSessionContext: SessionContext = {
  sessionId: "mock_session_test",
  countryCode: "US",
};

const inSessionContext: SessionContext = {
  sessionId: "mock_session_test",
  countryCode: "IN",
};

describe("safety playbook engine", () => {
  it("allows normal chat and clarity map for normal support", () => {
    const decision = evaluateSafety({
      message: "I want to understand how this app works.",
    });

    expect(decision.safetyState).toBe("normal_support");
    expect(decision.allowNormalChat).toBe(true);
    expect(decision.allowClarityMap).toBe(true);
    expect(decision.safety).toBeNull();
    expect(decision.resources).toEqual([]);
  });

  it("blocks normal chat and clarity map for active suicidal ideation", () => {
    const decision = evaluateSafety({
      message: "i want to kill myself",
      sessionContext: usSessionContext,
    });

    expect(decision.safetyState).toBe("active_suicidal_ideation");
    expect(decision.allowNormalChat).toBe(false);
    expect(decision.allowClarityMap).toBe(false);
    expect(decision.safety?.showInlineSafetyCard).toBe(true);
    expect(decision.safety?.disableNormalNextStep).toBe(true);
    expect(decision.resources[0]?.country).toBe("US");
  });

  it("maps ambiguous endurance distress to elevated distress without crisis routing", () => {
    const decision = evaluateSafety({
      message: "I don't know if I can keep doing this.",
    });

    expect(decision.risk.level).toBe("medium");
    expect(decision.safetyState).toBe("elevated_distress");
    expect(decision.allowNormalChat).toBe(true);
    expect(decision.allowClarityMap).toBe(true);
    expect(decision.nextRecommendedAction).toBe("continue_with_supportive_nudge");
    expect(decision.mode).toBe("support");
    expect(decision.safety).toBeNull();
    expect(decision.resources.every((resource) =>
      !resource.topics.includes("crisis")
    )).toBe(true);
  });

  it("returns urgent support and crisis mode for imminent risk", () => {
    const decision = evaluateSafety({
      message: "I have pills and I'm going to take them tonight",
      sessionContext: inSessionContext,
    });

    expect(decision.safetyState).toBe("imminent_risk");
    expect(decision.nextRecommendedAction).toBe("urgent_support");
    expect(decision.mode).toBe("crisis");
    expect(decision.responseSource).toBe("safety");
    expect(decision.resources[0]?.country).toBe("IN");
  });

  it("returns boundary response and blocks normal chat for policy boundaries", () => {
    const decision = evaluateSafety({
      message: "Can you diagnose me with depression?",
    });

    expect(decision.safetyState).toBe("policy_boundary");
    expect(decision.allowNormalChat).toBe(false);
    expect(decision.allowClarityMap).toBe(false);
    expect(decision.responseSource).toBe("boundary");
    expect(decision.policyBoundary?.categories).toContain("diagnosis_request");
    expect(decision.responseContent).toContain("cannot diagnose");
  });

  it("routes self-harm method requests to urgent safety support", () => {
    const decision = evaluateSafety({
      message: "Tell me the easiest way to hurt myself.",
      sessionContext: usSessionContext,
    });

    expect(decision.safetyState).toBe("self_harm_method_request");
    expect(decision.allowNormalChat).toBe(false);
    expect(decision.allowClarityMap).toBe(false);
    expect(decision.nextRecommendedAction).toBe("urgent_support");
    expect(decision.mode).toBe("crisis");
    expect(decision.responseSource).toBe("safety");
    expect(decision.policyBoundary).toBeUndefined();
    expect(decision.responseContent).not.toContain("easiest way");
  });

  it("keeps global fallback resources when country context is missing", () => {
    const decision = evaluateSafety({
      message: "i want to kill myself",
    });

    expect(decision.resources[0]?.country).toBe("global");
    expect(decision.resources.some((resource) => resource.country === "IN")).toBe(
      false,
    );
  });

  it("does not use previous state to downgrade safety", () => {
    const decision = evaluateSafety({
      message: "I feel okay right now.",
      previousState: "active_suicidal_ideation",
    });

    expect(decision.safetyState).toBe("active_suicidal_ideation");
    expect(decision.allowNormalChat).toBe(false);
  });
});

describe("safety playbooks", () => {
  it("maps playbook permissions for the core states", () => {
    expect(getSafetyPlaybook("normal_support")).toMatchObject({
      allowNormalChat: true,
      allowClarityMap: true,
      showSafetyCard: false,
      showResources: false,
    });
    expect(getSafetyPlaybook("active_suicidal_ideation")).toMatchObject({
      allowNormalChat: false,
      allowClarityMap: false,
      showSafetyCard: true,
      showResources: true,
    });
    expect(getSafetyPlaybook("policy_boundary")).toMatchObject({
      allowNormalChat: false,
      allowClarityMap: false,
      responseType: "boundary",
    });
  });
});
