import {
  generateConversationReply,
  type ConversationAgentInput,
  type ConversationAgentResult,
} from "@/lib/ai/conversation-agent";
import { validateAssistantResponse } from "@/lib/ai/post-response-validator";
import { safetyOrchestrator, type SafetyState } from "@/lib/safety-core";
import type { ChatRequest } from "@/lib/validation/chat";
import type { PolicyBoundaryResult } from "@/types/policy-boundary";
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
  source: "openai" | "fallback" | "safety" | "boundary";
  policyBoundary?: PolicyBoundaryResult;
  safetyState?: SafetyState;
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
  const safetyDecision = safetyOrchestrator.evaluate({
    message: request.message,
    sessionContext: request.sessionContext,
  });

  if (!safetyDecision.allowNormalChat) {
    return {
      assistantMessage: createAssistantMessage(
        safetyDecision.responseContent ??
          "MindBridge cannot continue normal chat for this request. Consider reaching out to a trusted person or qualified professional.",
      ),
      risk: safetyDecision.risk,
      nextRecommendedAction: safetyDecision.nextRecommendedAction,
      mode: safetyDecision.mode,
      safety: safetyDecision.safety,
      resources: safetyDecision.resources,
      source: safetyDecision.responseSource ?? "safety",
      policyBoundary: safetyDecision.policyBoundary,
      safetyState: safetyDecision.safetyState,
    };
  }

  const agent = dependencies.conversationAgent ?? generateConversationReply;
  const agentResult = await agent({
    message: request.message,
    risk: safetyDecision.risk,
  });
  const validation = validateAssistantResponse(agentResult.content);
  const content = validation.content;
  const source = validation.blocked ? "fallback" : agentResult.source;

  return {
    assistantMessage: createAssistantMessage(content),
    risk: safetyDecision.risk,
    nextRecommendedAction: safetyDecision.nextRecommendedAction,
    mode: safetyDecision.mode,
    safety: safetyDecision.safety,
    resources: safetyDecision.resources,
    source,
    policyBoundary: safetyDecision.policyBoundary,
    safetyState: safetyDecision.safetyState,
  };
}

function createAssistantMessage(content: string): ApiChatMessage {
  return {
    id: `mock_assistant_${Date.now()}`,
    role: "assistant",
    content,
    createdAt: new Date().toISOString(),
  };
}

export function createMockChatResponse(
  request: ChatRequest,
  dependencies: ChatResponseDependencies = {},
) {
  return createChatResponse(request, dependencies);
}
