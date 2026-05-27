import type { ChatRequest } from "@/lib/validation/chat";
import type {
  ApiChatMessage,
  ApiRiskClassification,
  NextRecommendedAction,
  RiskLevel,
} from "@/types/risk";

export type ChatResponse = {
  assistantMessage: ApiChatMessage;
  risk: ApiRiskClassification;
  nextRecommendedAction: NextRecommendedAction;
};

const imminentCopy =
  "I am really sorry you are dealing with this. I cannot help with anything that could hurt you. If you might act on this now, please contact emergency services immediately or go to the nearest emergency room. If you can, move closer to another person right now and tell them: \"I might not be safe alone.\"";

export function createMockChatResponse(request: ChatRequest): ChatResponse {
  const risk = classifyMockRisk(request.message);
  const content = getMockAssistantContent(request.message, risk);

  return {
    assistantMessage: {
      id: `mock_assistant_${Date.now()}`,
      role: "assistant",
      content,
      createdAt: new Date().toISOString(),
    },
    risk,
    nextRecommendedAction: getNextAction(risk.level),
  };
}

function classifyMockRisk(message: string): ApiRiskClassification {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("kill myself") ||
    normalized.includes("end my life") ||
    normalized.includes("hurt myself now") ||
    normalized.includes("not safe alone")
  ) {
    return {
      level: "imminent",
      categories: ["self_harm"],
      requiresCrisisResponse: true,
    };
  }

  if (
    normalized.includes("self harm") ||
    normalized.includes("suicidal") ||
    normalized.includes("can't go on") ||
    normalized.includes("cant go on")
  ) {
    return {
      level: "high",
      categories: ["self_harm"],
      requiresCrisisResponse: true,
    };
  }

  if (
    normalized.includes("panic") ||
    normalized.includes("overwhelmed") ||
    normalized.includes("exhausted") ||
    normalized.includes("drained")
  ) {
    return {
      level: "low",
      categories: [],
      requiresCrisisResponse: false,
    };
  }

  return {
    level: "low",
    categories: [],
    requiresCrisisResponse: false,
  };
}

function getMockAssistantContent(
  message: string,
  risk: ApiRiskClassification,
): string {
  if (risk.level === "imminent") {
    return imminentCopy;
  }

  if (risk.level === "high") {
    return "I am really sorry this feels so heavy. I cannot provide crisis care, but you deserve support right now. Please consider contacting a crisis helpline, emergency services, or a trusted person who can stay with you.";
  }

  const normalized = message.toLowerCase();

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

function getNextAction(level: RiskLevel): NextRecommendedAction {
  if (level === "imminent") {
    return "urgent_support";
  }

  if (level === "high") {
    return "show_resources";
  }

  return "continue_chat";
}
