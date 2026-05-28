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

export type HarmonyBand = "steady" | "mixed" | "strained" | "support_first";

export type HarmonySignalComponents = {
  emotionalLoad: number;
  triggerClarity: number;
  supportConnection: number;
  actionReadiness: number;
  safetyStability: number;
};

export type HarmonySignal = {
  label: string;
  score: number;
  band: HarmonyBand;
  explanation: string;
  components: HarmonySignalComponents;
};

export type ClarityEvidencePoint = {
  point: string;
  evidenceMessageIds: string[];
};

export type ClarityKeyInsight = {
  title: string;
  summary: string;
  evidence: ClarityEvidencePoint[];
};

export type BoundaryType =
  | "work_boundary"
  | "personal_boundary"
  | "relationship_boundary"
  | "digital_boundary"
  | "energy_boundary"
  | "emotional_boundary"
  | "unclear_boundary";

export type BoundaryFocus = {
  title: string;
  boundaryType: BoundaryType;
  insights: string[];
  smallExperiment: string;
};

export type ClarityAction = {
  action: string;
  whyThisHelps: string;
};

export type ClarityActionPlan = {
  next24Hours: ClarityAction[];
  next7Days: ClarityAction[];
};

export type ClaritySupportPath = {
  recommendation: string;
  suggestedResourceTopics: string[];
  professionalSupportNote?: string;
};

export type StructuredClarityMap = {
  schemaVersion: "clarity_map.v1";
  status:
    | "generated"
    | "insufficient_context"
    | "safety_blocked"
    | "boundary_blocked";
  disclaimer: string;
  harmonySignal: HarmonySignal;
  keyInsight: ClarityKeyInsight;
  boundaryFocus: BoundaryFocus;
  actionPlan: ClarityActionPlan;
  supportPath: ClaritySupportPath;
  confidence: "low" | "medium" | "high";
};
