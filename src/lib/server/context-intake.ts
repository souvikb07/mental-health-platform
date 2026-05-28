import "server-only";

import {
  generateContextIntake,
  type ContextIntakeAgentResult,
} from "@/lib/ai/context-intake";
import { safetyOrchestrator } from "@/lib/safety-core";
import type { PolicyBoundaryResult } from "@/types/policy-boundary";
import type { ApiChatMessage, ApiRiskClassification, SafetyUi } from "@/types/risk";
import type { SupportResource } from "@/types/resource";
import type { SessionContext } from "@/types/session-context";

export type ContextIntakeResponse =
  | {
      type: "opener";
      assistantMessage: ApiChatMessage;
      contextIntake: ContextIntakeAgentResult["contextIntake"];
      source: "openai" | "fallback";
    }
  | {
      type: "safety";
      assistantMessage: ApiChatMessage;
      risk: ApiRiskClassification;
      safety: SafetyUi | null;
      resources: SupportResource[];
      source: "safety";
    }
  | {
      type: "boundary";
      assistantMessage: ApiChatMessage;
      policyBoundary: PolicyBoundaryResult;
      source: "boundary";
    };

type ContextIntakeDependencies = {
  contextIntakeAgent?: (
    sessionContext: SessionContext,
  ) => Promise<ContextIntakeAgentResult>;
};

export async function createContextIntakeResponse(
  sessionContext: SessionContext,
  dependencies: ContextIntakeDependencies = {},
): Promise<ContextIntakeResponse> {
  const optionalText = sessionContext.mainConcernText?.trim();

  if (optionalText) {
    const safetyDecision = await safetyOrchestrator.evaluate({
      message: optionalText,
      sessionContext,
    });

    if (!safetyDecision.allowNormalChat) {
      if (safetyDecision.responseSource === "boundary" && safetyDecision.policyBoundary) {
        return {
          type: "boundary",
          assistantMessage: createAssistantMessage(
            safetyDecision.responseContent ??
              "MindBridge cannot help with that request, but it can support safe reflection.",
          ),
          policyBoundary: safetyDecision.policyBoundary,
          source: "boundary",
        };
      }

      return {
        type: "safety",
        assistantMessage: createAssistantMessage(
          safetyDecision.responseContent ??
            "MindBridge cannot continue normal reflection from this context. Consider reaching out to a trusted person or qualified professional.",
        ),
        risk: safetyDecision.risk,
        safety: safetyDecision.safety,
        resources: safetyDecision.resources,
        source: "safety",
      };
    }
  }

  const agent = dependencies.contextIntakeAgent ?? generateContextIntake;
  const result = await agent(sessionContext);

  return {
    type: "opener",
    assistantMessage: createAssistantMessage(result.contextIntake.openingMessage),
    contextIntake: result.contextIntake,
    source: result.source,
  };
}

function createAssistantMessage(content: string): ApiChatMessage {
  return {
    id: `context_intake_${Date.now()}`,
    role: "assistant",
    content,
    createdAt: new Date().toISOString(),
  };
}
