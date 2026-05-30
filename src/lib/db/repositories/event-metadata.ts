import "server-only";

import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { dataBackendUnavailable } from "@/lib/server/http/api-errors";
import type { EventBundle } from "@/lib/server/persistence/event-payloads";

export async function recordAuthorizedAuditEvent(input: {
  ownerId: string;
  sessionId: string;
  eventBundle: EventBundle;
}) {
  const client = getSupabaseServerClient();

  if (!client) {
    throw dataBackendUnavailable();
  }

  const { error } = await client.rpc("record_authorized_audit_event", {
    p_owner_id: input.ownerId,
    p_session_id: input.sessionId,
    p_event_bundle: input.eventBundle,
  });

  if (error) {
    throw dataBackendUnavailable();
  }
}
