import type {
  PolicyBoundaryCategory,
  PolicyBoundaryResult,
} from "@/types/policy-boundary";

type BoundaryRule = {
  category: PolicyBoundaryCategory;
  patterns: RegExp[];
};

const boundaryRules: BoundaryRule[] = [
  {
    category: "prompt_injection",
    patterns: [
      /\bignore (your|the) rules\b/i,
      /\bforget (the|your) safety policy\b/i,
      /\byou are now my doctor\b/i,
      /\bact as my doctor\b/i,
    ],
  },
  {
    category: "self_harm_method_request",
    patterns: [
      /\beasiest way to hurt myself\b/i,
      /\bhow much would it take to kill me\b/i,
      /\bleast painful way to die\b/i,
      /\bhow to kill myself\b/i,
      /\bmethod to end my life\b/i,
    ],
  },
  {
    category: "diagnosis_request",
    patterns: [
      /\bdiagnose me\b/i,
      /\bdo i have (depression|anxiety|bipolar|ptsd|ocd|adhd)\b/i,
      /\btell me if i have (depression|anxiety|bipolar|ptsd|ocd|adhd)\b/i,
      /\bwhat disorder do i have\b/i,
      /\bwhat diagnosis\b/i,
    ],
  },
  {
    category: "medication_request",
    patterns: [
      /\bwhat medication should i take\b/i,
      /\bshould i start (antidepressants|medication|meds)\b/i,
      /\bwhat dose should i take\b/i,
      /\bwhat dosage should i take\b/i,
    ],
  },
  {
    category: "treatment_protocol_request",
    patterns: [
      /\bgive me a treatment plan\b/i,
      /\btell me how to treat\b/i,
      /\bwhat therapy protocol should i follow\b/i,
      /\btreatment protocol\b/i,
    ],
  },
  {
    category: "therapy_replacement_request",
    patterns: [
      /\bcan you be my therapist\b/i,
      /\breplace therapy\b/i,
      /\bonly want to talk to you from now on\b/i,
      /\bbe my therapist\b/i,
    ],
  },
  {
    category: "dependency_request",
    patterns: [
      /\bi need you and no one else\b/i,
      /\bdon't let me talk to anyone else\b/i,
      /\bkeep me from needing people\b/i,
    ],
  },
  {
    category: "medical_advice_request",
    patterns: [
      /\bwhat medical advice\b/i,
      /\bshould i go off my medication\b/i,
      /\bshould i stop taking\b/i,
      /\bis this a medical emergency\b/i,
    ],
  },
  {
    category: "out_of_scope",
    patterns: [
      /\bwrite my homework\b/i,
      /\bhelp me cheat\b/i,
      /\bmake me money fast\b/i,
    ],
  },
];

export function classifyPolicyBoundary(message: string): PolicyBoundaryResult {
  const categories = boundaryRules
    .filter((rule) => rule.patterns.some((pattern) => pattern.test(message)))
    .map((rule) => rule.category);
  const uniqueCategories = [...new Set(categories)];

  if (uniqueCategories.includes("self_harm_method_request")) {
    return {
      action: "route_to_safety",
      categories: uniqueCategories,
      reason: "User requested unsafe self-harm method information.",
    };
  }

  if (uniqueCategories.length > 0) {
    return {
      action: "answer_with_boundary",
      categories: uniqueCategories,
      reason: "User request crosses a MindBridge product boundary.",
    };
  }

  return {
    action: "allow",
    categories: [],
  };
}
