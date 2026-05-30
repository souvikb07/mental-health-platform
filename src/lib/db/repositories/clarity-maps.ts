import "server-only";

import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { dataBackendUnavailable } from "@/lib/server/http/api-errors";
import type { SafetyState } from "@/lib/safety-core";
import type { EncryptedEnvelope } from "@/types/database";
import type { RiskLevel } from "@/types/risk";

export type ClarityMapClaim = {
  status: "claimed" | "in_progress" | "completed";
  mapEncrypted: EncryptedEnvelope | null;
};

export async function claimClarityMapGeneration(input: {
  ownerId: string;
  sessionId: string;
  transcriptFingerprint: string;
  leaseTokenHash: string;
}): Promise<ClarityMapClaim> {
  const client = getRequiredClient();
  const { data, error } = await client.rpc("claim_clarity_map_generation", {
    p_owner_id: input.ownerId,
    p_session_id: input.sessionId,
    p_transcript_fingerprint: input.transcriptFingerprint,
    p_lease_token_hash: input.leaseTokenHash,
  });

  if (error || !Array.isArray(data) || data.length !== 1) {
    throw dataBackendUnavailable();
  }

  return normalizeClaim(data[0]);
}

export async function persistClarityMapResult(input: {
  ownerId: string;
  sessionId: string;
  mapEncrypted: EncryptedEnvelope;
  source: string;
  schemaVersion: string;
  transcriptFingerprint: string | null;
  leaseTokenHash: string | null;
  riskLevel: RiskLevel | null;
  safetyState: SafetyState | null;
}): Promise<EncryptedEnvelope> {
  const client = getRequiredClient();
  const { data, error } = await client.rpc("persist_clarity_map_result", {
    p_owner_id: input.ownerId,
    p_session_id: input.sessionId,
    p_map_encrypted: input.mapEncrypted,
    p_source: input.source,
    p_schema_version: input.schemaVersion,
    p_transcript_fingerprint: input.transcriptFingerprint,
    p_lease_token_hash: input.leaseTokenHash,
    p_risk_level: input.riskLevel,
    p_safety_state: input.safetyState,
  });

  if (
    error ||
    !Array.isArray(data) ||
    data.length !== 1 ||
    !isRecord(data[0]?.map_encrypted)
  ) {
    throw dataBackendUnavailable();
  }

  return data[0].map_encrypted as EncryptedEnvelope;
}

export async function mergeOwnedSessionSafetyState(input: {
  ownerId: string;
  sessionId: string;
  riskLevel: RiskLevel | null;
  safetyState: SafetyState | null;
}) {
  const client = getRequiredClient();
  const { error } = await client.rpc("merge_owned_session_safety_state", {
    p_owner_id: input.ownerId,
    p_session_id: input.sessionId,
    p_risk_level: input.riskLevel,
    p_safety_state: input.safetyState,
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

function normalizeClaim(value: unknown): ClarityMapClaim {
  if (!isRecord(value)) {
    throw dataBackendUnavailable();
  }

  const status = value.claim_status;
  const mapEncrypted = value.map_encrypted;

  if (
    !["claimed", "in_progress", "completed"].includes(String(status)) ||
    (mapEncrypted !== null && !isRecord(mapEncrypted)) ||
    (status === "completed" && mapEncrypted === null) ||
    (status !== "completed" && mapEncrypted !== null)
  ) {
    throw dataBackendUnavailable();
  }

  return {
    status: status as ClarityMapClaim["status"],
    mapEncrypted: mapEncrypted as EncryptedEnvelope | null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
