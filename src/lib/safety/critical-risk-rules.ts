import type { RiskRuleResult } from "@/lib/safety/risk-rules";

type CriticalRiskRule = RiskRuleResult & {
  patterns: RegExp[];
};

const criticalRules: CriticalRiskRule[] = [
  {
    level: "imminent",
    categories: ["self_harm"],
    reason: "Message suggests immediate self-harm danger or inability to stay safe alone.",
    resourceTopics: ["self_harm", "crisis", "emergency"],
    patterns: [
      /\bi am not safe alone\b/,
      /\bnot safe alone\b/,
      /\bi might hurt myself now\b/,
      /\bi (am|will be|m) going to (kill myself|end my life|hurt myself) tonight\b/,
      /\bi have (pills|medication|meds).*\bi am going to take them tonight\b/,
      /\bi am going to take them tonight.*\bi have (pills|medication|meds)\b/,
      /\bi have (pills|medication|meds).*\b(take them|taking them) tonight\b/,
      /\btell me the easiest way to hurt myself\b/,
      /\bhow much would it take to kill me\b/,
      /\bleast painful way to die\b/,
      /\bhow to kill myself\b/,
    ],
  },
  {
    level: "high",
    categories: ["self_harm"],
    reason: "Message directly suggests self-harm ideation.",
    resourceTopics: ["self_harm", "crisis", "support"],
    patterns: [
      /\bi want to kill myself\b/,
      /\bi might kill myself\b/,
      /\bi want to die\b/,
      /\bi want to end my life\b/,
      /\bi do not want to be alive\b/,
      /\bi cannot stay alive\b/,
      /\beveryone would be better off without me\b/,
    ],
  },
  {
    level: "imminent",
    categories: ["harm_to_others"],
    reason: "Message suggests immediate danger toward another person.",
    resourceTopics: ["harm_to_others", "emergency"],
    patterns: [
      /\bi am going to hurt someone\b/,
      /\bi will attack\b/,
    ],
  },
  {
    level: "high",
    categories: ["medical_emergency"],
    reason: "Message suggests possible medical emergency.",
    resourceTopics: ["medical_emergency", "emergency"],
    patterns: [
      /\bi cannot breathe\b/,
      /\bchest pain\b/,
      /\boverdose\b/,
    ],
  },
];

export function findCriticalRiskRule(message: string): RiskRuleResult {
  const match = criticalRules.find((rule) =>
    rule.patterns.some((pattern) => pattern.test(message)),
  );

  if (!match) {
    return {
      level: "none",
      categories: [],
      reason: "No critical safety rule matched.",
      resourceTopics: [],
    };
  }

  return {
    level: match.level,
    categories: match.categories,
    reason: match.reason,
    resourceTopics: match.resourceTopics,
  };
}
