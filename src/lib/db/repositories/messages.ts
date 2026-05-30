import "server-only";

import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { dataBackendUnavailable } from "@/lib/server/http/api-errors";
import {
  decryptChatAssistantResponse,
  decryptChatUserMessage,
  decryptContextIntakeResponse,
} from "@/lib/server/persistence/message-payloads";
import type { ChatResponse } from "@/lib/server/chat";
import type { ContextIntakeResponse } from "@/lib/server/context-intake";
import type { ApiChatMessage } from "@/types/risk";

export type PersistedTranscript = {
  messages: ApiChatMessage[];
  messageRowIds: string[];
  hasChatUser: boolean;
};

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

export async function loadPersistedTranscript(
  sessionId: string,
): Promise<PersistedTranscript> {
  const client = getRequiredClient();
  const { data, error } = await client
    .from("messages")
    .select("id, source, content_encrypted")
    .eq("session_id", sessionId)
    .in("source", [
      "context_intake_result",
      "chat_user",
      "chat_openai",
      "chat_fallback",
      "chat_safety",
      "chat_boundary",
    ])
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error || !Array.isArray(data)) {
    throw dataBackendUnavailable();
  }

  const retained = data.map(normalizeTranscriptRow);

  return {
    messages: retained.map((row) => row.message),
    messageRowIds: retained.map((row) => row.id),
    hasChatUser: retained.some((row) => row.source === "chat_user"),
  };
}

function getRequiredClient() {
  const client = getSupabaseServerClient();

  if (!client) {
    throw dataBackendUnavailable();
  }

  return client;
}

function normalizeTranscriptRow(value: unknown) {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.source !== "string" ||
    !isRecord(value.content_encrypted)
  ) {
    throw dataBackendUnavailable();
  }

  if (value.source === "context_intake_result") {
    return {
      id: value.id,
      source: value.source,
      message: decryptContextIntakeResponse(value.content_encrypted)
        .assistantMessage,
    };
  }

  if (value.source === "chat_user") {
    return {
      id: value.id,
      source: value.source,
      message: decryptChatUserMessage(value.content_encrypted),
    };
  }

  if (
    ["chat_openai", "chat_fallback", "chat_safety", "chat_boundary"].includes(
      value.source,
    )
  ) {
    return {
      id: value.id,
      source: value.source,
      message: decryptChatAssistantResponse(value.content_encrypted)
        .assistantMessage,
    };
  }

  throw dataBackendUnavailable();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
