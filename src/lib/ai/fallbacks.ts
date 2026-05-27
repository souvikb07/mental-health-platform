import type { ApiRiskClassification } from "@/types/risk";

export const safeFallbackResponse =
  "I want to keep this reflective and non-diagnostic. A professional may be able to help you explore this. What feels most important to understand about what changed recently?";

export function getFallbackConversationReply({
  message,
  risk,
}: {
  message: string;
  risk: ApiRiskClassification;
}) {
  const normalized = message.toLowerCase();

  if (risk.level === "medium" && risk.categories.includes("medical_emergency")) {
    return "I cannot give medication or medical advice. A qualified medical professional can help you explore safe options for what you are experiencing.";
  }

  if (
    risk.level === "medium" &&
    risk.categories.includes("psychosis_or_mania_signal")
  ) {
    return "That sounds important to talk through with real-world support. A trusted person or qualified professional may be able to help you explore what is happening without having to handle it alone.";
  }

  if (risk.level === "medium" && isAmbiguousEnduranceDistress(normalized)) {
    return "That sounds really heavy. When you say you do not know if you can keep doing this, do you mean the situation feels unsustainable, or are you feeling unsafe right now?";
  }

  if (normalized.includes("exhausted")) {
    return "That sounds heavy. When you say exhausted, do you mean physically tired, emotionally drained, mentally overloaded, or a mix?";
  }

  if (normalized.includes("overwhelmed")) {
    return "Feeling overwhelmed can blur the next step. What feels most overloaded right now: responsibilities, emotions, decisions, your body, or something else?";
  }

  if (normalized.includes("sleep")) {
    return "Sleep changes can make everything harder to read. When did you first notice the shift, and what usually happens in the hour before bed?";
  }

  return "Thank you for sharing that. What part of this has been affecting your day-to-day life the most?";
}

function isAmbiguousEnduranceDistress(message: string) {
  const normalized = message
    .replace(/[‘’]/g, "'")
    .replace(/\bdon't\b/g, "do not")
    .replace(/\bcan't\b/g, "cannot")
    .replace(/\bcant\b/g, "cannot")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return [
    /\b(i do not know if i can|i do not know whether i can)\s+keep doing this\b/,
    /\bi cannot keep doing this( anymore)?\b/,
    /\bi do not know how much longer i can keep going\b/,
    /\bi cannot keep going like this\b/,
  ].some((pattern) => pattern.test(normalized));
}
