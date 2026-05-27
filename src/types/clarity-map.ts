import type { RiskLevel } from "@/types/risk";
import type { SupportResource } from "@/types/resource";

export type ClarityMapPattern = {
  title: string;
  description: string;
};

export type ClarityMap = {
  headline: string;
  riskLevel: RiskLevel;
  nonDiagnosisNotice: string;
  patterns: ClarityMapPattern[];
  focusAreas: string[];
  next24Hours: string[];
  next7Days: string[];
  suggestedSupportPath: string;
  resources: SupportResource[];
};
