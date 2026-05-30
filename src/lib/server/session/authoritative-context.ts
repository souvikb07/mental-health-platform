import "server-only";

import { z } from "zod";

import type { OwnedSessionReference } from "@/lib/db/repositories/sessions";
import { decryptSensitiveJson } from "@/lib/server/crypto/sensitive-data";
import { dataBackendUnavailable } from "@/lib/server/http/api-errors";
import { getMainConcernLabel } from "@/lib/session/session-context";
import type { SessionContext } from "@/types/session-context";

const onboardingPayloadSchema = z.object({
  version: z.literal("onboarding_context.v1"),
  ageBand: z.string().optional(),
  mainConcern: z.string().optional(),
  mainConcernText: z.string().optional(),
});

export function createAuthoritativeSessionContext(
  session: OwnedSessionReference,
  options: {
    transientContext?: SessionContext;
    includeTransientOptionalText?: boolean;
  } = {},
): SessionContext {
  const retainedPayload = getRetainedOnboardingPayload(session);
  const transientText =
    options.includeTransientOptionalText && !session.storageConsentAccepted
      ? options.transientContext?.mainConcernText?.trim() || undefined
      : undefined;

  return {
    sessionId: session.id,
    countryCode: session.countryCode,
    countryLabel: getCountryLabel(session.countryCode),
    ageConfirmed: true,
    consentAccepted: true,
    storageConsentAccepted: session.storageConsentAccepted,
    ageBand: retainedPayload?.ageBand,
    mainConcern: retainedPayload?.mainConcern,
    mainConcernCategory: session.mainConcernCategory,
    mainConcernLabel: getMainConcernLabel(session.mainConcernCategory),
    mainConcernText: retainedPayload?.mainConcernText ?? transientText,
  };
}

function getRetainedOnboardingPayload(session: OwnedSessionReference) {
  if (!session.storageConsentAccepted || !session.onboardingNoteEncrypted) {
    return undefined;
  }

  try {
    return onboardingPayloadSchema.parse(
      decryptSensitiveJson<unknown>(session.onboardingNoteEncrypted),
    );
  } catch {
    throw dataBackendUnavailable();
  }
}

function getCountryLabel(countryCode: OwnedSessionReference["countryCode"]) {
  if (countryCode === "US") {
    return "United States";
  }

  if (countryCode === "IN") {
    return "India";
  }

  return undefined;
}
