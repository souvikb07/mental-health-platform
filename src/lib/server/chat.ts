import { selectResources } from "@/lib/resources/select-resources";
import { classifyRisk } from "@/lib/safety/risk-classifier";
import { routeSafety } from "@/lib/safety/safety-router";
import type { ChatRequest } from "@/lib/validation/chat";
import type {
  ApiChatMessage,
  ApiRiskClassification,
  NextRecommendedAction,
  SafetyMode,
  SafetyUi,
} from "@/types/risk";
import type { SupportResource } from "@/types/resource";

export type ChatResponse = {
  assistantMessage: ApiChatMessage;
  risk: ApiRiskClassification;
  nextRecommendedAction: NextRecommendedAction;
  mode: SafetyMode;
  safety: SafetyUi | null;
  resources: SupportResource[];
};

export function createMockChatResponse(request: ChatRequest): ChatResponse {
  const risk = classifyRisk(request.message);
  const safetyRoute = routeSafety(risk);
  const resources = safetyRoute.shouldShowResources
    ? selectResources({
        country: "India",
        riskLevel: risk.level,
        categories: risk.categories,
        topic: risk.resourceTopics?.[0],
      })
    : [];
  const content =
    safetyRoute.safety?.disableNormalNextStep && safetyRoute.safety.message
      ? safetyRoute.safety.message
      : getMockAssistantContent(request.message, risk);

  return {
    assistantMessage: {
      id: `mock_assistant_${Date.now()}`,
      role: "assistant",
      content,
      createdAt: new Date().toISOString(),
    },
    risk,
    nextRecommendedAction: safetyRoute.nextRecommendedAction,
    mode: safetyRoute.mode,
    safety: safetyRoute.safety,
    resources,
  };
}

function getMockAssistantContent(
  message: string,
  risk: ApiRiskClassification,
): string {
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
