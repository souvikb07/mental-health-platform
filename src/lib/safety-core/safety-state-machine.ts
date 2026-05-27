import type { SafetyState } from "@/lib/safety-core/contracts";
import type { PolicyBoundaryResult } from "@/types/policy-boundary";
import type { ApiRiskClassification } from "@/types/risk";

export type SafetyStateInput = {
  risk: ApiRiskClassification;
  policyBoundary?: PolicyBoundaryResult;
  previousState?: SafetyState;
};

const preservingStates = new Set<SafetyState>([
  "passive_suicidal_ideation",
  "active_suicidal_ideation",
  "imminent_risk",
  "self_harm_method_request",
  "medical_emergency",
  "harm_to_others",
  "abuse_or_coercion",
]);

export function determineSafetyState({
  risk,
  policyBoundary,
  previousState,
}: SafetyStateInput): SafetyState {
  const currentState = determineCurrentSafetyState({ risk, policyBoundary });

  if (
    previousState &&
    preservingStates.has(previousState) &&
    isLowerSeverity(currentState, previousState)
  ) {
    return previousState;
  }

  return currentState;
}

function determineCurrentSafetyState({
  risk,
  policyBoundary,
}: Omit<SafetyStateInput, "previousState">): SafetyState {
  if (policyBoundary?.categories.includes("self_harm_method_request")) {
    return "self_harm_method_request";
  }

  if (risk.categories.includes("harm_to_others") && isHighOrImminent(risk)) {
    return "harm_to_others";
  }

  if (risk.categories.includes("medical_emergency") && isHighOrImminent(risk)) {
    return "medical_emergency";
  }

  if (risk.categories.includes("abuse") && isHighOrImminent(risk)) {
    return "abuse_or_coercion";
  }

  if (risk.level === "imminent") {
    return "imminent_risk";
  }

  if (risk.level === "high" && risk.categories.includes("self_harm")) {
    return risk.reason?.toLowerCase().includes("passive")
      ? "passive_suicidal_ideation"
      : "active_suicidal_ideation";
  }

  if (policyBoundary?.action === "answer_with_boundary") {
    return "policy_boundary";
  }

  if (policyBoundary?.action === "route_to_safety") {
    return "self_harm_method_request";
  }

  if (risk.categories.includes("harm_to_others")) {
    return "harm_to_others";
  }

  if (risk.categories.includes("medical_emergency")) {
    return "medical_emergency";
  }

  if (risk.categories.includes("abuse")) {
    return "abuse_or_coercion";
  }

  if (risk.level === "medium") {
    return "elevated_distress";
  }

  return "normal_support";
}

function isHighOrImminent(risk: ApiRiskClassification) {
  return risk.level === "high" || risk.level === "imminent";
}

function isLowerSeverity(currentState: SafetyState, previousState: SafetyState) {
  return stateSeverity[currentState] < stateSeverity[previousState];
}

const stateSeverity: Record<SafetyState, number> = {
  normal_support: 0,
  elevated_distress: 1,
  policy_boundary: 2,
  passive_suicidal_ideation: 3,
  active_suicidal_ideation: 4,
  abuse_or_coercion: 4,
  medical_emergency: 5,
  harm_to_others: 5,
  self_harm_method_request: 5,
  imminent_risk: 5,
};
