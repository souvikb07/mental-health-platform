import type { RiskLevel } from "@/types/risk";

export type ResourceType =
  | "crisis"
  | "emergency"
  | "directory"
  | "professional"
  | "trusted-person"
  | "self-guided"
  | "planning";

export type SupportResource = {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  country: "IN" | "global";
  topics: string[];
  riskLevels: RiskLevel[];
  actionLabel: string;
  href: string;
  priority?: number;
  phone?: string;
  availabilityNote?: string;
};
