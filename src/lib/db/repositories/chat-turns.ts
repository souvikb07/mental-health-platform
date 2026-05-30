import "server-only";

import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { dataBackendUnavailable } from "@/lib/server/http/api-errors";
import type { EventBundle } from "@/lib/server/persistence/event-payloads";
import type { SafetyState } from "@/lib/safety-core";
import type { EncryptedEnvelope } from "@/types/database";
import type { RiskLevel } from "@/types/risk";

export type ChatTurnClaim = {
  status: "claimed" | "in_progress" | "completed";
  storageConsentAccepted: boolean;
  currentSafetyState: SafetyState | null;
};

export async function claimChatTurn(input: {
  ownerId: string;
  sessionId: string;
  clientMessageId: string;
  leaseTokenHash: string;
}): Promise<ChatTurnClaim> {
  const client = getRequiredClient();
  const { data, error } = await client.rpc("claim_chat_turn", {
    p_owner_id: input.ownerId,
    p_session_id: input.sessionId,
    p_client_message_id: input.clientMessageId,
    p_lease_token_hash: input.leaseTokenHash,
  });

  if (error || !Array.isArray(data) || data.length !== 1) {
    throw dataBackendUnavailable();
  }

  return normalizeClaim(data[0]);
}

export async function completeChatTurn(input: {
  ownerId: string;
  sessionId: string;
  clientMessageId: string;
  leaseTokenHash: string;
  userContentEncrypted: EncryptedEnvelope | null;
  assistantContentEncrypted: EncryptedEnvelope | null;
  assistantSource: string;
  riskLevel: RiskLevel;
  safetyState: SafetyState;
  userCreatedAt: string;
  assistantCreatedAt: string;
  eventBundle: EventBundle;
}) {
  const client = getRequiredClient();
  const { error } = await client.rpc("complete_chat_turn_with_events", {
    p_owner_id: input.ownerId,
    p_session_id: input.sessionId,
    p_client_message_id: input.clientMessageId,
    p_lease_token_hash: input.leaseTokenHash,
    p_user_content_encrypted: input.userContentEncrypted,
    p_assistant_content_encrypted: input.assistantContentEncrypted,
    p_assistant_source: input.assistantSource,
    p_risk_level: input.riskLevel,
    p_safety_state: input.safetyState,
    p_user_created_at: input.userCreatedAt,
    p_assistant_created_at: input.assistantCreatedAt,
    p_event_bundle: input.eventBundle,
  });

  if (error) {
    throw dataBackendUnavailable();
  }
}

export async function persistContextIntakeResult(input: {
  ownerId: string;
  sessionId: string;
  responseEncrypted: EncryptedEnvelope | null;
  riskLevel: RiskLevel | null;
  safetyState: SafetyState | null;
  eventBundle: EventBundle;
}): Promise<EncryptedEnvelope | null> {
  const client = getRequiredClient();
  const { data, error } = await client.rpc("persist_context_intake_result_with_events", {
    p_owner_id: input.ownerId,
    p_session_id: input.sessionId,
    p_response_encrypted: input.responseEncrypted,
    p_risk_level: input.riskLevel,
    p_safety_state: input.safetyState,
    p_event_bundle: input.eventBundle,
  });

  if (error || !Array.isArray(data) || data.length > 1) {
    throw dataBackendUnavailable();
  }

  return data[0]?.content_encrypted ?? null;
}

function getRequiredClient() {
  const client = getSupabaseServerClient();

  if (!client) {
    throw dataBackendUnavailable();
  }

  return client;
}

function normalizeClaim(value: unknown): ChatTurnClaim {
  if (!isRecord(value)) {
    throw dataBackendUnavailable();
  }

  const status = value.claim_status;
  const storageConsentAccepted = value.storage_consent_accepted;
  const currentSafetyState = value.current_safety_state;

  if (
    !["claimed", "in_progress", "completed"].includes(String(status)) ||
    typeof storageConsentAccepted !== "boolean" ||
    !isSafetyStateOrNull(currentSafetyState)
  ) {
    throw dataBackendUnavailable();
  }

  return {
    status: status as ChatTurnClaim["status"],
    storageConsentAccepted,
    currentSafetyState,
  };
}

function isSafetyStateOrNull(value: unknown): value is SafetyState | null {
  return (
    value === null ||
    [
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
    ].includes(String(value))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
