import "server-only";

import type { RateLimitSubjectKind } from "@/lib/db/repositories/rate-limits";

export type RateLimitPolicy = {
  routeKey: string;
  subjectKind: RateLimitSubjectKind;
  windowSeconds: number;
  limit: number;
};

export const SESSION_CREATION_RATE_LIMIT = {
  routeKey: "api.sessions.create",
  subjectKind: "ip_hmac",
  windowSeconds: 60 * 60,
  limit: 10,
} as const satisfies RateLimitPolicy;

export const CONTEXT_INTAKE_RATE_LIMIT = {
  routeKey: "api.context_intake",
  subjectKind: "owner_hmac",
  windowSeconds: 60 * 60,
  limit: 10,
} as const satisfies RateLimitPolicy;

export const CHAT_RATE_LIMIT = {
  routeKey: "api.chat",
  subjectKind: "owner_hmac",
  windowSeconds: 10 * 60,
  limit: 30,
} as const satisfies RateLimitPolicy;

export const CLARITY_MAP_RATE_LIMIT = {
  routeKey: "api.clarity_map",
  subjectKind: "owner_hmac",
  windowSeconds: 60 * 60,
  limit: 5,
} as const satisfies RateLimitPolicy;

export const FEEDBACK_RATE_LIMIT = {
  routeKey: "api.feedback",
  subjectKind: "owner_hmac",
  windowSeconds: 60 * 60,
  limit: 10,
} as const satisfies RateLimitPolicy;

export const SESSIONS_EXPORT_RATE_LIMIT = {
  routeKey: "api.sessions.export",
  subjectKind: "owner_hmac",
  windowSeconds: 60 * 60,
  limit: 5,
} as const satisfies RateLimitPolicy;

export const SESSIONS_DELETE_RATE_LIMIT = {
  routeKey: "api.sessions.delete",
  subjectKind: "owner_hmac",
  windowSeconds: 60 * 60,
  limit: 5,
} as const satisfies RateLimitPolicy;

export const SESSIONS_HYDRATE_RATE_LIMIT = {
  routeKey: "api.sessions.hydrate",
  subjectKind: "owner_hmac",
  windowSeconds: 60 * 60,
  limit: 30,
} as const satisfies RateLimitPolicy;

export const RESOURCES_RATE_LIMIT = {
  routeKey: "api.resources",
  subjectKind: "ip_hmac",
  windowSeconds: 10 * 60,
  limit: 120,
} as const satisfies RateLimitPolicy;

export const RESOURCES_FALLBACK_RATE_LIMIT = {
  routeKey: "api.resources_fallback",
  subjectKind: "ip_hmac",
  windowSeconds: 10 * 60,
  limit: 600,
} as const satisfies RateLimitPolicy;

export function resolveTrustedIpSource(
  env: NodeJS.ProcessEnv = process.env,
): "vercel" | null {
  const source = env.MIND_BRIDGE_TRUSTED_IP_SOURCE?.trim().toLowerCase();

  if (!source) {
    return null;
  }

  if (source !== "vercel") {
    throw new Error("MIND_BRIDGE_TRUSTED_IP_SOURCE must be vercel when configured.");
  }

  return source;
}
