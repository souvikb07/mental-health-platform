import "server-only";

import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import {
  dataBackendUnavailable,
  sessionNotFound,
} from "@/lib/server/http/api-errors";
import type { EncryptedEnvelope } from "@/types/database";
import type { SafetyState } from "@/lib/safety-core";
import type { CountryCode, MainConcernCategory } from "@/types/session-context";

export const PRODUCT_BOUNDARY_POLICY_VERSION = "product_boundary.v1";
export const STORAGE_POLICY_VERSION = "sensitive_storage.v1";

export type CreateOwnedAnonymousSessionInput = {
  tokenHash: string;
  countryCode: CountryCode;
  mainConcernCategory: MainConcernCategory;
  storageConsentAccepted: boolean;
  onboardingNoteEncrypted: EncryptedEnvelope | null;
};

export type CreatedOwnedAnonymousSession = {
  ownerId: string;
  sessionId: string;
  storageConsentAccepted: boolean;
  createdAt: string;
  expiresAt: string;
};

export type OwnedSessionReference = {
  id: string;
  ownerId: string;
  expiresAt: string;
  storageConsentAccepted: boolean;
  currentSafetyState: SafetyState | null;
  countryCode: CountryCode;
  mainConcernCategory: MainConcernCategory;
  onboardingNoteEncrypted: EncryptedEnvelope | null;
};

export async function createOwnedAnonymousSession(
  input: CreateOwnedAnonymousSessionInput,
): Promise<CreatedOwnedAnonymousSession> {
  const client = getSupabaseServerClient();

  if (!client) {
    throw new Error("Supabase data backend is unavailable.");
  }

  const { data, error } = await client.rpc("create_anonymous_session", {
    p_token_hash: input.tokenHash,
    p_country_code: input.countryCode,
    p_main_concern_category: input.mainConcernCategory,
    p_storage_consent_accepted: input.storageConsentAccepted,
    p_onboarding_note_encrypted: input.onboardingNoteEncrypted,
  });

  if (error || !Array.isArray(data) || data.length !== 1) {
    throw new Error("Anonymous session creation failed.");
  }

  return normalizeCreatedSession(data[0]);
}

export async function findOwnedSession(
  ownerId: string,
  sessionId: string,
): Promise<OwnedSessionReference> {
  const session = await findOwnedSessionIfPresent(ownerId, sessionId);

  if (!session) {
    throw sessionNotFound();
  }

  return session;
}

export async function findOwnedSessionIfPresent(
  ownerId: string,
  sessionId: string,
): Promise<OwnedSessionReference | null> {
  const client = getSupabaseServerClient();

  if (!client) {
    throw dataBackendUnavailable();
  }

  const { data, error } = await client
    .from("sessions")
    .select(
      "id, owner_id, expires_at, storage_consent_accepted, current_safety_state, country_code, main_concern_category, onboarding_note_encrypted",
    )
    .eq("owner_id", ownerId)
    .eq("id", sessionId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    throw dataBackendUnavailable();
  }

  return data ? normalizeOwnedSession(data) : null;
}

export async function findLatestOwnedSession(
  ownerId: string,
): Promise<OwnedSessionReference | null> {
  const client = getSupabaseServerClient();

  if (!client) {
    throw dataBackendUnavailable();
  }

  const { data, error } = await client
    .from("sessions")
    .select(
      "id, owner_id, expires_at, storage_consent_accepted, current_safety_state, country_code, main_concern_category, onboarding_note_encrypted",
    )
    .eq("owner_id", ownerId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw dataBackendUnavailable();
  }

  return data ? normalizeOwnedSession(data) : null;
}

function normalizeCreatedSession(value: unknown): CreatedOwnedAnonymousSession {
  if (!isRecord(value)) {
    throw new Error("Anonymous session creation failed.");
  }

  const ownerId = value.owner_id;
  const sessionId = value.session_id;
  const storageConsentAccepted = value.storage_consent_accepted;
  const createdAt = value.created_at;
  const expiresAt = value.expires_at;

  if (
    typeof ownerId !== "string" ||
    typeof sessionId !== "string" ||
    typeof storageConsentAccepted !== "boolean" ||
    !isValidTimestamp(createdAt) ||
    !isValidTimestamp(expiresAt)
  ) {
    throw new Error("Anonymous session creation failed.");
  }

  return {
    ownerId,
    sessionId,
    storageConsentAccepted,
    createdAt,
    expiresAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function normalizeOwnedSession(value: unknown): OwnedSessionReference {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.owner_id !== "string" ||
    !isValidTimestamp(value.expires_at) ||
    typeof value.storage_consent_accepted !== "boolean" ||
    !isSafetyStateOrNull(value.current_safety_state) ||
    !isCountryCode(value.country_code) ||
    !isMainConcernCategory(value.main_concern_category) ||
    !isEncryptedEnvelopeOrNull(value.onboarding_note_encrypted)
  ) {
    throw dataBackendUnavailable();
  }

  return {
    id: value.id,
    ownerId: value.owner_id,
    expiresAt: value.expires_at,
    storageConsentAccepted: value.storage_consent_accepted,
    currentSafetyState: value.current_safety_state,
    countryCode: value.country_code,
    mainConcernCategory: value.main_concern_category,
    onboardingNoteEncrypted: value.onboarding_note_encrypted,
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

function isCountryCode(value: unknown): value is CountryCode {
  return value === "US" || value === "IN" || value === "GLOBAL";
}

function isMainConcernCategory(value: unknown): value is MainConcernCategory {
  return [
    "overwhelmed",
    "anxious_worried",
    "low_numb_disconnected",
    "work_study_stress",
    "relationship_family",
    "sleep_energy",
    "not_sure",
  ].includes(String(value));
}

function isEncryptedEnvelopeOrNull(
  value: unknown,
): value is EncryptedEnvelope | null {
  return value === null || isRecord(value);
}
