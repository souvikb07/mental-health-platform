import "server-only";

import { z } from "zod";

import type { SafetyDecision } from "@/lib/safety-core";

const routeKeySchema = z.enum([
  "api/context-intake",
  "api/chat",
  "api/clarity-map",
  "api/feedback",
]);
const safetyRouteKeySchema = z.enum([
  "api/context-intake",
  "api/chat",
  "api/clarity-map",
]);
const auditOutcomeSchema = z.enum([
  "completed",
  "replayed",
  "safety_blocked",
  "boundary_blocked",
  "insufficient_context",
  "legacy_served",
  "received",
]);
const riskLevelSchema = z.enum(["none", "low", "medium", "high", "imminent"]);
const riskCategorySchema = z.enum([
  "self_harm",
  "harm_to_others",
  "abuse",
  "psychosis_or_mania_signal",
  "substance_use",
  "minor_safety",
  "medical_emergency",
]);
const signalTagSchema = z.enum([
  "third_party_self_harm",
  "third_party_self_harm_imminent",
]);
const nextActionSchema = z.enum([
  "continue_chat",
  "continue_with_supportive_nudge",
  "show_resources",
  "urgent_support",
]);
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
const policyActionSchema = z.enum([
  "allow",
  "answer_with_boundary",
  "route_to_safety",
]);
const policyCategorySchema = z.enum([
  "diagnosis_request",
  "medication_request",
  "treatment_protocol_request",
  "medical_advice_request",
  "therapy_replacement_request",
  "self_harm_method_request",
  "prompt_injection",
  "dependency_request",
  "out_of_scope",
]);
const modelTaskSchema = z.enum([
  "context_intake",
  "conversation_reply",
  "clarity_map_generation",
  "ai_triage",
]);
const modelIdentifierSchema = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/)
  .nullable();
const postValidationOutcomeSchema = z.enum([
  "passed",
  "blocked_empty_response",
  "blocked_definitive_diagnosis",
  "blocked_medication_advice",
  "blocked_treatment_protocol",
  "blocked_unsafe_reassurance",
  "blocked_therapy_replacement",
  "blocked_self_harm_method_detail",
]);

const safetyEventSchema = z
  .object({
    route_key: safetyRouteKeySchema,
    risk_level: riskLevelSchema,
    categories: z.array(riskCategorySchema),
    action_taken: nextActionSchema,
    safety_state: safetyStateSchema,
    response_source: z.enum(["normal", "safety", "boundary"]),
    policy_action: policyActionSchema,
    policy_categories: z.array(policyCategorySchema),
    signal_tags: z.array(signalTagSchema),
    requires_crisis_response: z.boolean(),
    ai_triage_available: z.boolean(),
    ai_triage_used: z.boolean(),
    ai_triage_escalated: z.boolean(),
    ai_triage_confidence: z.enum(["low", "medium", "high"]).nullable(),
    ai_triage_rationale_code: z
      .string()
      .regex(/^[a-z0-9][a-z0-9_.:-]{0,119}$/)
      .nullable(),
  })
  .strict()
  .superRefine((event, context) => {
    if (event.ai_triage_used && !event.ai_triage_available) {
      context.addIssue({
        code: "custom",
        message: "Used AI triage metadata must be available.",
      });
    }

    if (event.ai_triage_escalated && !event.ai_triage_used) {
      context.addIssue({
        code: "custom",
        message: "Escalated AI triage metadata must be used.",
      });
    }

    if (
      event.ai_triage_used !==
      Boolean(event.ai_triage_confidence && event.ai_triage_rationale_code)
    ) {
      context.addIssue({
        code: "custom",
        message: "AI triage detail codes must match usage.",
      });
    }
  });

const modelEventSchema = z
  .object({
    task_code: modelTaskSchema,
    source_code: z.enum(["openai", "fallback"]),
    model_identifier: modelIdentifierSchema,
    fallback_reason_code: z.literal("agent_fallback").nullable(),
    post_validation_outcome_code: postValidationOutcomeSchema.nullable(),
    store_disabled: z.literal(true),
  })
  .strict()
  .superRefine((event, context) => {
    if (
      event.source_code === "openai" &&
      event.fallback_reason_code !== null
    ) {
      context.addIssue({
        code: "custom",
        message: "OpenAI metadata cannot include a fallback code.",
      });
    }

    if (
      event.source_code === "fallback" &&
      (event.fallback_reason_code !== "agent_fallback" ||
        event.model_identifier !== null)
    ) {
      context.addIssue({
        code: "custom",
        message: "Fallback metadata must remain coarse and model-free.",
      });
    }

    if (
      event.task_code !== "conversation_reply" &&
      event.post_validation_outcome_code !== null
    ) {
      context.addIssue({
        code: "custom",
        message: "Post-validation metadata belongs only to conversation replies.",
      });
    }

    if (event.task_code === "ai_triage" && event.source_code !== "openai") {
      context.addIssue({
        code: "custom",
        message: "Retained AI triage model metadata represents used runs only.",
      });
    }
  });

const auditEventSchema = z
  .object({
    event_type: z.literal("authorized_session_action"),
    route_key: routeKeySchema,
    outcome_code: auditOutcomeSchema,
    error_code: z.null(),
  })
  .strict();

const eventBundleSchema = z
  .object({
    safety_events: z.array(safetyEventSchema),
    model_events: z.array(modelEventSchema),
    audit_event: auditEventSchema,
  })
  .strict();

export type SafetyEventPayload = z.infer<typeof safetyEventSchema>;
export type ModelEventPayload = z.infer<typeof modelEventSchema>;
export type AuditEventPayload = z.infer<typeof auditEventSchema>;
export type EventBundle = z.infer<typeof eventBundleSchema>;
export type RouteKey = z.infer<typeof routeKeySchema>;
export type AuditOutcome = z.infer<typeof auditOutcomeSchema>;

export function buildSafetyEvent(
  routeKey: z.infer<typeof safetyRouteKeySchema>,
  decision: SafetyDecision,
): SafetyEventPayload {
  return safetyEventSchema.parse({
    route_key: routeKey,
    risk_level: decision.risk.level,
    categories: decision.risk.categories,
    action_taken: decision.nextRecommendedAction,
    safety_state: decision.safetyState,
    response_source: decision.responseSource ?? "normal",
    policy_action: decision.policyMetadata.action,
    policy_categories: decision.policyMetadata.categories,
    signal_tags: decision.risk.signalTags ?? [],
    requires_crisis_response: decision.risk.requiresCrisisResponse,
    ai_triage_available: decision.aiTriage?.available ?? false,
    ai_triage_used: decision.aiTriage?.used ?? false,
    ai_triage_escalated: decision.aiTriage?.escalated ?? false,
    ai_triage_confidence: decision.aiTriage?.confidence ?? null,
    ai_triage_rationale_code: decision.aiTriage?.rationaleCode ?? null,
  });
}

export function buildModelEvent(input: {
  taskCode: z.infer<typeof modelTaskSchema>;
  sourceCode: "openai" | "fallback";
  modelIdentifier?: string | null;
  postValidationOutcomeCode?: z.infer<typeof postValidationOutcomeSchema> | null;
}): ModelEventPayload {
  return modelEventSchema.parse({
    task_code: input.taskCode,
    source_code: input.sourceCode,
    model_identifier:
      input.sourceCode === "openai"
        ? normalizeModelIdentifier(input.modelIdentifier)
        : null,
    fallback_reason_code:
      input.sourceCode === "fallback" ? "agent_fallback" : null,
    post_validation_outcome_code: input.postValidationOutcomeCode ?? null,
    store_disabled: true,
  });
}

export function buildAiTriageModelEvents(
  decisions: SafetyDecision[],
  modelIdentifier: string | null,
): ModelEventPayload[] {
  return decisions.flatMap((decision) =>
    decision.aiTriage?.used
      ? [
          buildModelEvent({
            taskCode: "ai_triage",
            sourceCode: "openai",
            modelIdentifier,
          }),
        ]
      : [],
  );
}

export function buildAuditEvent(
  routeKey: RouteKey,
  outcomeCode: AuditOutcome,
): AuditEventPayload {
  return auditEventSchema.parse({
    event_type: "authorized_session_action",
    route_key: routeKey,
    outcome_code: outcomeCode,
    error_code: null,
  });
}

export function buildEventBundle(input: {
  safetyEvents?: SafetyEventPayload[];
  modelEvents?: ModelEventPayload[];
  auditEvent: AuditEventPayload;
}): EventBundle {
  return parseEventBundle({
    safety_events: input.safetyEvents ?? [],
    model_events: input.modelEvents ?? [],
    audit_event: input.auditEvent,
  });
}

export function parseEventBundle(value: unknown): EventBundle {
  return eventBundleSchema.parse(value);
}

export function getChatPostValidationOutcome(input: {
  blocked: boolean;
  reason?: string;
}): z.infer<typeof postValidationOutcomeSchema> {
  if (!input.blocked) {
    return "passed";
  }

  return postValidationOutcomeSchema.parse(`blocked_${input.reason}`);
}

function normalizeModelIdentifier(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/.test(normalized)
    ? normalized
    : null;
}
