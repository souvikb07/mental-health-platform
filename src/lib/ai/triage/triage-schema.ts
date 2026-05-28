import type { PolicyBoundaryCategory } from "@/types/policy-boundary";
import type { RiskCategory, RiskLevel } from "@/types/risk";
import type { SafetyState } from "@/lib/safety-core";

export const triageSchemaVersion = "triage.v1" as const;

export const triageRiskLevels = [
  "none",
  "low",
  "medium",
  "high",
  "imminent",
] as const satisfies readonly RiskLevel[];

export const triageSafetyStateCandidates = [
  "normal_support",
  "elevated_distress",
  "passive_suicidal_ideation",
  "active_suicidal_ideation",
  "imminent_risk",
  "self_harm_method_request",
  "medical_emergency",
  "harm_to_others",
  "abuse_or_coercion",
  "policy_boundary",
] as const satisfies readonly SafetyState[];

export const triageRiskCategories = [
  "self_harm",
  "harm_to_others",
  "abuse",
  "psychosis_or_mania_signal",
  "substance_use",
  "minor_safety",
  "medical_emergency",
] as const satisfies readonly RiskCategory[];

export const triagePolicyCategories = [
  "diagnosis_request",
  "medication_request",
  "treatment_protocol_request",
  "medical_advice_request",
  "therapy_replacement_request",
  "self_harm_method_request",
  "prompt_injection",
  "dependency_request",
  "out_of_scope",
] as const satisfies readonly PolicyBoundaryCategory[];

export const triageSubjects = [
  "self",
  "other_person",
  "hypothetical",
  "quoted",
  "unclear",
] as const;

export const triageTemporalUrgencies = [
  "none",
  "past",
  "ongoing",
  "soon",
  "now",
  "tonight",
  "unclear",
] as const;

export const triageIntentSignals = [
  "none",
  "distress",
  "passive_ideation",
  "active_ideation",
  "method_request",
  "intent_with_means",
  "medical_emergency",
  "harm_to_others",
  "abuse_or_coercion",
] as const;

export const triageRecommendedActions = [
  "continue_chat",
  "continue_with_supportive_nudge",
  "show_resources",
  "urgent_support",
  "answer_with_boundary",
] as const;

export const triageConfidences = ["low", "medium", "high"] as const;

export const triageRationaleCodes = [
  "no_safety_signal",
  "ambiguous_distress",
  "passive_life_worth_signal",
  "direct_self_harm_intent",
  "means_plan_timing",
  "method_request",
  "third_party_risk",
  "medical_emergency",
  "abuse_or_coercion",
  "policy_boundary",
  "unclear",
] as const;

export type TriageSubject = (typeof triageSubjects)[number];
export type TriageSafetyStateCandidate =
  (typeof triageSafetyStateCandidates)[number];
export type TriageTemporalUrgency = (typeof triageTemporalUrgencies)[number];
export type TriageIntentSignal = (typeof triageIntentSignals)[number];
export type TriageRecommendedAction =
  (typeof triageRecommendedActions)[number];
export type TriageConfidence = (typeof triageConfidences)[number];
export type TriageRationaleCode = (typeof triageRationaleCodes)[number];

export type TriageSignal = {
  schemaVersion: typeof triageSchemaVersion;
  riskLevel: RiskLevel;
  safetyStateCandidate: TriageSafetyStateCandidate;
  riskCategories: RiskCategory[];
  policyCategories: PolicyBoundaryCategory[];
  subject: TriageSubject;
  temporalUrgency: TriageTemporalUrgency;
  intentSignal: TriageIntentSignal;
  recommendedAction: TriageRecommendedAction;
  confidence: TriageConfidence;
  needsClarifyingSafetyQuestion: boolean;
  rationaleCode: TriageRationaleCode;
};

export const triageJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "riskLevel",
    "safetyStateCandidate",
    "riskCategories",
    "policyCategories",
    "subject",
    "temporalUrgency",
    "intentSignal",
    "recommendedAction",
    "confidence",
    "needsClarifyingSafetyQuestion",
    "rationaleCode",
  ],
  properties: {
    schemaVersion: { const: triageSchemaVersion },
    riskLevel: { enum: triageRiskLevels },
    safetyStateCandidate: { enum: triageSafetyStateCandidates },
    riskCategories: {
      type: "array",
      items: { enum: triageRiskCategories },
    },
    policyCategories: {
      type: "array",
      items: { enum: triagePolicyCategories },
    },
    subject: { enum: triageSubjects },
    temporalUrgency: { enum: triageTemporalUrgencies },
    intentSignal: { enum: triageIntentSignals },
    recommendedAction: { enum: triageRecommendedActions },
    confidence: { enum: triageConfidences },
    needsClarifyingSafetyQuestion: { type: "boolean" },
    rationaleCode: { enum: triageRationaleCodes },
  },
} as const;

export function parseTriageSignal(payload: unknown): TriageSignal | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (!hasExactKeys(payload, triageRequiredKeys)) {
    return null;
  }

  if (payload.schemaVersion !== triageSchemaVersion) {
    return null;
  }

  if (
    !includesValue(triageRiskLevels, payload.riskLevel) ||
    !includesValue(
      triageSafetyStateCandidates,
      payload.safetyStateCandidate,
    ) ||
    !isEnumArray(payload.riskCategories, triageRiskCategories) ||
    !isEnumArray(payload.policyCategories, triagePolicyCategories) ||
    !includesValue(triageSubjects, payload.subject) ||
    !includesValue(triageTemporalUrgencies, payload.temporalUrgency) ||
    !includesValue(triageIntentSignals, payload.intentSignal) ||
    !includesValue(triageRecommendedActions, payload.recommendedAction) ||
    !includesValue(triageConfidences, payload.confidence) ||
    typeof payload.needsClarifyingSafetyQuestion !== "boolean" ||
    !includesValue(triageRationaleCodes, payload.rationaleCode)
  ) {
    return null;
  }

  return {
    schemaVersion: payload.schemaVersion,
    riskLevel: payload.riskLevel,
    safetyStateCandidate: payload.safetyStateCandidate,
    riskCategories: payload.riskCategories,
    policyCategories: payload.policyCategories,
    subject: payload.subject,
    temporalUrgency: payload.temporalUrgency,
    intentSignal: payload.intentSignal,
    recommendedAction: payload.recommendedAction,
    confidence: payload.confidence,
    needsClarifyingSafetyQuestion: payload.needsClarifyingSafetyQuestion,
    rationaleCode: payload.rationaleCode,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEnumArray<T extends readonly string[]>(
  value: unknown,
  options: T,
): value is T[number][] {
  return (
    Array.isArray(value) &&
    value.every((item) => includesValue(options, item))
  );
}

function includesValue<T extends readonly string[]>(
  options: T,
  value: unknown,
): value is T[number] {
  return typeof value === "string" && options.includes(value);
}

function hasExactKeys(
  payload: Record<string, unknown>,
  expectedKeys: readonly string[],
) {
  const keys = Object.keys(payload);

  return (
    keys.length === expectedKeys.length &&
    keys.every((key) => expectedKeys.includes(key))
  );
}

const triageRequiredKeys = [
  "schemaVersion",
  "riskLevel",
  "safetyStateCandidate",
  "riskCategories",
  "policyCategories",
  "subject",
  "temporalUrgency",
  "intentSignal",
  "recommendedAction",
  "confidence",
  "needsClarifyingSafetyQuestion",
  "rationaleCode",
] as const;
