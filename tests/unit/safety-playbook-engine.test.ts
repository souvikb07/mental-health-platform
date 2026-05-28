import { describe, expect, it, vi } from "vitest";

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
  it("allows normal chat and clarity map for normal support", async () => {
    const decision = await evaluateSafety({
      message: "I want to understand how this app works.",
    });

    expect(decision.safetyState).toBe("normal_support");
    expect(decision.allowNormalChat).toBe(true);
    expect(decision.allowClarityMap).toBe(true);
    expect(decision.safety).toBeNull();
    expect(decision.resources).toEqual([]);
  });

  it("blocks normal chat and clarity map for active suicidal ideation", async () => {
    const decision = await evaluateSafety({
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

  it("maps ambiguous endurance distress to elevated distress without crisis routing", async () => {
    const decision = await evaluateSafety({
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

  it("returns urgent support and crisis mode for imminent risk", async () => {
    const decision = await evaluateSafety({
      message: "I have pills and I'm going to take them tonight",
      sessionContext: inSessionContext,
    });

    expect(decision.safetyState).toBe("imminent_risk");
    expect(decision.nextRecommendedAction).toBe("urgent_support");
    expect(decision.mode).toBe("crisis");
    expect(decision.responseSource).toBe("safety");
    expect(decision.resources[0]?.country).toBe("IN");
  });

  it("returns boundary response and blocks normal chat for policy boundaries", async () => {
    const decision = await evaluateSafety({
      message: "Can you diagnose me with depression?",
    });

    expect(decision.safetyState).toBe("policy_boundary");
    expect(decision.allowNormalChat).toBe(false);
    expect(decision.allowClarityMap).toBe(false);
    expect(decision.responseSource).toBe("boundary");
    expect(decision.policyBoundary?.categories).toContain("diagnosis_request");
    expect(decision.responseContent).toContain("cannot diagnose");
  });

  it("routes self-harm method requests to urgent safety support", async () => {
    const decision = await evaluateSafety({
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

  it("keeps global fallback resources when country context is missing", async () => {
    const decision = await evaluateSafety({
      message: "i want to kill myself",
    });

    expect(decision.resources[0]?.country).toBe("global");
    expect(decision.resources.some((resource) => resource.country === "IN")).toBe(
      false,
    );
  });

  it("does not use previous state to downgrade safety", async () => {
    const decision = await evaluateSafety({
      message: "I feel okay right now.",
      previousState: "active_suicidal_ideation",
    });

    expect(decision.safetyState).toBe("active_suicidal_ideation");
    expect(decision.allowNormalChat).toBe(false);
  });

  it("skips AI triage for deterministic imminent risk", async () => {
    const aiTriageClassifier = vi.fn();
    const decision = await evaluateSafety(
      {
        message: "I have pills and I'm going to take them tonight",
      },
      { aiTriageClassifier },
    );

    expect(decision.safetyState).toBe("imminent_risk");
    expect(decision.aiTriage).toMatchObject({ used: false, escalated: false });
    expect(aiTriageClassifier).not.toHaveBeenCalled();
  });

  it("skips AI triage for deterministic high self-harm risk", async () => {
    const aiTriageClassifier = vi.fn();
    const decision = await evaluateSafety(
      {
        message: "i want to kill myself",
      },
      { aiTriageClassifier },
    );

    expect(decision.safetyState).toBe("active_suicidal_ideation");
    expect(aiTriageClassifier).not.toHaveBeenCalled();
  });

  it("skips AI triage for clear diagnosis boundary", async () => {
    const aiTriageClassifier = vi.fn();
    const decision = await evaluateSafety(
      {
        message: "Can you diagnose me with depression?",
      },
      { aiTriageClassifier },
    );

    expect(decision.safetyState).toBe("policy_boundary");
    expect(decision.responseSource).toBe("boundary");
    expect(aiTriageClassifier).not.toHaveBeenCalled();
  });

  it("preserves deterministic behavior when AI triage is unavailable", async () => {
    const decision = await evaluateSafety(
      {
        message: "I feel overwhelmed at work.",
      },
      {
        aiTriageClassifier: vi
          .fn()
          .mockResolvedValue({ available: false, reason: "missing_config" }),
      },
    );

    expect(decision.risk.level).toBe("low");
    expect(decision.safetyState).toBe("normal_support");
    expect(decision.allowNormalChat).toBe(true);
    expect(decision.aiTriage).toMatchObject({
      available: false,
      used: false,
      escalated: false,
    });
  });

  it("skips the default AI triage classifier when triage env config is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENAI_TRIAGE_MODEL", "");

    const decision = await evaluateSafety({
      message: "I wish I could disappear.",
    });

    expect(decision.allowNormalChat).toBe(true);
    expect(decision.aiTriage).toMatchObject({
      available: false,
      used: false,
      escalated: false,
    });
    vi.unstubAllEnvs();
  });

  it("allows AI triage to escalate deterministic low risk to high", async () => {
    const decision = await evaluateSafety(
      {
        message: "I feel like a burden.",
        sessionContext: usSessionContext,
      },
      {
        aiTriageClassifier: vi.fn().mockResolvedValue({
          available: true,
          signal: buildTriageSignal({
            riskLevel: "high",
            safetyStateCandidate: "passive_suicidal_ideation",
            riskCategories: ["self_harm"],
            intentSignal: "passive_ideation",
            recommendedAction: "show_resources",
            confidence: "medium",
            rationaleCode: "passive_life_worth_signal",
          }),
        }),
      },
    );

    expect(decision.risk.level).toBe("high");
    expect(decision.safetyState).toBe("passive_suicidal_ideation");
    expect(decision.allowNormalChat).toBe(false);
    expect(decision.responseSource).toBe("safety");
    expect(decision.aiTriage).toMatchObject({
      available: true,
      used: true,
      escalated: true,
    });
  });

  it("allows AI triage to escalate deterministic medium risk to imminent", async () => {
    const decision = await evaluateSafety(
      {
        message: "I don't know if I can keep doing this.",
      },
      {
        aiTriageClassifier: vi.fn().mockResolvedValue({
          available: true,
          signal: buildTriageSignal({
            riskLevel: "imminent",
            safetyStateCandidate: "imminent_risk",
            riskCategories: ["self_harm"],
            temporalUrgency: "now",
            intentSignal: "intent_with_means",
            recommendedAction: "urgent_support",
            confidence: "high",
            rationaleCode: "means_plan_timing",
          }),
        }),
      },
    );

    expect(decision.risk.level).toBe("imminent");
    expect(decision.safetyState).toBe("imminent_risk");
    expect(decision.nextRecommendedAction).toBe("urgent_support");
  });

  it("does not allow AI triage to downgrade deterministic high or imminent safety", async () => {
    const aiTriageClassifier = vi.fn().mockResolvedValue({
      available: true,
      signal: buildTriageSignal({
        riskLevel: "low",
        safetyStateCandidate: "normal_support",
        confidence: "high",
      }),
    });
    const decision = await evaluateSafety(
      {
        message: "i want to kill myself",
      },
      { aiTriageClassifier },
    );

    expect(decision.risk.level).toBe("high");
    expect(decision.safetyState).toBe("active_suicidal_ideation");
    expect(aiTriageClassifier).not.toHaveBeenCalled();
  });

  it("routes third-party self-harm AI triage to safety support without self-directed wording", async () => {
    const decision = await evaluateSafety(
      {
        message: "My friend says he wants to kill himself.",
      },
      {
        aiTriageClassifier: vi.fn().mockResolvedValue({
          available: true,
          signal: buildTriageSignal({
            riskLevel: "high",
            safetyStateCandidate: "active_suicidal_ideation",
            riskCategories: ["self_harm"],
            subject: "other_person",
            intentSignal: "active_ideation",
            recommendedAction: "show_resources",
            confidence: "high",
            rationaleCode: "third_party_risk",
          }),
        }),
      },
    );

    expect(decision.safetyState).toBe("third_party_self_harm");
    expect(decision.responseSource).toBe("safety");
    expect(decision.responseContent).toContain("this person");
    expect(decision.responseContent).not.toContain("you may act");
  });

  it("routes deterministic third-party self-harm to safety without AI triage", async () => {
    const aiTriageClassifier = vi.fn();
    const decision = await evaluateSafety(
      {
        message: "My friend says he wants to kill himself.",
        sessionContext: usSessionContext,
      },
      { aiTriageClassifier },
    );

    expect(decision.risk.level).toBe("high");
    expect(decision.risk.signalTags).toContain("third_party_self_harm");
    expect(decision.safetyState).toBe("third_party_self_harm");
    expect(decision.responseSource).toBe("safety");
    expect(decision.allowNormalChat).toBe(false);
    expect(decision.resources[0]?.country).toBe("US");
    expect(decision.responseContent).toContain("this person");
    expect(decision.responseContent).not.toContain("you may act");
    expect(aiTriageClassifier).not.toHaveBeenCalled();
  });

  it("routes imminent deterministic third-party self-harm to urgent support", async () => {
    const decision = await evaluateSafety({
      message: "My friend has pills and says he will take them tonight.",
      sessionContext: inSessionContext,
    });

    expect(decision.risk.level).toBe("imminent");
    expect(decision.risk.signalTags).toEqual(
      expect.arrayContaining([
        "third_party_self_harm",
        "third_party_self_harm_imminent",
      ]),
    );
    expect(decision.safetyState).toBe("third_party_self_harm");
    expect(decision.nextRecommendedAction).toBe("urgent_support");
    expect(decision.mode).toBe("crisis");
    expect(decision.responseSource).toBe("safety");
    expect(decision.resources[0]?.country).toBe("IN");
  });

  it("can avoid false crisis for negated self-harm", async () => {
    const decision = await evaluateSafety(
      {
        message: "I don't want to kill myself, I'm just overwhelmed.",
      },
      {
        aiTriageClassifier: vi.fn().mockResolvedValue({
          available: true,
          signal: buildTriageSignal({
            riskLevel: "low",
            safetyStateCandidate: "normal_support",
            riskCategories: [],
            intentSignal: "distress",
            recommendedAction: "continue_chat",
            confidence: "high",
            rationaleCode: "ambiguous_distress",
          }),
        }),
      },
    );

    expect(["normal_support", "elevated_distress"]).toContain(
      decision.safetyState,
    );
    expect(decision.allowNormalChat).toBe(true);
  });

  it("can avoid false crisis for idiomatic language", async () => {
    const decision = await evaluateSafety(
      {
        message: "This homework is killing me.",
      },
      {
        aiTriageClassifier: vi.fn().mockResolvedValue({
          available: true,
          signal: buildTriageSignal({
            riskLevel: "low",
            safetyStateCandidate: "normal_support",
            riskCategories: [],
            subject: "hypothetical",
            intentSignal: "distress",
            recommendedAction: "continue_chat",
            confidence: "high",
            rationaleCode: "ambiguous_distress",
          }),
        }),
      },
    );

    expect(decision.allowNormalChat).toBe(true);
    expect(["high", "imminent"]).not.toContain(decision.risk.level);
  });

  it("does not over-escalate low-confidence ambiguous AI triage", async () => {
    const decision = await evaluateSafety(
      {
        message: "I wish I could disappear.",
      },
      {
        aiTriageClassifier: vi.fn().mockResolvedValue({
          available: true,
          signal: buildTriageSignal({
            riskLevel: "high",
            safetyStateCandidate: "passive_suicidal_ideation",
            riskCategories: ["self_harm"],
            intentSignal: "passive_ideation",
            recommendedAction: "show_resources",
            confidence: "low",
            rationaleCode: "passive_life_worth_signal",
          }),
        }),
      },
    );

    expect(decision.allowNormalChat).toBe(true);
    expect(decision.aiTriage).toMatchObject({ escalated: false });
  });

  it("allows low-confidence imminent medical emergency escalation", async () => {
    const decision = await evaluateSafety(
      {
        message: "Something feels physically wrong.",
      },
      {
        aiTriageClassifier: vi.fn().mockResolvedValue({
          available: true,
          signal: buildTriageSignal({
            riskLevel: "imminent",
            safetyStateCandidate: "medical_emergency",
            riskCategories: ["medical_emergency"],
            intentSignal: "medical_emergency",
            recommendedAction: "urgent_support",
            confidence: "low",
            rationaleCode: "medical_emergency",
          }),
        }),
      },
    );

    expect(decision.safetyState).toBe("medical_emergency");
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

function buildTriageSignal(
  overrides: Partial<{
    riskLevel: "none" | "low" | "medium" | "high" | "imminent";
    safetyStateCandidate:
      | "normal_support"
      | "elevated_distress"
      | "passive_suicidal_ideation"
      | "active_suicidal_ideation"
      | "imminent_risk"
      | "self_harm_method_request"
      | "medical_emergency"
      | "harm_to_others"
      | "abuse_or_coercion"
      | "policy_boundary";
    riskCategories: Array<
      | "self_harm"
      | "harm_to_others"
      | "abuse"
      | "psychosis_or_mania_signal"
      | "substance_use"
      | "minor_safety"
      | "medical_emergency"
    >;
    policyCategories: Array<
      | "diagnosis_request"
      | "medication_request"
      | "treatment_protocol_request"
      | "medical_advice_request"
      | "therapy_replacement_request"
      | "self_harm_method_request"
      | "prompt_injection"
      | "dependency_request"
      | "out_of_scope"
    >;
    subject: "self" | "other_person" | "hypothetical" | "quoted" | "unclear";
    temporalUrgency:
      | "none"
      | "past"
      | "ongoing"
      | "soon"
      | "now"
      | "tonight"
      | "unclear";
    intentSignal:
      | "none"
      | "distress"
      | "passive_ideation"
      | "active_ideation"
      | "method_request"
      | "intent_with_means"
      | "medical_emergency"
      | "harm_to_others"
      | "abuse_or_coercion";
    recommendedAction:
      | "continue_chat"
      | "continue_with_supportive_nudge"
      | "show_resources"
      | "urgent_support"
      | "answer_with_boundary";
    confidence: "low" | "medium" | "high";
    needsClarifyingSafetyQuestion: boolean;
    rationaleCode:
      | "no_safety_signal"
      | "ambiguous_distress"
      | "passive_life_worth_signal"
      | "direct_self_harm_intent"
      | "means_plan_timing"
      | "method_request"
      | "third_party_risk"
      | "medical_emergency"
      | "abuse_or_coercion"
      | "policy_boundary"
      | "unclear";
  }> = {},
) {
  return {
    schemaVersion: "triage.v1" as const,
    riskLevel: "low" as const,
    safetyStateCandidate: "normal_support" as const,
    riskCategories: [],
    policyCategories: [],
    subject: "self" as const,
    temporalUrgency: "ongoing" as const,
    intentSignal: "distress" as const,
    recommendedAction: "continue_chat" as const,
    confidence: "medium" as const,
    needsClarifyingSafetyQuestion: false,
    rationaleCode: "ambiguous_distress" as const,
    ...overrides,
  };
}
