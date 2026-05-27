import type { RiskLevel } from "@/types/risk";

export type ResourceType =
  | "crisis"
  | "professional"
  | "trusted-person"
  | "self-guided"
  | "planning";

export type SupportResource = {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  country: "US" | "global";
  topics: string[];
  riskLevels: RiskLevel[];
  actionLabel: string;
  href: string;
};
