import { safeFallbackResponse } from "@/lib/ai/fallbacks";

export type PostResponseValidation = {
  content: string;
  blocked: boolean;
  reason?: string;
};

const prohibitedPatterns: Array<{ reason: string; pattern: RegExp }> = [
  {
    reason: "definitive_diagnosis",
    pattern: /\b(you have|you are|this is)\s+(depression|bipolar|ptsd|ocd|adhd|anxiety disorder)\b/i,
  },
  {
    reason: "medication_advice",
    pattern: /\b(you should|you need to|start|take|increase|decrease|stop)\s+[^.]{0,40}\b(medication|antidepressant|ssri|dose|dosage|mg)\b/i,
  },
  {
    reason: "treatment_protocol",
    pattern: /\b(treatment plan|treatment protocol|this treatment will fix|will cure you|will fix you)\b/i,
  },
  {
    reason: "unsafe_reassurance",
    pattern: /\b(you are definitely safe|nothing bad will happen|you will be fine for sure)\b/i,
  },
  {
    reason: "therapy_replacement",
    pattern: /\b(i am your therapist|this replaces therapy|you do not need professional care)\b/i,
  },
  {
    reason: "self_harm_method_detail",
    pattern: /\b(lethal dose|how to kill yourself|best way to hurt yourself|method to end your life)\b/i,
  },
];

export function validateAssistantResponse(content: string): PostResponseValidation {
  const trimmed = content.trim();

  if (!trimmed) {
    return {
      content: safeFallbackResponse,
      blocked: true,
      reason: "empty_response",
    };
  }

  const match = prohibitedPatterns.find(({ pattern }) => pattern.test(trimmed));

  if (match) {
    return {
      content: safeFallbackResponse,
      blocked: true,
      reason: match.reason,
    };
  }

  return {
    content: trimmed,
    blocked: false,
  };
}
