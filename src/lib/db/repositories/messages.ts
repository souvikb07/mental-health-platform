import "server-only";

import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { dataBackendUnavailable } from "@/lib/server/http/api-errors";
import {
  decryptChatAssistantResponse,
  decryptContextIntakeResponse,
} from "@/lib/server/persistence/message-payloads";
import type { ChatResponse } from "@/lib/server/chat";
import type { ContextIntakeResponse } from "@/lib/server/context-intake";

export async function findPersistedContextIntakeResponse(
  sessionId: string,
): Promise<ContextIntakeResponse | null> {
  const client = getRequiredClient();
  const { data, error } = await client
    .from("messages")
    .select("content_encrypted")
    .eq("session_id", sessionId)
    .eq("source", "context_intake_result")
    .maybeSingle();

  if (error) {
    throw dataBackendUnavailable();
  }

  return data?.content_encrypted
    ? decryptContextIntakeResponse(data.content_encrypted)
    : null;
}

export async function findPersistedChatResponse(
  sessionId: string,
  clientMessageId: string,
): Promise<ChatResponse> {
  const client = getRequiredClient();
  const { data, error } = await client
    .from("messages")
    .select("content_encrypted")
    .eq("session_id", sessionId)
    .eq("reply_to_client_message_id", clientMessageId)
    .maybeSingle();

  if (error || !data?.content_encrypted) {
    throw dataBackendUnavailable();
  }

  return decryptChatAssistantResponse(data.content_encrypted);
}

function getRequiredClient() {
  const client = getSupabaseServerClient();

  if (!client) {
    throw dataBackendUnavailable();
  }

  return client;
}
