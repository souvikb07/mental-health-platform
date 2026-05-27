import "server-only";

import { buildConversationInput, conversationInstructions } from "@/lib/ai/conversation-prompt";
import { getFallbackConversationReply } from "@/lib/ai/fallbacks";
import {
  getOpenAiClient,
  getOpenAiModel,
  hasOpenAiConfig,
} from "@/lib/ai/openai-client";
import type { ApiRiskClassification } from "@/types/risk";

type ResponsesClient = {
  responses: {
    create: (body: {
      model: string;
      instructions: string;
      input: ReturnType<typeof buildConversationInput>;
      store: false;
      stream: false;
      max_output_tokens: number;
      temperature: number;
    }) => Promise<{ output_text?: string }>;
  };
};

export type ConversationAgentInput = {
  message: string;
  risk: ApiRiskClassification;
};

export type ConversationAgentResult = {
  content: string;
  source: "openai" | "fallback";
};

export async function generateConversationReply(
  input: ConversationAgentInput,
  options: {
    client?: ResponsesClient | null;
    model?: string | null;
    configured?: boolean;
  } = {},
): Promise<ConversationAgentResult> {
  const configured = options.configured ?? hasOpenAiConfig();
  const model = options.model ?? getOpenAiModel();
  const client = options.client ?? getOpenAiClient();

  if (!configured || !model || !client) {
    return fallback(input);
  }

  try {
    const response = await client.responses.create({
      model,
      instructions: conversationInstructions,
      input: buildConversationInput({
        message: input.message,
        riskLevel: input.risk.level,
        categories: input.risk.categories,
      }),
      store: false,
      stream: false,
      max_output_tokens: 180,
      temperature: 0.4,
    });
    const content = response.output_text?.trim();

    if (!content) {
      return fallback(input);
    }

    return {
      content,
      source: "openai",
    };
  } catch {
    return fallback(input);
  }
}

function fallback(input: ConversationAgentInput): ConversationAgentResult {
  return {
    content: getFallbackConversationReply(input),
    source: "fallback",
  };
}
