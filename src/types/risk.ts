export type RiskLevel = "none" | "low" | "medium" | "high" | "imminent";

export type RiskCategory =
  | "self_harm"
  | "harm_to_others"
  | "abuse"
  | "psychosis_or_mania_signal"
  | "substance_use"
  | "minor_safety"
  | "medical_emergency";

export type RiskSignalTag =
  | "third_party_self_harm"
  | "third_party_self_harm_imminent";

export type MockRiskClassification = {
  level: RiskLevel;
  categories: RiskCategory[];
  actionTaken: "continue_reflection" | "show_support_resources" | "urgent_support";
  note: string;
};

export type ApiRiskClassification = {
  level: RiskLevel;
  categories: RiskCategory[];
  requiresCrisisResponse: boolean;
  reason?: string;
  resourceTopics?: string[];
  signalTags?: RiskSignalTag[];
};

export type ApiChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
};

export type NextRecommendedAction =
  | "continue_chat"
  | "continue_with_supportive_nudge"
  | "show_resources"
  | "urgent_support";

export type SafetyMode = "normal" | "support" | "crisis";

export type SafetyUi = {
  showInlineSafetyCard: boolean;
  disableNormalNextStep: boolean;
  title: string;
  message: string;
  tone: "support" | "urgent";
};
