import { findRiskRule } from "@/lib/safety/risk-rules";
import type { ApiRiskClassification } from "@/types/risk";

export function classifyRisk(message: string): ApiRiskClassification {
  const result = findRiskRule(message);
  const categories = [...result.categories];
  const includesMinorSafety = isMinorDisclosure(message);

  if (includesMinorSafety && !categories.includes("minor_safety")) {
    categories.push("minor_safety");
  }
  const resourceTopics = [...result.resourceTopics];

  if (includesMinorSafety && !resourceTopics.includes("minor_safety")) {
    resourceTopics.push("minor_safety");
  }

  const level =
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
    /\b(i am|i'm|im)\s+(1[0-7]|[0-9])\b/i,
    /\b(1[0-7]|[0-9])\s+(years old|yo|yrs old)\b/i,
    /\bunder\s*18\b/i,
  ].some((pattern) => pattern.test(message));
}
