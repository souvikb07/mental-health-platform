import { findCriticalRiskRule } from "@/lib/safety/critical-risk-rules";
import { normalizeRiskInput } from "@/lib/safety/normalize-risk-input";
import { aggregateRiskResults } from "@/lib/safety/risk-aggregator";
import { findRiskRule } from "@/lib/safety/risk-rules";
import type { ApiRiskClassification, RiskLevel } from "@/types/risk";

export function classifyRisk(message: string): ApiRiskClassification {
  const normalizedMessage = normalizeRiskInput(message);
  const result = aggregateRiskResults([
    findCriticalRiskRule(normalizedMessage),
    findRiskRule(normalizedMessage),
  ]);
  const categories = [...result.categories];
  const includesMinorSafety = isMinorDisclosure(normalizedMessage);

  if (includesMinorSafety && !categories.includes("minor_safety")) {
    categories.push("minor_safety");
  }
  const resourceTopics = [...result.resourceTopics];

  if (includesMinorSafety && !resourceTopics.includes("minor_safety")) {
    resourceTopics.push("minor_safety");
  }

  const level: RiskLevel =
    includesMinorSafety && ["none", "low"].includes(result.level)
      ? "medium"
      : result.level;

  return {
    level,
    categories,
    requiresCrisisResponse: ["high", "imminent"].includes(level),
    reason: result.reason,
    resourceTopics,
  };
}

function isMinorDisclosure(message: string) {
  return [
    /\bi am\s+(1[0-7]|[0-9])\b/,
    /\b(1[0-7]|[0-9])\s+(years old|yo|yrs old)\b/,
    /\bunder\s*18\b/,
  ].some((pattern) => pattern.test(message));
}
