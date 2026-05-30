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

type OwnershipDependencies = {
  findOwnerByTokenHash?: typeof findAnonymousOwnerByTokenHash;
  findSessionByOwner?: typeof findOwnedSession;
  getEnvironment?: typeof getDataEnvironment;
};

export async function resolveOwnedSession(
  request: Request,
  sessionId: string,
  dependencies: OwnershipDependencies = {},
): Promise<OwnedSession | null> {
  if ((dependencies.getEnvironment ?? getDataEnvironment)().mode === "transient") {
    return null;
  }

  const token = getValidAnonymousOwnerToken(request);

  if (!token) {
    throw unauthorizedSession();
  }

  const owner = await (
    dependencies.findOwnerByTokenHash ?? findAnonymousOwnerByTokenHash
  )(sha256(token));

  if (!owner) {
    throw unauthorizedSession();
  }

  if (!isUuid(sessionId)) {
    throw sessionNotFound();
  }

  const session = await (
    dependencies.findSessionByOwner ?? findOwnedSession
  )(owner.id, sessionId);

  return { owner, session };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
