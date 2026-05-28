import type { RiskCategory, RiskLevel, RiskSignalTag } from "@/types/risk";

export type RiskRuleResult = {
  level: RiskLevel;
  categories: RiskCategory[];
  reason: string;
  resourceTopics: string[];
  signalTags?: RiskSignalTag[];
};

type RiskRule = {
  level: RiskLevel;
  categories: RiskCategory[];
  reason: string;
  resourceTopics: string[];
  signalTags?: RiskSignalTag[];
  patterns: RegExp[];
};

const imminentRules: RiskRule[] = [
  {
    level: "imminent",
    categories: ["self_harm"],
    reason: "Message reports possible immediate self-harm danger for another person.",
    resourceTopics: ["self_harm", "crisis", "emergency"],
    signalTags: ["third_party_self_harm", "third_party_self_harm_imminent"],
    patterns: [
      /\b(friend|partner|boyfriend|girlfriend|brother|sister|parent|mother|father|roommate|classmate|coworker|someone i know)\b.*\b(has|have)\b.*\b(pills|medication|meds)\b.*\b(says|said|told me|tells me|will|is going to|are going to).*\b(take them|take it|do it)\b.*\b(tonight|now)\b/i,
      /\b(friend|partner|boyfriend|girlfriend|brother|sister|parent|mother|father|roommate|classmate|coworker|someone i know)\b.*\b(says|said|told me|tells me).*\b(he|she|they)\b.*\b(will|is going to|are going to)\b.*\b(kill himself|kill herself|kill themselves|end his life|end her life|end their life|take his life|take her life|take their life|do it)\b.*\b(tonight|now)\b/i,
      /\b(friend|partner|boyfriend|girlfriend|brother|sister|parent|mother|father|roommate|classmate|coworker|someone i know)\b.*\b(has|have)\b.*\b(a plan|plan)\b.*\b(alone|tonight|now)\b/i,
    ],
  },
  {
    level: "imminent",
    categories: ["self_harm"],
    reason: "Message suggests immediate self-harm danger or inability to stay safe alone.",
    resourceTopics: ["self_harm", "crisis", "emergency"],
    patterns: [
      /\b(i am|i'm|im)\s+going\s+to\s+(kill myself|end my life)\b/i,
      /\b(i might|i may|i will|i am about to|i'm about to)\s+hurt myself\s+now\b/i,
      /\b(i might|i may|i will|i am about to|i'm about to)\s+hurt myself\b.*\b(tonight|right now|now|alone|by myself)\b/i,
      /\bnot safe alone\b/i,
      /\bi do not feel safe (with|from) myself\b.*\b(tonight|right now|now|alone|by myself)\b/i,
      /\b(i am not sure|i do not know if|i do not know whether)\s+i can stay safe\b.*\b(tonight|right now|now|alone|by myself)\b/i,
      /\bi cannot stay safe\b.*\b(tonight|right now|now|alone|by myself)\b/i,
      /\bi (do not|cannot) trust myself\b.*\b(tonight|right now|now|alone|by myself)\b/i,
      /\btonight\b.*\b(end my life|kill myself|hurt myself)\b/i,
      /\b(end my life|kill myself|hurt myself)\b.*\btonight\b/i,
      /\bhave\b.*\b(pills|medication|meds)\b.*\b(i'm|i am|im)\s+going\s+to\s+take\s+them\s+tonight\b/i,
      /\b(i'm|i am|im)\s+going\s+to\s+take\s+them\s+tonight\b.*\bhave\b.*\b(pills|medication|meds)\b/i,
      /\bhave\b.*\b(pills|medication|meds)\b.*\b(take them|taking them)\s+tonight\b/i,
      /\btaking them tonight\b/i,
      /\bhave a plan\b.*\b(die|kill myself|hurt myself|self[-\s]?harm)\b/i,
      /\b(die|kill myself|hurt myself|self[-\s]?harm)\b.*\bhave a plan\b/i,
    ],
  },
  {
    level: "imminent",
    categories: ["harm_to_others"],
    reason: "Message suggests immediate danger toward another person.",
    resourceTopics: ["harm_to_others", "emergency"],
    patterns: [
      /\b(i am|i'm|im)\s+going\s+to\s+hurt\s+someone\b/i,
      /\b(i will|i'm going to|i am going to)\s+attack\b/i,
    ],
  },
];

const highRules: RiskRule[] = [
  {
    level: "high",
    categories: ["self_harm"],
    reason: "Message reports self-harm intent for another person.",
    resourceTopics: ["self_harm", "crisis", "support"],
    signalTags: ["third_party_self_harm"],
    patterns: [
      /\b(friend|partner|boyfriend|girlfriend|brother|sister|parent|mother|father|roommate|classmate|coworker|someone i know)\b.*\b(says|said|told me|tells me)?\s*(he|she|they)?\s*(wants|want|wanted)\s+to\s+(kill himself|kill herself|kill themselves|die(?! laughing)|end his life|end her life|end their life|take his life|take her life|take their life)\b/i,
      /\b(friend|partner|boyfriend|girlfriend|brother|sister|parent|mother|father|roommate|classmate|coworker|someone i know)\b.*\b(says|said|told me|tells me).*\b(he|she|they)\b.*\b(is|are)\s+going\s+to\s+(kill himself|kill herself|kill themselves|end his life|end her life|end their life|take his life|take her life|take their life)\b/i,
    ],
  },
  {
    level: "high",
    categories: ["self_harm"],
    reason: "Message suggests self-harm ideation without clear immediate timing.",
    resourceTopics: ["self_harm", "crisis", "support"],
    patterns: [
      /\bi want to die\b/i,
      /\bi feel suicidal\b/i,
      /\bsuicidal\b/i,
      /\bself[-\s]?harm\b/i,
      /\bcutting myself\b/i,
      /\b(can't|cant|cannot)\s+go\s+on\b/i,
      /\bi do not feel safe (with|from) myself\b/i,
      /\b(i am not sure|i do not know if|i do not know whether)\s+i can stay safe\b/i,
      /\bi cannot stay safe\b/i,
      /\bi (do not|cannot) trust myself\b/i,
      /\bi am afraid of what i might do to myself\b/i,
      /\beveryone would be better off without me\b/i,
    ],
  },
  {
    level: "high",
    categories: ["abuse"],
    reason: "Message suggests abuse or current danger from another person.",
    resourceTopics: ["abuse", "safety", "support"],
    patterns: [
      /\b(partner|spouse|family|parent)\b.*\b(hit|hurt|threatened|threatens)\b/i,
      /\b(hit|hurt|threatened|threatens)\b.*\b(partner|spouse|family|parent)\b/i,
      /\bscared to go home\b/i,
    ],
  },
];

const mediumRules: RiskRule[] = [
  {
    level: "medium",
    categories: ["minor_safety"],
    reason: "Message suggests the user may be under 18 and needs trusted adult support.",
    resourceTopics: ["minor_safety", "support"],
    patterns: [
      /\b(i am|i'm|im)\s+(1[0-7]|[0-9])\b/i,
      /\b(1[0-7]|[0-9])\s+(years old|yo|yrs old)\b/i,
      /\bunder\s*18\b/i,
    ],
  },
  {
    level: "medium",
    categories: ["psychosis_or_mania_signal"],
    reason: "Message suggests possible psychosis or mania signals that warrant real-world support.",
    resourceTopics: ["psychosis_or_mania_signal", "professional_support"],
    patterns: [
      /\b(secret messages|people are watching me|being followed)\b/i,
      /\bnot slept\b.*\b(days|three days|3 days)\b/i,
      /\bfeel unstoppable\b/i,
    ],
  },
  {
    level: "medium",
    categories: ["substance_use"],
    reason: "Message suggests substance use as a coping strategy.",
    resourceTopics: ["substance_use", "professional_support"],
    patterns: [
      /\b(using|drinking|taking)\b.*\bto cope\b/i,
      /\bsubstances?\b.*\bcope\b/i,
    ],
  },
  {
    level: "medium",
    categories: ["medical_emergency"],
    reason: "Message asks for medical or medication direction that MindBridge cannot provide.",
    resourceTopics: ["medical_emergency", "professional_support"],
    patterns: [
      /\bwhat medication should i take\b/i,
      /\btell me what medication\b/i,
      /\bmedication dosage\b/i,
      /\bwhat dose\b/i,
    ],
  },
  {
    level: "medium",
    categories: [],
    reason: "Message suggests significant distress or impaired functioning.",
    resourceTopics: ["support", "professional_support"],
    patterns: [
      /\bpanic attack/i,
      /\b(can't|cant|cannot)\s+function\b/i,
      /\bfeel trapped\b/i,
      /\b(i do not know if i can|i do not know whether i can)\s+keep doing this\b/i,
      /\bi cannot keep doing this( anymore)?\b/i,
      /\bi do not know how much longer i can keep going\b/i,
      /\bi cannot keep going like this\b/i,
    ],
  },
];

const lowRules: RiskRule[] = [
  {
    level: "low",
    categories: [],
    reason: "Message suggests non-urgent stress, overwhelm, or exhaustion.",
    resourceTopics: ["stress", "support"],
    patterns: [
      /\boverwhelmed\b/i,
      /\bexhausted\b/i,
      /\bdrained\b/i,
      /\banxious\b/i,
      /\bstressed\b/i,
      /\bsleep\b/i,
    ],
  },
];

export function findRiskRule(message: string): RiskRuleResult {
  for (const ruleGroup of [imminentRules, highRules, mediumRules, lowRules]) {
    const match = ruleGroup.find((rule) =>
      rule.patterns.some((pattern) => pattern.test(message)),
    );

    if (match) {
      return {
        level: match.level,
        categories: match.categories,
        reason: match.reason,
        resourceTopics: match.resourceTopics,
        signalTags: match.signalTags,
      };
    }
  }

  return {
    level: "none",
    categories: [],
    reason: "No deterministic safety rule matched.",
    resourceTopics: [],
    signalTags: [],
  };
}
