import "server-only";

import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { dataBackendUnavailable } from "@/lib/server/http/api-errors";
import type { EncryptedEnvelope } from "@/types/database";

export async function persistFeedback(input: {
  ownerId: string;
  sessionId: string;
  clarityRating: number;
  helpfulnessRating: number;
  feltSafe: boolean | null;
  unsafeOrUnhelpful: boolean;
  commentEncrypted: EncryptedEnvelope | null;
}) {
  const client = getSupabaseServerClient();

  if (!client) {
    throw dataBackendUnavailable();
  }

  const { error } = await client.rpc("persist_feedback", {
    p_owner_id: input.ownerId,
    p_session_id: input.sessionId,
    p_clarity_rating: input.clarityRating,
    p_helpfulness_rating: input.helpfulnessRating,
    p_felt_safe: input.feltSafe,
    p_unsafe_or_unhelpful: input.unsafeOrUnhelpful,
    p_comment_encrypted: input.commentEncrypted,
  });

  if (error) {
    throw dataBackendUnavailable();
  }
}
