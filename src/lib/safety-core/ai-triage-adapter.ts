import type { TriageSignal } from "@/lib/ai/triage";
import type { SafetyState } from "@/lib/safety-core/contracts";
import type { PolicyBoundaryResult } from "@/types/policy-boundary";
import type { ApiRiskClassification, RiskLevel } from "@/types/risk";

export type AiTriageCandidate = {
  risk: ApiRiskClassification;
  safetyState: SafetyState;
  policyBoundary?: PolicyBoundaryResult;
  confidence: TriageSignal["confidence"];
  rationaleCode: TriageSignal["rationaleCode"];
  subject: TriageSignal["subject"];
  temporalUrgency: TriageSignal["temporalUrgency"];
};

export function adaptTriageSignal(signal: TriageSignal): AiTriageCandidate {
  const safetyState = getAdaptedSafetyState(signal);

  return {
    risk: {
      level: signal.riskLevel,
      categories: signal.riskCategories,
      requiresCrisisResponse: ["high", "imminent"].includes(signal.riskLevel),
      reason: `AI triage signal: ${signal.rationaleCode}`,
      resourceTopics: signal.riskCategories,
    },
    safetyState,
    policyBoundary: getPolicyBoundary(signal),
    confidence: signal.confidence,
    rationaleCode: signal.rationaleCode,
    subject: signal.subject,
    temporalUrgency: signal.temporalUrgency,
  };
}

export function shouldUseTriageCandidate({
  deterministicRisk,
  deterministicState,
  candidate,
}: {
  deterministicRisk: ApiRiskClassification;
  deterministicState: SafetyState;
  candidate: AiTriageCandidate;
}) {
  if (candidate.confidence === "low") {
    return (
      candidate.risk.level === "imminent" &&
      ["means_plan_timing", "medical_emergency"].includes(candidate.rationaleCode)
    );
  }

  if (
    ["hypothetical", "quoted"].includes(candidate.subject) &&
    candidate.confidence !== "high" &&
    ["high", "imminent"].includes(candidate.risk.level)
  ) {
    return false;
  }

  if (candidate.safetyState === "policy_boundary") {
    return true;
  }

  return (
    getRiskSeverity(candidate.risk.level) >
      getRiskSeverity(deterministicRisk.level) ||
    getStateSeverity(candidate.safetyState) > getStateSeverity(deterministicState)
  );
}

export function mergeTriageCandidate({
  deterministicRisk,
  deterministicState,
  deterministicPolicyBoundary,
  candidate,
}: {
  deterministicRisk: ApiRiskClassification;
  deterministicState: SafetyState;
  deterministicPolicyBoundary?: PolicyBoundaryResult;
  candidate: AiTriageCandidate;
}) {
  const useCandidate = shouldUseTriageCandidate({
    deterministicRisk,
    deterministicState,
    candidate,
  });

  if (!useCandidate) {
    return {
      risk: deterministicRisk,
      safetyState: deterministicState,
      policyBoundary: deterministicPolicyBoundary,
      escalated: false,
    };
  }

  return {
    risk:
      getRiskSeverity(candidate.risk.level) > getRiskSeverity(deterministicRisk.level)
        ? candidate.risk
        : deterministicRisk,
    safetyState:
      getStateSeverity(candidate.safetyState) > getStateSeverity(deterministicState)
        ? candidate.safetyState
        : deterministicState,
    policyBoundary: candidate.policyBoundary ?? deterministicPolicyBoundary,
    escalated: true,
  };
}

export function getRiskSeverity(level: RiskLevel) {
  return riskSeverity[level];
}

export function getStateSeverity(state: SafetyState) {
  return stateSeverity[state];
}

function getAdaptedSafetyState(signal: TriageSignal): SafetyState {
  if (
    signal.subject === "other_person" &&
    signal.riskCategories.includes("self_harm")
  ) {
    return "third_party_self_harm";
  }

  if (signal.policyCategories.includes("self_harm_method_request")) {
    return "self_harm_method_request";
  }

  if (
    signal.policyCategories.length > 0 ||
    signal.safetyStateCandidate === "policy_boundary"
  ) {
    return "policy_boundary";
  }

  return signal.safetyStateCandidate;
}

function getPolicyBoundary(signal: TriageSignal): PolicyBoundaryResult | undefined {
  if (signal.policyCategories.length === 0) {
    return undefined;
  }

  return {
    action: signal.policyCategories.includes("self_harm_method_request")
      ? "route_to_safety"
      : "answer_with_boundary",
    categories: signal.policyCategories,
    reason: `AI triage policy signal: ${signal.rationaleCode}`,
  };
}

const riskSeverity: Record<RiskLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  imminent: 4,
};

const stateSeverity: Record<SafetyState, number> = {
  normal_support: 0,
  elevated_distress: 1,
  policy_boundary: 2,
  passive_suicidal_ideation: 3,
  active_suicidal_ideation: 4,
  third_party_self_harm: 4,
  abuse_or_coercion: 4,
  medical_emergency: 5,
  harm_to_others: 5,
  self_harm_method_request: 5,
  imminent_risk: 5,
};
