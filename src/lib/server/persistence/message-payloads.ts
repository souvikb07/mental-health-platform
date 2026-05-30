import "server-only";

import { z } from "zod";

import type { ContextIntakeResponse } from "@/lib/server/context-intake";
import type { ChatResponse } from "@/lib/server/chat";
import {
  decryptSensitiveJson,
  encryptSensitiveJson,
} from "@/lib/server/crypto/sensitive-data";
import { dataBackendUnavailable } from "@/lib/server/http/api-errors";
import type { EncryptedEnvelope } from "@/types/database";
import type { ApiChatMessage } from "@/types/risk";

const assistantMessageSchema = z.object({
  id: z.string(),
  role: z.literal("assistant"),
  content: z.string(),
  createdAt: z.string(),
});

const contextIntakeResponseSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("opener"),
      assistantMessage: assistantMessageSchema,
      source: z.enum(["openai", "fallback"]),
      contextIntake: z.unknown(),
    })
    .passthrough(),
  z
    .object({
      type: z.literal("safety"),
      assistantMessage: assistantMessageSchema,
      source: z.literal("safety"),
      risk: z.unknown(),
      safety: z.unknown(),
      resources: z.array(z.unknown()),
    })
    .passthrough(),
  z
    .object({
      type: z.literal("boundary"),
      assistantMessage: assistantMessageSchema,
      source: z.literal("boundary"),
      policyBoundary: z.unknown(),
    })
    .passthrough(),
]);

const chatResponseSchema = z
  .object({
    assistantMessage: assistantMessageSchema,
    risk: z.object({
      level: z.enum(["none", "low", "medium", "high", "imminent"]),
      categories: z.array(z.string()),
      requiresCrisisResponse: z.boolean(),
    }),
    nextRecommendedAction: z.enum([
      "continue_chat",
      "continue_with_supportive_nudge",
      "show_resources",
      "urgent_support",
    ]),
    mode: z.enum(["normal", "support", "crisis"]),
    safety: z.unknown(),
    resources: z.array(z.unknown()),
    source: z.enum(["openai", "fallback", "safety", "boundary"]),
  })
  .passthrough();

const persistedContextIntakeSchema = z.object({
  version: z.literal("context_intake_response.v1"),
  response: contextIntakeResponseSchema,
});

const persistedChatAssistantSchema = z.object({
  version: z.literal("chat_message.v1"),
  message: assistantMessageSchema,
  response: chatResponseSchema,
});

const userMessageSchema = z.object({
  id: z.string(),
  role: z.literal("user"),
  content: z.string(),
  createdAt: z.string(),
});

const persistedChatUserSchema = z.object({
  version: z.literal("chat_message.v1"),
  message: userMessageSchema,
});

export function encryptContextIntakeResponse(
  response: ContextIntakeResponse,
): EncryptedEnvelope {
  return encryptSensitiveJson({
    version: "context_intake_response.v1",
    response,
  });
}

export function decryptContextIntakeResponse(
  envelope: unknown,
): ContextIntakeResponse {
  try {
    return persistedContextIntakeSchema.parse(
      decryptSensitiveJson<unknown>(envelope),
    ).response as ContextIntakeResponse;
  } catch {
    throw dataBackendUnavailable();
  }
}

export function encryptChatUserMessage(
  message: ApiChatMessage & { role: "user" },
): EncryptedEnvelope {
  return encryptSensitiveJson({
    version: "chat_message.v1",
    message,
  });
}

export function encryptChatAssistantResponse(
  response: ChatResponse,
): EncryptedEnvelope {
  return encryptSensitiveJson({
    version: "chat_message.v1",
    message: response.assistantMessage,
    response,
  });
}

export function decryptChatAssistantResponse(envelope: unknown): ChatResponse {
  try {
    const payload = persistedChatAssistantSchema.parse(
      decryptSensitiveJson<unknown>(envelope),
    );

    if (payload.message.id !== payload.response.assistantMessage.id) {
      throw new Error("Persisted assistant payload is inconsistent.");
    }

    return payload.response as ChatResponse;
  } catch {
    throw dataBackendUnavailable();
  }
}

export function decryptChatUserMessage(
  envelope: unknown,
): ApiChatMessage & { role: "user" } {
  try {
    return persistedChatUserSchema.parse(
      decryptSensitiveJson<unknown>(envelope),
    ).message;
  } catch {
    throw dataBackendUnavailable();
  }
}
