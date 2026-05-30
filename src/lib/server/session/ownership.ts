import "server-only";

import {
  findAnonymousOwnerByTokenHash,
  type AnonymousOwnerReference,
} from "@/lib/db/repositories/anonymous-owners";
import {
  findOwnedSession,
  type OwnedSessionReference,
} from "@/lib/db/repositories/sessions";
import { getDataEnvironment } from "@/lib/server/config/data-env";
import { sha256 } from "@/lib/server/crypto/sensitive-data";
import {
  sessionNotFound,
  unauthorizedSession,
} from "@/lib/server/http/api-errors";
import { getValidAnonymousOwnerToken } from "@/lib/server/session/anonymous-session";

export type OwnedSession = {
  owner: AnonymousOwnerReference;
  session: OwnedSessionReference;
};

export type ResolvedAnonymousOwner = AnonymousOwnerReference;

type OwnershipDependencies = {
  findOwnerByTokenHash?: typeof findAnonymousOwnerByTokenHash;
  findSessionByOwner?: typeof findOwnedSession;
  getEnvironment?: typeof getDataEnvironment;
};

export async function resolveAnonymousOwner(
  request: Request,
  dependencies: OwnershipDependencies = {},
): Promise<ResolvedAnonymousOwner | null> {
  if ((dependencies.getEnvironment ?? getDataEnvironment)().mode === "transient") {
    return null;
  }

  const owner = await resolveSupabaseAnonymousOwner(request, dependencies);

  if (!owner) {
    throw unauthorizedSession();
  }

  return owner;
}

export async function resolveAnonymousOwnerIfPresent(
  request: Request,
  dependencies: OwnershipDependencies = {},
): Promise<ResolvedAnonymousOwner | null> {
  if ((dependencies.getEnvironment ?? getDataEnvironment)().mode === "transient") {
    return null;
  }

  return resolveSupabaseAnonymousOwner(request, dependencies);
}

export async function resolveOwnedSession(
  request: Request,
  sessionId: string,
  dependencies: OwnershipDependencies = {},
): Promise<OwnedSession | null> {
  const owner = await resolveAnonymousOwner(request, dependencies);

  if (!owner) {
    return null;
  }

  if (!isUuid(sessionId)) {
    throw sessionNotFound();
  }

  const session = await (
    dependencies.findSessionByOwner ?? findOwnedSession
  )(owner.id, sessionId);

  return { owner, session };
}

async function resolveSupabaseAnonymousOwner(
  request: Request,
  dependencies: OwnershipDependencies,
) {
  const token = getValidAnonymousOwnerToken(request);

  if (!token) {
    return null;
  }

  return (dependencies.findOwnerByTokenHash ?? findAnonymousOwnerByTokenHash)(
    sha256(token),
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
