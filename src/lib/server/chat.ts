import "server-only";

import { randomBytes, randomUUID } from "node:crypto";

import {
  generateConversationReply,
  type ConversationAgentInput,
  type ConversationAgentResult,
} from "@/lib/ai/conversation-agent";
import {
  validateAssistantResponse,
  type PostResponseValidation,
} from "@/lib/ai/post-response-validator";
import { getOpenAiModel } from "@/lib/ai/openai-client";
import {
  getOpenAiTriageModel,
  type AiTriageResult,
  type TriagePromptInput,
} from "@/lib/ai/triage";
import {
  claimChatTurn,
  completeChatTurn,
} from "@/lib/db/repositories/chat-turns";
import { findPersistedChatResponse } from "@/lib/db/repositories/messages";
import { recordAuthorizedAuditEvent } from "@/lib/db/repositories/event-metadata";
import {
  safetyOrchestrator,
  type SafetyDecision,
  type SafetyState,
} from "@/lib/safety-core";
import { sha256 } from "@/lib/server/crypto/sensitive-data";
import {
  chatTurnInProgress,
  chatTurnRetryUnavailable,
  dataBackendUnavailable,
} from "@/lib/server/http/api-errors";
import {
  encryptChatAssistantResponse,
  encryptChatUserMessage,
} from "@/lib/server/persistence/message-payloads";
import {
  buildAiTriageModelEvents,
  buildAuditEvent,
  buildEventBundle,
  buildModelEvent,
  buildSafetyEvent,
  getChatPostValidationOutcome,
} from "@/lib/server/persistence/event-payloads";
import { createAuthoritativeSessionContext } from "@/lib/server/session/authoritative-context";
import type { OwnedSession } from "@/lib/server/session/ownership";
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
  persistenceStatus?: "unavailable";
};

type ChatResponseDependencies = {
  conversationAgent?: (
    input: ConversationAgentInput,
  ) => Promise<ConversationAgentResult>;
  aiTriageClassifier?: (
    input: TriagePromptInput,
  ) => Promise<AiTriageResult>;
};

type ChatResponseOptions = {
  previousState?: SafetyState;
  onSafetyDecision?: (decision: SafetyDecision) => void;
  onConversationResult?: (
    result: ConversationAgentResult,
    validation: PostResponseValidation,
  ) => void;
};

export async function createChatResponse(
  request: ChatRequest,
  dependencies: ChatResponseDependencies = {},
  options: ChatResponseOptions = {},
): Promise<ChatResponse> {
  const safetyDecision = await safetyOrchestrator.evaluate(
    {
      message: request.message,
      sessionContext: request.sessionContext,
      previousState: options.previousState,
    },
    {
      aiTriageClassifier: dependencies.aiTriageClassifier,
    },
  );
  options.onSafetyDecision?.(safetyDecision);

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
  options.onConversationResult?.(agentResult, validation);
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

export async function createPersistedChatResponse(
  request: ChatRequest,
  owned: OwnedSession,
  dependencies: ChatResponseDependencies = {},
): Promise<ChatResponse> {
  const clientMessageId = request.clientMessageId ?? randomUUID();
  const leaseTokenHash = sha256(randomBytes(32).toString("base64url"));
  const claim = await claimChatTurn({
    ownerId: owned.owner.id,
    sessionId: owned.session.id,
    clientMessageId,
    leaseTokenHash,
  });

  if (claim.status === "in_progress") {
    throw chatTurnInProgress();
  }

  if (claim.status === "completed") {
    if (!claim.storageConsentAccepted) {
      throw chatTurnRetryUnavailable();
    }

    const retained = await findPersistedChatResponse(
      owned.session.id,
      clientMessageId,
    );
    await recordAuthorizedAuditEvent({
      ownerId: owned.owner.id,
      sessionId: owned.session.id,
      eventBundle: buildEventBundle({
        auditEvent: buildAuditEvent("api/chat", "replayed"),
      }),
    });

    return retained;
  }

  const authoritativeRequest: ChatRequest = {
    ...request,
    sessionContext: createAuthoritativeSessionContext(owned.session),
  };
  const userMessage = {
    id: clientMessageId,
    role: "user" as const,
    content: request.message,
    createdAt: new Date().toISOString(),
  };
  let safetyDecision: SafetyDecision | undefined;
  let conversationResult:
    | {
        result: ConversationAgentResult;
        validation: PostResponseValidation;
      }
    | undefined;
  const response = await createChatResponse(authoritativeRequest, dependencies, {
    previousState: claim.currentSafetyState ?? undefined,
    onSafetyDecision: (decision) => {
      safetyDecision = decision;
    },
    onConversationResult: (result, validation) => {
      conversationResult = { result, validation };
    },
  });

  try {
    await completeChatTurn({
      ownerId: owned.owner.id,
      sessionId: owned.session.id,
      clientMessageId,
      leaseTokenHash,
      userContentEncrypted: claim.storageConsentAccepted
        ? encryptChatUserMessage(userMessage)
        : null,
      assistantContentEncrypted: claim.storageConsentAccepted
        ? encryptChatAssistantResponse(response)
        : null,
      assistantSource: `chat_${response.source}`,
      riskLevel: response.risk.level,
      safetyState: response.safetyState ?? "normal_support",
      userCreatedAt: userMessage.createdAt,
      assistantCreatedAt: response.assistantMessage.createdAt,
      eventBundle: buildChatEventBundle(
        response,
        safetyDecision,
        conversationResult,
      ),
    });
  } catch {
    if (response.source === "safety" || response.source === "boundary") {
      return { ...response, persistenceStatus: "unavailable" };
    }

    throw dataBackendUnavailable();
  }

  return response;
}

function buildChatEventBundle(
  response: ChatResponse,
  safetyDecision: SafetyDecision | undefined,
  conversationResult:
    | {
        result: ConversationAgentResult;
        validation: PostResponseValidation;
      }
    | undefined,
) {
  const safetyDecisions = safetyDecision ? [safetyDecision] : [];
  const modelEvents = conversationResult
    ? [
        buildModelEvent({
          taskCode: "conversation_reply",
          sourceCode: conversationResult.result.source,
          modelIdentifier: getOpenAiModel(),
          postValidationOutcomeCode: getChatPostValidationOutcome(
            conversationResult.validation,
          ),
        }),
      ]
    : [];

  return buildEventBundle({
    safetyEvents: safetyDecisions.map((decision) =>
      buildSafetyEvent("api/chat", decision),
    ),
    modelEvents: [
      ...buildAiTriageModelEvents(safetyDecisions, getOpenAiTriageModel()),
      ...modelEvents,
    ],
    auditEvent: buildAuditEvent(
      "api/chat",
      response.source === "safety"
        ? "safety_blocked"
        : response.source === "boundary"
          ? "boundary_blocked"
          : "completed",
    ),
  });
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
