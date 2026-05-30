import "server-only";

import { randomBytes } from "node:crypto";

import {
  generateStructuredClarityMap,
  getOpenAiClarityModel,
  type ClarityMapAgentResult,
} from "@/lib/ai/clarity-map";
import { getOpenAiTriageModel } from "@/lib/ai/triage";
import {
  claimClarityMapGeneration,
  mergeOwnedSessionSafetyState,
  persistClarityMapResult,
} from "@/lib/db/repositories/clarity-maps";
import { loadPersistedTranscript } from "@/lib/db/repositories/messages";
import { recordAuthorizedAuditEvent } from "@/lib/db/repositories/event-metadata";
import { mockClarityMap } from "@/lib/mock/mock-clarity-map";
import { classifyPolicyBoundary } from "@/lib/safety/policy-boundary-classifier";
import { classifyRisk } from "@/lib/safety/risk-classifier";
import {
  safetyOrchestrator,
  type SafetyDecision,
  type SafetyState,
} from "@/lib/safety-core";
import { determineSafetyState } from "@/lib/safety-core/safety-state-machine";
import { sha256 } from "@/lib/server/crypto/sensitive-data";
import {
  clarityMapInProgress,
  dataBackendUnavailable,
} from "@/lib/server/http/api-errors";
import {
  decryptClarityMapResponse,
  encryptClarityMapResponse,
} from "@/lib/server/persistence/clarity-map-payloads";
import {
  buildAiTriageModelEvents,
  buildAuditEvent,
  buildEventBundle,
  buildModelEvent,
  buildSafetyEvent,
  type AuditOutcome,
  type EventBundle,
} from "@/lib/server/persistence/event-payloads";
import { createAuthoritativeSessionContext } from "@/lib/server/session/authoritative-context";
import type { OwnedSession } from "@/lib/server/session/ownership";
import {
  type ClarityMapRequest,
  type EnhancedClarityMapRequest,
  isEnhancedClarityMapRequest,
} from "@/lib/validation/clarity-map";
import type { StructuredClarityMap } from "@/types/clarity-map";
import type { PolicyBoundaryResult } from "@/types/policy-boundary";
import type {
  ApiChatMessage,
  ApiRiskClassification,
  SafetyUi,
} from "@/types/risk";
import type { SupportResource } from "@/types/resource";

export type LegacyClarityMapResponse = {
  clarityMap: typeof mockClarityMap;
};

export type EnhancedClarityMapResponse =
  | {
      type: "clarity_map";
      source: "openai" | "fallback";
      clarityMap: StructuredClarityMap;
    }
  | {
      type: "safety_blocked";
      source: "safety";
      assistantMessage: ApiChatMessage;
      risk: ApiRiskClassification;
      safety: SafetyUi | null;
      resources: SupportResource[];
      persistenceStatus?: "unavailable";
    }
  | {
      type: "boundary_blocked";
      source: "boundary";
      assistantMessage: ApiChatMessage;
      policyBoundary: PolicyBoundaryResult;
      persistenceStatus?: "unavailable";
    }
  | {
      type: "insufficient_context";
      source: "fallback";
      message: string;
    };

export type ClarityMapApiResponse =
  | LegacyClarityMapResponse
  | EnhancedClarityMapResponse;

type ClarityMapDependencies = {
  clarityMapAgent?: (
    input: Pick<EnhancedClarityMapRequest, "sessionContext" | "messages">,
  ) => Promise<ClarityMapAgentResult>;
};

type ClarityMapOptions = {
  previousState?: SafetyState;
  onSafetyDecision?: (decision: SafetyDecision) => void;
};

export async function createClarityMapResponse(
  request: ClarityMapRequest,
  dependencies: ClarityMapDependencies = {},
  options: ClarityMapOptions = {},
): Promise<ClarityMapApiResponse> {
  if (!isEnhancedClarityMapRequest(request)) {
    return getMockClarityMap(request);
  }

  const meaningfulUserMessages = getMeaningfulUserMessages(request.messages);

  const safetyBlock = await getSafetyBlock(
    request,
    meaningfulUserMessages,
    options,
  );

  if (safetyBlock) {
    return safetyBlock;
  }

  if (!hasEnoughContext(meaningfulUserMessages)) {
    return {
      type: "insufficient_context",
      source: "fallback",
      message:
        "We need a little more conversation to build a useful map. Share one or two more messages first.",
    };
  }

  const agent = dependencies.clarityMapAgent ?? generateStructuredClarityMap;
  const result = await agent({
    sessionContext: request.sessionContext,
    messages: getBoundedMessages(request.messages),
  });

  return {
    type: "clarity_map",
    source: result.source,
    clarityMap: result.clarityMap,
  };
}

export async function createPersistedClarityMapResponse(
  request: ClarityMapRequest,
  owned: OwnedSession,
  dependencies: ClarityMapDependencies = {},
): Promise<ClarityMapApiResponse> {
  if (!isEnhancedClarityMapRequest(request)) {
    const response = await createClarityMapResponse(request, dependencies);
    await recordAuthorizedAuditEvent({
      ownerId: owned.owner.id,
      sessionId: owned.session.id,
      eventBundle: buildEventBundle({
        auditEvent: buildAuditEvent("api/clarity-map", "legacy_served"),
      }),
    });

    return response;
  }

  const retainedTranscript = owned.session.storageConsentAccepted
    ? await loadPersistedTranscript(owned.session.id)
    : null;
  const hasAuthoritativeTranscript =
    retainedTranscript?.hasChatUser === true;
  const messages = hasAuthoritativeTranscript
    ? retainedTranscript.messages
    : request.messages;
  const authoritativeRequest: EnhancedClarityMapRequest = {
    ...request,
    sessionContext: createAuthoritativeSessionContext(owned.session),
    messages,
  };
  const safetyDecisions: SafetyDecision[] = [];
  let transcriptFingerprint: string | null = null;
  let leaseTokenHash: string | null = null;
  let replayed = false;

  const response = await createClarityMapResponse(
    authoritativeRequest,
    {
      clarityMapAgent: async (input) => {
        if (hasAuthoritativeTranscript && retainedTranscript) {
          transcriptFingerprint = createTranscriptFingerprint(
            owned.session.id,
            retainedTranscript.messageRowIds,
          );
          leaseTokenHash = sha256(randomBytes(32).toString("base64url"));
          const claim = await claimClarityMapGeneration({
            ownerId: owned.owner.id,
            sessionId: owned.session.id,
            transcriptFingerprint,
            leaseTokenHash,
          });

          if (claim.status === "in_progress") {
            throw clarityMapInProgress();
          }

          if (claim.status === "completed") {
            replayed = true;
            const retained = decryptClarityMapResponse(
              claim.mapEncrypted,
              messages,
            );

            return {
              source: retained.source,
              clarityMap: retained.clarityMap,
            };
          }
        }

        return (dependencies.clarityMapAgent ?? generateStructuredClarityMap)(
          input,
        );
      },
    },
    {
      previousState: owned.session.currentSafetyState ?? undefined,
      onSafetyDecision: (decision) => {
        safetyDecisions.push(decision);
      },
    },
  );

  if (!("type" in response)) {
    throw dataBackendUnavailable();
  }

  try {
    const eventBundle = buildClarityMapEventBundle(
      response,
      safetyDecisions,
      replayed,
    );

    if (response.type === "safety_blocked" || response.type === "boundary_blocked") {
      await mergeSafetyStateIfEvaluated(
        owned,
        safetyDecisions.at(-1),
        eventBundle,
      );
      return response;
    }

    if (response.type === "insufficient_context") {
      await mergeSafetyStateIfEvaluated(
        owned,
        safetyDecisions.at(-1),
        eventBundle,
      );
      return response;
    }

    if (!owned.session.storageConsentAccepted || replayed) {
      await mergeSafetyStateIfEvaluated(
        owned,
        safetyDecisions.at(-1),
        eventBundle,
      );
      return response;
    }

    const mapEncrypted = encryptClarityMapResponse(response);
    decryptClarityMapResponse(mapEncrypted, messages);
    const retainedEnvelope = await persistClarityMapResult({
      ownerId: owned.owner.id,
      sessionId: owned.session.id,
      mapEncrypted,
      source: response.source,
      schemaVersion: response.clarityMap.schemaVersion,
      transcriptFingerprint,
      leaseTokenHash,
      riskLevel: safetyDecisions.at(-1)?.risk.level ?? null,
      safetyState: safetyDecisions.at(-1)?.safetyState ?? null,
      eventBundle,
    });

    return decryptClarityMapResponse(retainedEnvelope, messages);
  } catch {
    if (response.type === "safety_blocked" || response.type === "boundary_blocked") {
      return { ...response, persistenceStatus: "unavailable" };
    }

    throw dataBackendUnavailable();
  }
}

export function getMockClarityMap(request: Pick<ClarityMapRequest, "sessionId">) {
  void request;

  return {
    clarityMap: mockClarityMap,
  };
}

async function getSafetyBlock(
  request: EnhancedClarityMapRequest,
  meaningfulUserMessages: ApiChatMessage[],
  options: ClarityMapOptions,
): Promise<EnhancedClarityMapResponse | null> {
  const latestUserMessage = meaningfulUserMessages.at(-1);

  if (!latestUserMessage) {
    return null;
  }

  const latestDecision = await safetyOrchestrator.evaluate({
    message: latestUserMessage.content,
    sessionContext: request.sessionContext,
    previousState: options.previousState,
  });
  options.onSafetyDecision?.(latestDecision);

  if (!latestDecision.allowNormalChat) {
    return toBlockedResponse(latestDecision.responseSource, {
      content:
        latestDecision.responseContent ??
        "MindBridge cannot generate a normal Clarity Map from this message.",
      risk: latestDecision.risk,
      safety: latestDecision.safety,
      resources: latestDecision.resources,
      policyBoundary: latestDecision.policyBoundary,
    });
  }

  const deterministicBlock = findDeterministicTranscriptBlock(
    meaningfulUserMessages,
  );

  if (!deterministicBlock) {
    return null;
  }

  const blockDecision = await safetyOrchestrator.evaluate(
    {
      message: deterministicBlock.content,
      sessionContext: request.sessionContext,
      previousState: options.previousState,
    },
    {
      aiTriageClassifier: async () => ({
        available: false,
        reason: "missing_config",
      }),
    },
  );
  options.onSafetyDecision?.(blockDecision);

  return toBlockedResponse(blockDecision.responseSource, {
    content:
      blockDecision.responseContent ??
      "MindBridge cannot generate a normal Clarity Map from this message.",
    risk: blockDecision.risk,
    safety: blockDecision.safety,
    resources: blockDecision.resources,
    policyBoundary: blockDecision.policyBoundary,
  });
}

async function mergeSafetyStateIfEvaluated(
  owned: OwnedSession,
  decision: SafetyDecision | undefined,
  eventBundle: EventBundle,
) {
  if (!decision) {
    await recordAuthorizedAuditEvent({
      ownerId: owned.owner.id,
      sessionId: owned.session.id,
      eventBundle,
    });
    return;
  }

  await mergeOwnedSessionSafetyState({
    ownerId: owned.owner.id,
    sessionId: owned.session.id,
    riskLevel: decision.risk.level,
    safetyState: decision.safetyState,
    eventBundle,
  });
}

function buildClarityMapEventBundle(
  response: EnhancedClarityMapResponse,
  safetyDecisions: SafetyDecision[],
  replayed: boolean,
) {
  const modelEvents =
    response.type === "clarity_map" && !replayed
      ? [
          buildModelEvent({
            taskCode: "clarity_map_generation",
            sourceCode: response.source,
            modelIdentifier: getOpenAiClarityModel(),
          }),
        ]
      : [];

  return buildEventBundle({
    safetyEvents: safetyDecisions.map((decision) =>
      buildSafetyEvent("api/clarity-map", decision),
    ),
    modelEvents: [
      ...buildAiTriageModelEvents(safetyDecisions, getOpenAiTriageModel()),
      ...modelEvents,
    ],
    auditEvent: buildAuditEvent(
      "api/clarity-map",
      getClarityMapAuditOutcome(response, replayed),
    ),
  });
}

function getClarityMapAuditOutcome(
  response: EnhancedClarityMapResponse,
  replayed: boolean,
): AuditOutcome {
  if (replayed) {
    return "replayed";
  }

  if (response.type === "safety_blocked") {
    return "safety_blocked";
  }

  if (response.type === "boundary_blocked") {
    return "boundary_blocked";
  }

  if (response.type === "insufficient_context") {
    return "insufficient_context";
  }

  return "completed";
}

function createTranscriptFingerprint(sessionId: string, messageRowIds: string[]) {
  return sha256(["clarity_map_input.v1", sessionId, ...messageRowIds].join("\n"));
}

function findDeterministicTranscriptBlock(messages: ApiChatMessage[]) {
  return [...messages].reverse().find((message) => {
    const risk = classifyRisk(message.content);
    const policyBoundary = classifyPolicyBoundary(message.content);
    const safetyState = determineSafetyState({ risk, policyBoundary });

    if (policyBoundary.categories.includes("self_harm_method_request")) {
      return true;
    }

    if (
      policyBoundary.action === "route_to_safety" ||
      ["imminent_risk", "active_suicidal_ideation", "third_party_self_harm", "medical_emergency", "harm_to_others", "self_harm_method_request"].includes(
        safetyState,
      )
    ) {
      return true;
    }

    return ["high", "imminent"].includes(risk.level);
  });
}

function toBlockedResponse(
  source: "safety" | "boundary" | null,
  input: {
    content: string;
    risk: ApiRiskClassification;
    safety: SafetyUi | null;
    resources: SupportResource[];
    policyBoundary?: PolicyBoundaryResult;
  },
): EnhancedClarityMapResponse {
  if (source === "boundary" && input.policyBoundary) {
    return {
      type: "boundary_blocked",
      source: "boundary",
      assistantMessage: createAssistantMessage(input.content),
      policyBoundary: input.policyBoundary,
    };
  }

  return {
    type: "safety_blocked",
    source: "safety",
    assistantMessage: createAssistantMessage(input.content),
    risk: input.risk,
    safety: input.safety,
    resources: input.resources,
  };
}

function hasEnoughContext(messages: ApiChatMessage[]) {
  const totalUserTextLength = messages.reduce(
    (total, message) => total + message.content.trim().length,
    0,
  );

  return (
    messages.some((message) => message.content.trim().length >= 20) &&
    totalUserTextLength >= 40
  );
}

function getMeaningfulUserMessages(messages: ApiChatMessage[]) {
  return messages.filter(
    (message) =>
      message.role === "user" && message.content.trim().length >= 8,
  );
}

function getBoundedMessages(messages: ApiChatMessage[]) {
  return messages.slice(-16);
}

function createAssistantMessage(content: string): ApiChatMessage {
  return {
    id: `clarity_map_block_${Date.now()}`,
    role: "assistant",
    content,
    createdAt: new Date().toISOString(),
  };
}
