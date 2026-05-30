import "server-only";

import { persistFeedback } from "@/lib/db/repositories/feedback";
import { encryptFeedbackComment } from "@/lib/server/persistence/feedback-payloads";
import {
  buildAuditEvent,
  buildEventBundle,
} from "@/lib/server/persistence/event-payloads";
import type { OwnedSession } from "@/lib/server/session/ownership";
import type { FeedbackRequest } from "@/lib/validation/feedback";

export type FeedbackResult = {
  status: "received";
};

export function receiveMockFeedback(request: FeedbackRequest): FeedbackResult {
  void request;

  return {
    status: "received",
  };
}

export async function receivePersistedFeedback(
  request: FeedbackRequest,
  owned: OwnedSession,
): Promise<FeedbackResult> {
  const comment = request.comment?.trim();

  await persistFeedback({
    ownerId: owned.owner.id,
    sessionId: owned.session.id,
    clarityRating: request.clarityRating,
    helpfulnessRating: request.helpfulnessRating,
    feltSafe: request.feltSafe ?? null,
    unsafeOrUnhelpful: request.unsafeOrUnhelpful ?? false,
    commentEncrypted:
      owned.session.storageConsentAccepted && comment
        ? encryptFeedbackComment(comment)
        : null,
    eventBundle: buildEventBundle({
      auditEvent: buildAuditEvent("api/feedback", "received"),
    }),
  });

  return {
    status: "received",
  };
}
