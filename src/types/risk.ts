export type RiskLevel = "none" | "low" | "medium" | "high" | "imminent";

export type RiskCategory =
  | "self_harm"
  | "harm_to_others"
  | "abuse_or_domestic_violence"
  | "psychosis_or_mania_signal"
  | "substance_use"
  | "minor_safety"
  | "medical_emergency"
  | "eating_disorder_signal"
  | "none";

export type MockRiskClassification = {
  level: RiskLevel;
  categories: RiskCategory[];
  actionTaken: "continue_reflection" | "show_support_resources" | "urgent_support";
  note: string;
};
