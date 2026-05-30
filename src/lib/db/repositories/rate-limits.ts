import "server-only";

import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { dataBackendUnavailable } from "@/lib/server/http/api-errors";

export type RateLimitSubjectKind = "owner_hmac" | "ip_hmac";

export type ConsumeRateLimitInput = {
  routeKey: string;
  subjectKind: RateLimitSubjectKind;
  bucketKey: string;
  windowSeconds: number;
  limit: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export async function consumeRateLimit(
  input: ConsumeRateLimitInput,
): Promise<RateLimitResult> {
  const client = getSupabaseServerClient();

  if (!client) {
    throw dataBackendUnavailable();
  }

  const { data, error } = await client.rpc("consume_rate_limit", {
    p_route_key: input.routeKey,
    p_subject_kind: input.subjectKind,
    p_bucket_key: input.bucketKey,
    p_window_seconds: input.windowSeconds,
    p_limit: input.limit,
  });

  if (error || !Array.isArray(data) || data.length !== 1) {
    throw dataBackendUnavailable();
  }

  return normalizeRateLimitResult(data[0]);
}

function normalizeRateLimitResult(value: unknown): RateLimitResult {
  if (
    !isRecord(value) ||
    typeof value.allowed !== "boolean" ||
    !Number.isInteger(value.retry_after_seconds) ||
    (value.retry_after_seconds as number) < 1
  ) {
    throw dataBackendUnavailable();
  }

  return {
    allowed: value.allowed,
    retryAfterSeconds: value.retry_after_seconds as number,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
