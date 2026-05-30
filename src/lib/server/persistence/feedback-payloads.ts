import "server-only";

import { encryptSensitiveJson } from "@/lib/server/crypto/sensitive-data";
import type { EncryptedEnvelope } from "@/types/database";

export function encryptFeedbackComment(comment: string): EncryptedEnvelope {
  return encryptSensitiveJson({
    version: "feedback_comment.v1",
    comment,
  });
}
