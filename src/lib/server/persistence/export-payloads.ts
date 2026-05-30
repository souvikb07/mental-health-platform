import "server-only";

import { z } from "zod";

import type { AnonymousOwnerExportRows } from "@/lib/db/repositories/data-controls";
import { decryptSensitiveJson } from "@/lib/server/crypto/sensitive-data";
import { dataBackendUnavailable } from "@/lib/server/http/api-errors";
import { decryptClarityMapResponseForExport } from "@/lib/server/persistence/clarity-map-payloads";
import { decryptFeedbackComment } from "@/lib/server/persistence/feedback-payloads";
import {
  decryptChatAssistantResponse,
  decryptChatUserMessage,
  decryptContextIntakeResponse,
} from "@/lib/server/persistence/message-payloads";

const timestampSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)));
const codeSchema = z.string().regex(/^[a-z0-9][a-z0-9_.:/-]{0,159}$/);
const errorCodeSchema = z.string().regex(/^[A-Z0-9][A-Z0-9_:-]{0,119}$/);
const envelopeSchema = z
  .object({
    kid: z.literal("v1"),
    algorithm: z.literal("aes-256-gcm"),
    iv: z.string(),
    authTag: z.string(),
    ciphertext: z.string(),
  })
  .strict();
const sessionIdSchema = z.string().uuid();
const riskLevelSchema = z.enum(["none", "low", "medium", "high", "imminent"]);
const safetyStateSchema = z.enum([
  "normal_support",
  "elevated_distress",
  "passive_suicidal_ideation",
  "active_suicidal_ideation",
  "third_party_self_harm",
  "imminent_risk",
  "self_harm_method_request",
  "medical_emergency",
  "harm_to_others",
  "abuse_or_coercion",
  "policy_boundary",
]);
const onboardingContextSchema = z
  .object({
    version: z.literal("onboarding_context.v1"),
    ageBand: z.string().optional(),
    mainConcern: z.string().optional(),
    mainConcernText: z.string().optional(),
  })
  .strict();
const sessionRowSchema = z
  .object({
    id: sessionIdSchema,
    created_at: timestampSchema,
    expires_at: timestampSchema,
    storage_consent_accepted: z.boolean(),
    storage_policy_version: codeSchema.nullable(),
    country_code: z.enum(["US", "IN", "GLOBAL"]).nullable(),
    main_concern_category: z
      .enum([
        "overwhelmed",
        "anxious_worried",
        "low_numb_disconnected",
        "work_study_stress",
        "relationship_family",
        "sleep_energy",
        "not_sure",
      ])
      .nullable(),
    current_risk_level: riskLevelSchema.nullable(),
    current_safety_state: safetyStateSchema.nullable(),
    onboarding_note_encrypted: envelopeSchema.nullable(),
  })
  .strict();
const consentRowSchema = z
  .object({
    session_id: sessionIdSchema,
    consent_type: z.enum(["product_boundary", "sensitive_storage"]),
    policy_version: codeSchema,
    accepted: z.boolean(),
    created_at: timestampSchema,
  })
  .strict();
const messageRowSchema = z
  .object({
    session_id: sessionIdSchema,
    source: z.enum([
      "context_intake_result",
      "chat_user",
      "chat_openai",
      "chat_fallback",
      "chat_safety",
      "chat_boundary",
    ]),
    content_encrypted: envelopeSchema,
    created_at: timestampSchema,
  })
  .strict();
const clarityMapRowSchema = z
  .object({
    session_id: sessionIdSchema,
    source: z.enum(["openai", "fallback"]).nullable(),
    schema_version: codeSchema.nullable(),
    map_encrypted: envelopeSchema,
    created_at: timestampSchema,
  })
  .strict();
const feedbackRowSchema = z
  .object({
    session_id: sessionIdSchema,
    clarity_rating: z.number().int().min(1).max(5).nullable(),
    helpfulness_rating: z.number().int().min(1).max(5).nullable(),
    felt_safe: z.boolean().nullable(),
    unsafe_or_unhelpful: z.boolean(),
    comment_encrypted: envelopeSchema.nullable(),
    created_at: timestampSchema,
  })
  .strict();
const safetyEventRowSchema = z
  .object({
    session_id: sessionIdSchema,
    route_key: z.enum(["api/context-intake", "api/chat", "api/clarity-map"]),
    risk_level: riskLevelSchema,
    categories: z.array(
      z.enum([
        "self_harm",
        "harm_to_others",
        "abuse",
        "psychosis_or_mania_signal",
        "substance_use",
        "minor_safety",
        "medical_emergency",
      ]),
    ),
    action_taken: z.enum([
      "continue_chat",
      "continue_with_supportive_nudge",
      "show_resources",
      "urgent_support",
    ]),
    safety_state: safetyStateSchema,
    response_source: z.enum(["normal", "safety", "boundary"]),
    policy_action: z.enum(["allow", "answer_with_boundary", "route_to_safety"]),
    policy_categories: z.array(
      z.enum([
        "diagnosis_request",
        "medication_request",
        "treatment_protocol_request",
        "medical_advice_request",
        "therapy_replacement_request",
        "self_harm_method_request",
        "prompt_injection",
        "dependency_request",
        "out_of_scope",
      ]),
    ),
    signal_tags: z.array(
      z.enum(["third_party_self_harm", "third_party_self_harm_imminent"]),
    ),
    requires_crisis_response: z.boolean(),
    ai_triage_available: z.boolean(),
    ai_triage_used: z.boolean(),
    ai_triage_escalated: z.boolean(),
    ai_triage_confidence: z.enum(["low", "medium", "high"]).nullable(),
    ai_triage_rationale_code: codeSchema.nullable(),
    created_at: timestampSchema,
  })
  .strict();
const modelEventRowSchema = z
  .object({
    session_id: sessionIdSchema.nullable(),
    task_code: z.enum([
      "context_intake",
      "conversation_reply",
      "clarity_map_generation",
      "ai_triage",
    ]),
    source_code: z.enum(["openai", "fallback"]),
    model_identifier: z
      .string()
      .regex(/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/)
      .nullable(),
    fallback_reason_code: z.literal("agent_fallback").nullable(),
    post_validation_outcome_code: z
      .enum([
        "passed",
        "blocked_empty_response",
        "blocked_definitive_diagnosis",
        "blocked_medication_advice",
        "blocked_treatment_protocol",
        "blocked_unsafe_reassurance",
        "blocked_therapy_replacement",
        "blocked_self_harm_method_detail",
      ])
      .nullable(),
    store_disabled: z.literal(true),
    created_at: timestampSchema,
  })
  .strict();
const auditEventRowSchema = z
  .object({
    session_id: sessionIdSchema.nullable(),
    event_type: codeSchema,
    route_key: codeSchema.nullable(),
    outcome_code: codeSchema.nullable(),
    error_code: errorCodeSchema.nullable(),
    created_at: timestampSchema,
  })
  .strict();

export function buildAnonymousDataExport(
  rows: AnonymousOwnerExportRows,
  exportedAt = new Date().toISOString(),
) {
  try {
    const sessions = sessionRowSchema.array().parse(rows.sessions);
    const sessionIds = new Set(sessions.map((session) => session.id));
    const consentEvents = groupBySession(
      consentRowSchema.array().parse(rows.consentEvents),
      sessionIds,
    );
    const messages = groupBySession(
      messageRowSchema.array().parse(rows.messages),
      sessionIds,
    );
    const clarityMaps = groupBySession(
      clarityMapRowSchema.array().parse(rows.clarityMaps),
      sessionIds,
    );
    const feedback = groupBySession(
      feedbackRowSchema.array().parse(rows.feedback),
      sessionIds,
    );
    const safetyEvents = groupBySession(
      safetyEventRowSchema.array().parse(rows.safetyEvents),
      sessionIds,
    );
    const modelEvents = modelEventRowSchema.array().parse(rows.modelEvents);
    const auditEvents = auditEventRowSchema.array().parse(rows.auditEvents);

    assertKnownOptionalSessions(modelEvents, sessionIds);
    assertKnownOptionalSessions(auditEvents, sessionIds);

    return {
      schemaVersion: "mindbridge.anonymous-data-export.v1" as const,
      exportedAt: timestampSchema.parse(exportedAt),
      journeys: sessions.map((session) => ({
        session: {
          sessionId: session.id,
          createdAt: session.created_at,
          expiresAt: session.expires_at,
          storageConsentAccepted: session.storage_consent_accepted,
          storagePolicyVersion: session.storage_policy_version,
          countryCode: session.country_code,
          mainConcernCategory: session.main_concern_category,
          currentRiskLevel: session.current_risk_level,
          currentSafetyState: session.current_safety_state,
        },
        ...getOnboardingContext(session),
        consentEvents: (consentEvents.get(session.id) ?? []).map(toConsentEvent),
        messages: (messages.get(session.id) ?? []).map(toMessage),
        clarityMaps: (clarityMaps.get(session.id) ?? []).map(toClarityMap),
        feedback: (feedback.get(session.id) ?? []).map(toFeedback),
        safetyEvents: (safetyEvents.get(session.id) ?? []).map(toSafetyEvent),
        modelEvents: modelEvents
          .filter((event) => event.session_id === session.id)
          .map(toModelEvent),
        auditEvents: auditEvents
          .filter((event) => event.session_id === session.id)
          .map(toAuditEvent),
      })),
      ownerEvents: {
        modelEvents: modelEvents
          .filter((event) => event.session_id === null)
          .map(toModelEvent),
        auditEvents: auditEvents
          .filter((event) => event.session_id === null)
          .map(toAuditEvent),
      },
    };
  } catch {
    throw dataBackendUnavailable();
  }
}

function getOnboardingContext(session: z.infer<typeof sessionRowSchema>) {
  if (!session.onboarding_note_encrypted) {
    return {};
  }

  const retained = onboardingContextSchema.parse(
    decryptSensitiveJson<unknown>(session.onboarding_note_encrypted),
  );
  const onboardingContext = {
    ...(retained.ageBand ? { ageBand: retained.ageBand } : {}),
    ...(retained.mainConcern ? { mainConcern: retained.mainConcern } : {}),
    ...(retained.mainConcernText
      ? { mainConcernText: retained.mainConcernText }
      : {}),
  };

  return { onboardingContext };
}

function toConsentEvent(row: z.infer<typeof consentRowSchema>) {
  return {
    consentType: row.consent_type,
    policyVersion: row.policy_version,
    accepted: row.accepted,
    createdAt: row.created_at,
  };
}

function toMessage(row: z.infer<typeof messageRowSchema>) {
  if (row.source === "context_intake_result") {
    return {
      kind: "context_intake_response" as const,
      createdAt: row.created_at,
      response: decryptContextIntakeResponse(row.content_encrypted),
    };
  }

  if (row.source === "chat_user") {
    return {
      kind: "chat_user" as const,
      createdAt: row.created_at,
      message: decryptChatUserMessage(row.content_encrypted),
    };
  }

  const response = decryptChatAssistantResponse(row.content_encrypted);

  return {
    kind: "chat_assistant" as const,
    createdAt: row.created_at,
    message: response.assistantMessage,
    response,
  };
}

function toClarityMap(row: z.infer<typeof clarityMapRowSchema>) {
  return {
    createdAt: row.created_at,
    source: row.source,
    schemaVersion: row.schema_version,
    response: decryptClarityMapResponseForExport(row.map_encrypted),
  };
}

function toFeedback(row: z.infer<typeof feedbackRowSchema>) {
  return {
    clarityRating: row.clarity_rating,
    helpfulnessRating: row.helpfulness_rating,
    feltSafe: row.felt_safe,
    unsafeOrUnhelpful: row.unsafe_or_unhelpful,
    ...(row.comment_encrypted
      ? { comment: decryptFeedbackComment(row.comment_encrypted) }
      : {}),
    createdAt: row.created_at,
  };
}

function toSafetyEvent(row: z.infer<typeof safetyEventRowSchema>) {
  return {
    routeKey: row.route_key,
    riskLevel: row.risk_level,
    categories: row.categories,
    actionTaken: row.action_taken,
    safetyState: row.safety_state,
    responseSource: row.response_source,
    policyAction: row.policy_action,
    policyCategories: row.policy_categories,
    signalTags: row.signal_tags,
    requiresCrisisResponse: row.requires_crisis_response,
    aiTriageAvailable: row.ai_triage_available,
    aiTriageUsed: row.ai_triage_used,
    aiTriageEscalated: row.ai_triage_escalated,
    aiTriageConfidence: row.ai_triage_confidence,
    aiTriageRationaleCode: row.ai_triage_rationale_code,
    createdAt: row.created_at,
  };
}

function toModelEvent(row: z.infer<typeof modelEventRowSchema>) {
  return {
    taskCode: row.task_code,
    sourceCode: row.source_code,
    modelIdentifier: row.model_identifier,
    fallbackReasonCode: row.fallback_reason_code,
    postValidationOutcomeCode: row.post_validation_outcome_code,
    storeDisabled: row.store_disabled,
    createdAt: row.created_at,
  };
}

function toAuditEvent(row: z.infer<typeof auditEventRowSchema>) {
  return {
    eventType: row.event_type,
    routeKey: row.route_key,
    outcomeCode: row.outcome_code,
    errorCode: row.error_code,
    createdAt: row.created_at,
  };
}

function groupBySession<T extends { session_id: string }>(
  rows: T[],
  sessionIds: Set<string>,
) {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    if (!sessionIds.has(row.session_id)) {
      throw new Error("Export row does not belong to an owned session.");
    }

    grouped.set(row.session_id, [...(grouped.get(row.session_id) ?? []), row]);
  }

  return grouped;
}

function assertKnownOptionalSessions<T extends { session_id: string | null }>(
  rows: T[],
  sessionIds: Set<string>,
) {
  if (
    rows.some(
      (row) => row.session_id !== null && !sessionIds.has(row.session_id),
    )
  ) {
    throw new Error("Export event does not belong to an owned session.");
  }
}
