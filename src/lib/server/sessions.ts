import "server-only";

import {
  createOwnedAnonymousSession,
  type CreateOwnedAnonymousSessionInput,
} from "@/lib/db/repositories/sessions";
import { getDataEnvironment } from "@/lib/server/config/data-env";
import {
  encryptSensitiveJson,
  sha256,
} from "@/lib/server/crypto/sensitive-data";
import {
  createAnonymousOwnerToken,
  resolveAnonymousOwnerToken,
  serializeAnonymousOwnerCookie,
} from "@/lib/server/session/anonymous-session";
import {
  createSessionContext,
  normalizeCountryCode,
} from "@/lib/session/session-context";
import type { CreateSessionRequest } from "@/lib/validation/sessions";
import type { SessionContext } from "@/types/session-context";

export type CreateSessionResult = {
  sessionId: string;
  sessionContext: SessionContext;
  status: "created";
  storageConsentAccepted: boolean;
  serverOwned: boolean;
  expiresAt?: string;
};

export function createMockSession(
  request: CreateSessionRequest,
): CreateSessionResult {
  const sessionId = `mock_session_${Date.now()}`;

  return {
    sessionId,
    sessionContext: createSessionContext({
      sessionId,
      country: request.country,
      ageBand: request.ageBand,
      mainConcern: request.mainConcern,
      mainConcernCategory: request.mainConcernCategory,
      mainConcernText: request.mainConcernText,
      ageConfirmed: request.ageConfirmed,
      consentAccepted: request.consentAccepted,
      storageConsentAccepted: request.storageConsentAccepted ?? false,
    }),
    status: "created",
    storageConsentAccepted: request.storageConsentAccepted ?? false,
    serverOwned: false,
  };
}

type CreateSessionDependencies = {
  createOwnedSession?: (
    input: CreateOwnedAnonymousSessionInput,
  ) => ReturnType<typeof createOwnedAnonymousSession>;
  createOwnerToken?: () => string;
  encryptJson?: typeof encryptSensitiveJson;
  getEnvironment?: typeof getDataEnvironment;
};

export async function createSession(
  request: Request,
  input: CreateSessionRequest,
  dependencies: CreateSessionDependencies = {},
) {
  const environment = (dependencies.getEnvironment ?? getDataEnvironment)();

  if (environment.mode === "transient") {
    return { result: createMockSession(input) };
  }

  const token = resolveAnonymousOwnerToken(
    request,
    dependencies.createOwnerToken ?? createAnonymousOwnerToken,
  );
  const storageConsentAccepted = input.storageConsentAccepted ?? false;
  const onboardingPayload = createOnboardingPayload(input);
  const onboardingNoteEncrypted =
    storageConsentAccepted && onboardingPayload
      ? (dependencies.encryptJson ?? encryptSensitiveJson)(
          onboardingPayload,
          environment.encryptionKeyV1,
        )
      : null;
  const createdSession = await (
    dependencies.createOwnedSession ?? createOwnedAnonymousSession
  )({
    tokenHash: sha256(token),
    countryCode: normalizeCountryCode(input.country),
    mainConcernCategory: input.mainConcernCategory,
    storageConsentAccepted,
    onboardingNoteEncrypted,
  });
  const sessionContext = createSessionContext({
    sessionId: createdSession.sessionId,
    country: input.country,
    ageBand: input.ageBand,
    mainConcern: input.mainConcern,
    mainConcernCategory: input.mainConcernCategory,
    mainConcernText: input.mainConcernText,
    ageConfirmed: input.ageConfirmed,
    consentAccepted: input.consentAccepted,
    storageConsentAccepted: createdSession.storageConsentAccepted,
  });

  return {
    result: {
      sessionId: createdSession.sessionId,
      sessionContext,
      status: "created" as const,
      storageConsentAccepted: createdSession.storageConsentAccepted,
      serverOwned: true,
      expiresAt: createdSession.expiresAt,
    },
    setCookie: serializeAnonymousOwnerCookie(token),
  };
}

function createOnboardingPayload(input: CreateSessionRequest) {
  const payload = {
    version: "onboarding_context.v1" as const,
    ...(input.ageBand ? { ageBand: input.ageBand } : {}),
    ...(input.mainConcern ? { mainConcern: input.mainConcern } : {}),
    ...(input.mainConcernText ? { mainConcernText: input.mainConcernText } : {}),
  };

  return Object.keys(payload).length > 1 ? payload : null;
}
