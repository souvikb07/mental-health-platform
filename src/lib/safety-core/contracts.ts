import type { PolicyBoundaryResult } from "@/types/policy-boundary";
import type {
  ApiRiskClassification,
  NextRecommendedAction,
  SafetyMode,
  SafetyUi,
} from "@/types/risk";
import type { SupportResource } from "@/types/resource";
import type { SessionContext } from "@/types/session-context";

export type SafetyState =
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

export type SafetyResponseType =
  | "normal_chat"
  | "supportive_nudge"
  | "safety"
  | "urgent_safety"
  | "boundary";

export type SafetyPlaybook = {
  state: SafetyState;
  severity: ApiRiskClassification["level"];
  nextRecommendedAction: NextRecommendedAction;
  responseType: SafetyResponseType;
  allowNormalChat: boolean;
  allowClarityMap: boolean;
  showSafetyCard: boolean;
  showResources: boolean;
  resourceTopics: string[];
  mode: SafetyMode;
};

export type SafetyEvaluationInput = {
  message: string;
  sessionContext?: SessionContext;
  previousState?: SafetyState;
};

export type SafetyDecision = {
  risk: ApiRiskClassification;
  safetyState: SafetyState;
  playbook: SafetyPlaybook;
  allowNormalChat: boolean;
  allowClarityMap: boolean;
  nextRecommendedAction: NextRecommendedAction;
  mode: SafetyMode;
  safety: SafetyUi | null;
  resources: SupportResource[];
  responseContent: string | null;
  responseSource: "safety" | "boundary" | null;
  policyBoundary?: PolicyBoundaryResult;
};
