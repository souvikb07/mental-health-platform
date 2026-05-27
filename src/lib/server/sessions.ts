import { createSessionContext } from "@/lib/session/session-context";
import type { CreateSessionRequest } from "@/lib/validation/sessions";
import type { SessionContext } from "@/types/session-context";

export type CreateSessionResult = {
  sessionId: string;
  sessionContext: SessionContext;
  status: "created";
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
    }),
    status: "created",
  };
}
