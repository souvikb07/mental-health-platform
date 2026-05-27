import {
  generateConversationReply,
  type ConversationAgentInput,
  type ConversationAgentResult,
} from "@/lib/ai/conversation-agent";
import { validateAssistantResponse } from "@/lib/ai/post-response-validator";
import { selectResources } from "@/lib/resources/select-resources";
import { classifyPolicyBoundary } from "@/lib/safety/policy-boundary-classifier";
import { getPolicyBoundaryResponse } from "@/lib/safety/policy-boundary-copy";
import { classifyRisk } from "@/lib/safety/risk-classifier";
import { routeSafety } from "@/lib/safety/safety-router";
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
  const countryCode = request.sessionContext?.countryCode ?? "GLOBAL";
  const policyBoundary = safetyRoute.safety?.disableNormalNextStep
    ? undefined
    : classifyPolicyBoundary(request.message);
  const policySafety = getPolicySafety(policyBoundary);
  const shouldShowResources =
    safetyRoute.shouldShowResources ||
    policyBoundary?.action === "route_to_safety";
  const resources = shouldShowResources
    ? selectResources({
        countryCode,
        riskLevel:
          policyBoundary?.action === "route_to_safety"
            ? "imminent"
            : risk.level,
        categories:
          policyBoundary?.action === "route_to_safety"
            ? ["self_harm"]
            : risk.categories,
        topic:
          policyBoundary?.action === "route_to_safety"
            ? "self_harm"
            : risk.resourceTopics?.[0],
      })
    : [];
  const agent = dependencies.conversationAgent ?? generateConversationReply;
  const agentResult = getAgentResult({
    message: request.message,
    risk,
    safetyMessage: safetyRoute.safety?.disableNormalNextStep
      ? safetyRoute.safety.message
      : null,
    policyBoundary,
    agent,
  });
  const resolvedAgentResult =
    agentResult instanceof Promise ? await agentResult : agentResult;
  const validation = validateAssistantResponse(resolvedAgentResult.content);
  const content = validation.content;
  const source = validation.blocked ? "fallback" : resolvedAgentResult.source;

  return {
    assistantMessage: {
      id: `mock_assistant_${Date.now()}`,
      role: "assistant",
      content,
      createdAt: new Date().toISOString(),
    },
    risk,
    nextRecommendedAction:
      policyBoundary?.action === "route_to_safety"
        ? "urgent_support"
        : safetyRoute.nextRecommendedAction,
    mode:
      policyBoundary?.action === "route_to_safety" ? "crisis" : safetyRoute.mode,
    safety: safetyRoute.safety ?? policySafety,
    resources,
    source,
    policyBoundary,
  };
}

function getPolicySafety(policyBoundary: PolicyBoundaryResult | undefined) {
  if (policyBoundary?.action !== "route_to_safety") {
    return null;
  }

  return {
    showInlineSafetyCard: true,
    disableNormalNextStep: true,
    title: "Immediate support",
    message: getPolicyBoundaryResponse(policyBoundary),
    tone: "urgent" as const,
  };
}

function getAgentResult({
  message,
  risk,
  safetyMessage,
  policyBoundary,
  agent,
}: {
  message: string;
  risk: ApiRiskClassification;
  safetyMessage: string | null;
  policyBoundary: PolicyBoundaryResult | undefined;
  agent: (input: ConversationAgentInput) => Promise<ConversationAgentResult>;
}) {
  if (safetyMessage) {
    return {
      content: safetyMessage,
      source: "safety" as const,
    };
  }

  if (policyBoundary?.action === "route_to_safety") {
    return {
      content: getPolicyBoundaryResponse(policyBoundary),
      source: "boundary" as const,
    };
  }

  if (policyBoundary?.action === "answer_with_boundary") {
    return {
      content: getPolicyBoundaryResponse(policyBoundary),
      source: "boundary" as const,
    };
  }

  return agent({
    message,
    risk,
  });
}

export function createMockChatResponse(
  request: ChatRequest,
  dependencies: ChatResponseDependencies = {},
) {
  return createChatResponse(request, dependencies);
}
