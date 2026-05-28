import type { RiskRuleResult } from "@/lib/safety/risk-rules";
import type { RiskLevel } from "@/types/risk";

const severity: Record<RiskLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  imminent: 4,
};

export function aggregateRiskResults(results: RiskRuleResult[]): RiskRuleResult {
  const highest = [...results].sort(
    (first, second) => severity[second.level] - severity[first.level],
  )[0];

  if (!highest) {
    return {
      level: "none",
      categories: [],
      reason: "No deterministic risk result provided.",
      resourceTopics: [],
      signalTags: [],
    };
  }

  return {
    ...highest,
    categories: [...new Set(results.flatMap((result) => result.categories))],
    resourceTopics: [
      ...new Set(results.flatMap((result) => result.resourceTopics)),
    ],
    signalTags: [
      ...new Set(results.flatMap((result) => result.signalTags ?? [])),
    ],
  };
}
