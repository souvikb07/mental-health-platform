import type { CreateSessionRequest } from "@/lib/validation/sessions";

export type CreateSessionResult = {
  sessionId: string;
  status: "created";
};

export function createMockSession(
  request: CreateSessionRequest,
): CreateSessionResult {
  void request;

  return {
    sessionId: `mock_session_${Date.now()}`,
    status: "created",
  };
}
