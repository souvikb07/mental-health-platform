import "server-only";

import { z } from "zod";

import {
  decryptSensitiveJson,
  encryptSensitiveJson,
} from "@/lib/server/crypto/sensitive-data";
import { dataBackendUnavailable } from "@/lib/server/http/api-errors";
import type { EncryptedEnvelope } from "@/types/database";

const persistedFeedbackCommentSchema = z.object({
  version: z.literal("feedback_comment.v1"),
  comment: z.string(),
});

export function encryptFeedbackComment(comment: string): EncryptedEnvelope {
  return encryptSensitiveJson({
    version: "feedback_comment.v1",
    comment,
  });
}

export function decryptFeedbackComment(envelope: unknown) {
  try {
    return persistedFeedbackCommentSchema.parse(
      decryptSensitiveJson<unknown>(envelope),
    ).comment;
  } catch {
    throw dataBackendUnavailable();
  }
}
