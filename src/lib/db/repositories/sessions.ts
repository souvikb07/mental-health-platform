import "server-only";

import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import type { EncryptedEnvelope } from "@/types/database";
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
