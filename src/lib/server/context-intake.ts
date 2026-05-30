import "server-only";

import {
  generateContextIntake,
  getOpenAiContextIntakeModel,
  type ContextIntakeAgentResult,
} from "@/lib/ai/context-intake";
import { getOpenAiTriageModel } from "@/lib/ai/triage";
import {
  persistContextIntakeResult,
} from "@/lib/db/repositories/chat-turns";
import { recordAuthorizedAuditEvent } from "@/lib/db/repositories/event-metadata";
import { findPersistedContextIntakeResponse } from "@/lib/db/repositories/messages";
import {
  safetyOrchestrator,
  type SafetyDecision,
  type SafetyState,
} from "@/lib/safety-core";
import { dataBackendUnavailable } from "@/lib/server/http/api-errors";
import {
  decryptContextIntakeResponse,
  encryptContextIntakeResponse,
} from "@/lib/server/persistence/message-payloads";
import {
  buildAiTriageModelEvents,
  buildAuditEvent,
  buildEventBundle,
  buildModelEvent,
  buildSafetyEvent,
} from "@/lib/server/persistence/event-payloads";
import { createAuthoritativeSessionContext } from "@/lib/server/session/authoritative-context";
import type { OwnedSession } from "@/lib/server/session/ownership";
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
      persistenceStatus?: "unavailable";
    }
  | {
      type: "boundary";
      assistantMessage: ApiChatMessage;
      policyBoundary: PolicyBoundaryResult;
      source: "boundary";
      persistenceStatus?: "unavailable";
    };

type ContextIntakeDependencies = {
  contextIntakeAgent?: (
    sessionContext: SessionContext,
  ) => Promise<ContextIntakeAgentResult>;
};

type ContextIntakeOptions = {
  previousState?: SafetyState;
  onSafetyDecision?: (decision: SafetyDecision) => void;
};

export async function createContextIntakeResponse(
  sessionContext: SessionContext,
  dependencies: ContextIntakeDependencies = {},
  options: ContextIntakeOptions = {},
): Promise<ContextIntakeResponse> {
  const optionalText = sessionContext.mainConcernText?.trim();

  if (optionalText) {
    const safetyDecision = await safetyOrchestrator.evaluate({
      message: optionalText,
      sessionContext,
      previousState: options.previousState,
    });
    options.onSafetyDecision?.(safetyDecision);

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

export async function createPersistedContextIntakeResponse(
  sessionContext: SessionContext,
  owned: OwnedSession,
  dependencies: ContextIntakeDependencies = {},
): Promise<ContextIntakeResponse> {
  const authoritativeContext = createAuthoritativeSessionContext(
    owned.session,
    {
      transientContext: sessionContext,
      includeTransientOptionalText: true,
    },
  );

  if (owned.session.storageConsentAccepted) {
    const retained = await findPersistedContextIntakeResponse(owned.session.id);

    if (retained) {
      await recordAuthorizedAuditEvent({
        ownerId: owned.owner.id,
        sessionId: owned.session.id,
        eventBundle: buildEventBundle({
          auditEvent: buildAuditEvent("api/context-intake", "replayed"),
        }),
      });

      return retained;
    }
  }

  let safetyDecision: SafetyDecision | undefined;
  const response = await createContextIntakeResponse(
    authoritativeContext,
    dependencies,
    {
      previousState: owned.session.currentSafetyState ?? undefined,
      onSafetyDecision: (decision) => {
        safetyDecision = decision;
      },
    },
  );

  try {
    const retainedEnvelope = await persistContextIntakeResult({
      ownerId: owned.owner.id,
      sessionId: owned.session.id,
      responseEncrypted: owned.session.storageConsentAccepted
        ? encryptContextIntakeResponse(response)
        : null,
      riskLevel: safetyDecision?.risk.level ?? null,
      safetyState: safetyDecision?.safetyState ?? null,
      eventBundle: buildContextIntakeEventBundle(response, safetyDecision),
    });

    return retainedEnvelope
      ? decryptContextIntakeResponse(retainedEnvelope)
      : response;
  } catch {
    if (response.type === "safety" || response.type === "boundary") {
      return { ...response, persistenceStatus: "unavailable" };
    }

    throw dataBackendUnavailable();
  }
}

function buildContextIntakeEventBundle(
  response: ContextIntakeResponse,
  safetyDecision: SafetyDecision | undefined,
) {
  const safetyDecisions = safetyDecision ? [safetyDecision] : [];
  const modelEvents =
    response.type === "opener"
      ? [
          buildModelEvent({
            taskCode: "context_intake",
            sourceCode: response.source,
            modelIdentifier: getOpenAiContextIntakeModel(),
          }),
        ]
      : [];

  return buildEventBundle({
    safetyEvents: safetyDecisions.map((decision) =>
      buildSafetyEvent("api/context-intake", decision),
    ),
    modelEvents: [
      ...buildAiTriageModelEvents(safetyDecisions, getOpenAiTriageModel()),
      ...modelEvents,
    ],
    auditEvent: buildAuditEvent(
      "api/context-intake",
      response.type === "safety"
        ? "safety_blocked"
        : response.type === "boundary"
          ? "boundary_blocked"
          : "completed",
    ),
  });
}

function createAssistantMessage(content: string): ApiChatMessage {
  return {
    id: `context_intake_${Date.now()}`,
    role: "assistant",
    content,
    createdAt: new Date().toISOString(),
  };
}
