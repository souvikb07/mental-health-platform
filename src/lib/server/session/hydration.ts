import "server-only";

import { findLatestHydratedClarityMap } from "@/lib/db/repositories/clarity-maps";
import { loadHydratedJourneyMessages } from "@/lib/db/repositories/messages";
import {
  findLatestOwnedSession,
  findOwnedSessionIfPresent,
} from "@/lib/db/repositories/sessions";
import { getDataEnvironment } from "@/lib/server/config/data-env";
import { enforceSessionsHydrateRateLimit } from "@/lib/server/rate-limit/enforce";
import { createAuthoritativeSessionContext } from "@/lib/server/session/authoritative-context";
import { resolveAnonymousOwnerIfPresent } from "@/lib/server/session/ownership";
import type { SessionHydrationResponse } from "@/types/session-hydration";

export async function hydrateAnonymousSession(
  request: Request,
  requestedSessionId?: string,
): Promise<SessionHydrationResponse> {
  if (getDataEnvironment().mode === "transient") {
    return { status: "unavailable" };
  }

  const owner = await resolveAnonymousOwnerIfPresent(request);

  if (!owner) {
    return { status: "empty" };
  }

  await enforceSessionsHydrateRateLimit(owner);

  const session = requestedSessionId
    ? await findOwnedSessionIfPresent(owner.id, requestedSessionId)
    : await findLatestOwnedSession(owner.id);

  if (!session) {
    return { status: "empty" };
  }

  const sessionContext = createAuthoritativeSessionContext(session);

  if (!session.storageConsentAccepted) {
    return {
      status: "hydrated",
      serverOwned: true,
      expiresAt: session.expiresAt,
      retainedContentHydrated: false,
      sessionContext,
      messages: [],
    };
  }

  const [messages, clarityMap] = await Promise.all([
    loadHydratedJourneyMessages(session.id),
    findLatestHydratedClarityMap(session.id),
  ]);

  return {
    status: "hydrated",
    serverOwned: true,
    expiresAt: session.expiresAt,
    retainedContentHydrated: true,
    sessionContext,
    messages,
    ...(clarityMap ? { clarityMap } : {}),
  };
}
