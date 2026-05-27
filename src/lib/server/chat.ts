import {
  generateConversationReply,
  type ConversationAgentInput,
  type ConversationAgentResult,
} from "@/lib/ai/conversation-agent";
import { validateAssistantResponse } from "@/lib/ai/post-response-validator";
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
  source: "openai" | "fallback" | "safety";
};

type ChatResponseDependencies = {
  conversationAgent?: (
    input: ConversationAgentInput,
  ) => Promise<ConversationAgentResult>;
};

export async function createChatResponse(
  request: ChatRequest,
  dependencies: ChatResponseDependencies = {},
): Promise<ChatResponse> {
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
  const agent = dependencies.conversationAgent ?? generateConversationReply;
  const agentResult = safetyRoute.safety?.disableNormalNextStep
    ? {
        content: safetyRoute.safety.message,
        source: "safety" as const,
      }
    : await agent({
        message: request.message,
        risk,
      });
  const validation = validateAssistantResponse(agentResult.content);
  const content = validation.content;
  const source = validation.blocked ? "fallback" : agentResult.source;

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
    source,
  };
}

export function createMockChatResponse(
  request: ChatRequest,
  dependencies: ChatResponseDependencies = {},
) {
  return createChatResponse(request, dependencies);
}
