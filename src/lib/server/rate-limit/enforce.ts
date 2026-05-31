import "server-only";

import {
  consumeRateLimit,
  type RateLimitResult,
} from "@/lib/db/repositories/rate-limits";
import { getDataEnvironment, type DataEnvironment } from "@/lib/server/config/data-env";
import { hmacSha256 } from "@/lib/server/crypto/sensitive-data";
import {
  dataBackendUnavailable,
  rateLimited,
} from "@/lib/server/http/api-errors";
import {
  CHAT_RATE_LIMIT,
  CLARITY_MAP_RATE_LIMIT,
  CONTEXT_INTAKE_RATE_LIMIT,
  FEEDBACK_RATE_LIMIT,
  RESOURCES_FALLBACK_RATE_LIMIT,
  RESOURCES_RATE_LIMIT,
  SESSIONS_DELETE_RATE_LIMIT,
  SESSIONS_EXPORT_RATE_LIMIT,
  SESSIONS_HYDRATE_RATE_LIMIT,
  SESSION_CREATION_RATE_LIMIT,
  type RateLimitPolicy,
} from "@/lib/server/rate-limit/config";
import { getTrustedVercelIpSubject } from "@/lib/server/rate-limit/trusted-subject";
import type {
  OwnedSession,
  ResolvedAnonymousOwner,
} from "@/lib/server/session/ownership";

const RESOURCES_FALLBACK_SUBJECT = "shared_resources_fallback";

type RateLimitDependencies = {
  consume?: typeof consumeRateLimit;
  getEnvironment?: () => DataEnvironment;
  getTrustedIpSubject?: (request: Request) => string | null;
  now?: () => number;
  nodeEnv?: string;
};

export async function enforceSessionCreationRateLimit(
  request: Request,
  dependencies: RateLimitDependencies = {},
) {
  const environment = getEnvironment(dependencies);

  if (environment.mode === "transient") {
    return;
  }

  const subject = getTrustedIpSubject(request, dependencies);

  if (!subject) {
    if ((dependencies.nodeEnv ?? process.env.NODE_ENV) === "production") {
      throw dataBackendUnavailable();
    }

    return;
  }

  await enforceRateLimit(
    SESSION_CREATION_RATE_LIMIT,
    "trusted_ip",
    subject,
    environment,
    dependencies,
  );
}

export async function enforceResourcesRateLimit(
  request: Request,
  dependencies: RateLimitDependencies = {},
) {
  const environment = getEnvironment(dependencies);

  if (environment.mode === "transient") {
    return;
  }

  const subject = getTrustedIpSubject(request, dependencies);

  if (subject) {
    await enforceRateLimit(
      RESOURCES_RATE_LIMIT,
      "trusted_ip",
      subject,
      environment,
      dependencies,
    );
    return;
  }

  if ((dependencies.nodeEnv ?? process.env.NODE_ENV) !== "production") {
    return;
  }

  await enforceRateLimit(
    RESOURCES_FALLBACK_RATE_LIMIT,
    "resources_fallback",
    RESOURCES_FALLBACK_SUBJECT,
    environment,
    dependencies,
  );
}

export async function enforceContextIntakeRateLimit(
  owned: OwnedSession | null,
  dependencies: RateLimitDependencies = {},
) {
  await enforceOwnedSessionRateLimit(
    CONTEXT_INTAKE_RATE_LIMIT,
    owned,
    dependencies,
  );
}

export async function enforceChatRateLimit(
  owned: OwnedSession | null,
  dependencies: RateLimitDependencies = {},
) {
  await enforceOwnedSessionRateLimit(CHAT_RATE_LIMIT, owned, dependencies);
}

export async function enforceClarityMapRateLimit(
  owned: OwnedSession | null,
  dependencies: RateLimitDependencies = {},
) {
  await enforceOwnedSessionRateLimit(CLARITY_MAP_RATE_LIMIT, owned, dependencies);
}

export async function enforceFeedbackRateLimit(
  owned: OwnedSession | null,
  dependencies: RateLimitDependencies = {},
) {
  await enforceOwnedSessionRateLimit(FEEDBACK_RATE_LIMIT, owned, dependencies);
}

export async function enforceSessionsExportRateLimit(
  owner: ResolvedAnonymousOwner,
  dependencies: RateLimitDependencies = {},
) {
  await enforceOwnerRateLimit(SESSIONS_EXPORT_RATE_LIMIT, owner, dependencies);
}

export async function enforceSessionsDeleteRateLimit(
  owner: ResolvedAnonymousOwner,
  dependencies: RateLimitDependencies = {},
) {
  await enforceOwnerRateLimit(SESSIONS_DELETE_RATE_LIMIT, owner, dependencies);
}

export async function enforceSessionsHydrateRateLimit(
  owner: ResolvedAnonymousOwner,
  dependencies: RateLimitDependencies = {},
) {
  await enforceOwnerRateLimit(SESSIONS_HYDRATE_RATE_LIMIT, owner, dependencies);
}

export function buildRateLimitBucketKey(input: {
  policy: RateLimitPolicy;
  subjectScope: string;
  subject: string;
  nowMs: number;
  encodedKey: string;
}) {
  const fixedWindowIndex = Math.floor(
    input.nowMs / 1000 / input.policy.windowSeconds,
  );

  return hmacSha256(
    [
      "mindbridge-rate-limit.v1",
      input.policy.routeKey,
      input.subjectScope,
      String(input.policy.windowSeconds),
      String(fixedWindowIndex),
      input.subject,
    ].join("\n"),
    input.encodedKey,
  );
}

async function enforceOwnedSessionRateLimit(
  policy: RateLimitPolicy,
  owned: OwnedSession | null,
  dependencies: RateLimitDependencies,
) {
  const environment = getEnvironment(dependencies);

  if (environment.mode === "transient") {
    return;
  }

  if (!owned) {
    throw dataBackendUnavailable();
  }

  await enforceRateLimit(
    policy,
    "owner_session",
    `${owned.owner.id}:${owned.session.id}`,
    environment,
    dependencies,
  );
}

async function enforceOwnerRateLimit(
  policy: RateLimitPolicy,
  owner: ResolvedAnonymousOwner,
  dependencies: RateLimitDependencies,
) {
  const environment = getEnvironment(dependencies);

  if (environment.mode === "transient") {
    return;
  }

  await enforceRateLimit(
    policy,
    "owner",
    owner.id,
    environment,
    dependencies,
  );
}

async function enforceRateLimit(
  policy: RateLimitPolicy,
  subjectScope: string,
  subject: string,
  environment: Extract<DataEnvironment, { mode: "supabase" }>,
  dependencies: RateLimitDependencies,
) {
  const result: RateLimitResult = await (
    dependencies.consume ?? consumeRateLimit
  )({
    routeKey: policy.routeKey,
    subjectKind: policy.subjectKind,
    bucketKey: buildRateLimitBucketKey({
      policy,
      subjectScope,
      subject,
      nowMs: (dependencies.now ?? Date.now)(),
      encodedKey: environment.rateLimitHmacKey,
    }),
    windowSeconds: policy.windowSeconds,
    limit: policy.limit,
  });

  if (!result.allowed) {
    throw rateLimited(result.retryAfterSeconds);
  }
}

function getEnvironment(dependencies: RateLimitDependencies) {
  return (dependencies.getEnvironment ?? getDataEnvironment)();
}

function getTrustedIpSubject(
  request: Request,
  dependencies: RateLimitDependencies,
) {
  return (dependencies.getTrustedIpSubject ?? getTrustedVercelIpSubject)(request);
}
