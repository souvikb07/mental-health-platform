import "server-only";

import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { dataBackendUnavailable } from "@/lib/server/http/api-errors";

export type AnonymousOwnerReference = {
  id: string;
};

export async function findAnonymousOwnerByTokenHash(
  tokenHash: string,
): Promise<AnonymousOwnerReference | null> {
  if (!/^[0-9a-f]{64}$/.test(tokenHash)) {
    throw dataBackendUnavailable();
  }

  const client = getSupabaseServerClient();

  if (!client) {
    throw dataBackendUnavailable();
  }

  const { data, error } = await client
    .from("anonymous_owners")
    .select("id")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    throw dataBackendUnavailable();
  }

  return data ? normalizeAnonymousOwner(data) : null;
}

function normalizeAnonymousOwner(value: unknown): AnonymousOwnerReference {
  if (!isRecord(value) || typeof value.id !== "string") {
    throw dataBackendUnavailable();
  }

  return { id: value.id };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
