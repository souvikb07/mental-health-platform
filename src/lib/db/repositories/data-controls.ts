import "server-only";

import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { dataBackendUnavailable } from "@/lib/server/http/api-errors";

export type AnonymousOwnerExportRows = {
  sessions: unknown[];
  consentEvents: unknown[];
  messages: unknown[];
  clarityMaps: unknown[];
  feedback: unknown[];
  safetyEvents: unknown[];
  modelEvents: unknown[];
  auditEvents: unknown[];
};

export async function loadAnonymousOwnerExportRows(
  ownerId: string,
): Promise<AnonymousOwnerExportRows> {
  const client = getRequiredClient();
  const sessions = await readRows(
    client
      .from("sessions")
      .select(
        "id, created_at, expires_at, storage_consent_accepted, storage_policy_version, country_code, main_concern_category, current_risk_level, current_safety_state, onboarding_note_encrypted",
      )
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: true }),
  );
  const sessionIds = sessions.map(getSessionId);
  const ownerEvents = await Promise.all([
    readRows(
      client
        .from("model_events")
        .select(
          "session_id, task_code, source_code, model_identifier, fallback_reason_code, post_validation_outcome_code, store_disabled, created_at",
        )
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: true }),
    ),
    readRows(
      client
        .from("audit_events")
        .select(
          "session_id, event_type, route_key, outcome_code, error_code, created_at",
        )
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: true }),
    ),
  ]);

  if (sessionIds.length === 0) {
    return {
      sessions,
      consentEvents: [],
      messages: [],
      clarityMaps: [],
      feedback: [],
      safetyEvents: [],
      modelEvents: ownerEvents[0],
      auditEvents: ownerEvents[1],
    };
  }

  const [
    consentEvents,
    messages,
    clarityMaps,
    feedback,
    safetyEvents,
  ] = await Promise.all([
    readRows(
      client
        .from("consent_events")
        .select("session_id, consent_type, policy_version, accepted, created_at")
        .eq("owner_id", ownerId)
        .in("session_id", sessionIds)
        .order("created_at", { ascending: true }),
    ),
    readRows(
      client
        .from("messages")
        .select("session_id, source, content_encrypted, created_at")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: true }),
    ),
    readRows(
      client
        .from("clarity_maps")
        .select("session_id, source, schema_version, map_encrypted, created_at")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: true }),
    ),
    readRows(
      client
        .from("feedback")
        .select(
          "session_id, clarity_rating, helpfulness_rating, felt_safe, unsafe_or_unhelpful, comment_encrypted, created_at",
        )
        .in("session_id", sessionIds)
        .order("created_at", { ascending: true }),
    ),
    readRows(
      client
        .from("safety_events")
        .select(
          "session_id, route_key, risk_level, categories, action_taken, safety_state, response_source, policy_action, policy_categories, signal_tags, requires_crisis_response, ai_triage_available, ai_triage_used, ai_triage_escalated, ai_triage_confidence, ai_triage_rationale_code, created_at",
        )
        .eq("owner_id", ownerId)
        .in("session_id", sessionIds)
        .order("created_at", { ascending: true }),
    ),
  ]);

  return {
    sessions,
    consentEvents,
    messages,
    clarityMaps,
    feedback,
    safetyEvents,
    modelEvents: ownerEvents[0],
    auditEvents: ownerEvents[1],
  };
}

export async function deleteAnonymousOwnerData(ownerId: string) {
  const client = getRequiredClient();
  const { error } = await client.rpc("delete_anonymous_owner_data", {
    p_owner_id: ownerId,
  });

  if (error) {
    throw dataBackendUnavailable();
  }
}

function getRequiredClient() {
  const client = getSupabaseServerClient();

  if (!client) {
    throw dataBackendUnavailable();
  }

  return client;
}

async function readRows(
  query: PromiseLike<{ data: unknown; error: unknown }>,
): Promise<unknown[]> {
  const { data, error } = await query;

  if (error || !Array.isArray(data)) {
    throw dataBackendUnavailable();
  }

  return data;
}

function getSessionId(value: unknown) {
  if (!isRecord(value) || typeof value.id !== "string") {
    throw dataBackendUnavailable();
  }

  return value.id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
