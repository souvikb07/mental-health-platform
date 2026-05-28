import "server-only";

import { getOpenAiClient } from "@/lib/ai/openai-client";
import {
  buildContextIntakeInput,
  contextIntakeInstructions,
} from "@/lib/ai/context-intake/context-intake-prompt";
import { getFallbackContextIntake } from "@/lib/ai/context-intake/context-intake-fallback";
import {
  contextIntakeJsonSchema,
  parseContextIntakeResult,
  type ContextIntakeResult,
} from "@/lib/ai/context-intake/context-intake-schema";
import type { SessionContext } from "@/types/session-context";

type ContextIntakeClient = {
  responses: {
    create: (body: {
      model: string;
      instructions: string;
      input: ReturnType<typeof buildContextIntakeInput>;
      store: false;
      stream: false;
      max_output_tokens: number;
      temperature: number;
      text: {
        format: {
          type: "json_schema";
          name: string;
          strict: true;
          schema: typeof contextIntakeJsonSchema;
        };
      };
    }) => Promise<{ output_text?: string }>;
  };
};

export type ContextIntakeAgentResult = {
  contextIntake: ContextIntakeResult;
  source: "openai" | "fallback";
};

export async function generateContextIntake(
  sessionContext: SessionContext,
  options: {
    client?: ContextIntakeClient | null;
    model?: string | null;
    configured?: boolean;
  } = {},
): Promise<ContextIntakeAgentResult> {
  const model = options.model ?? getOpenAiContextIntakeModel();
  const client =
    options.client ?? (getOpenAiClient() as ContextIntakeClient | null);
  const configured =
    options.configured ?? Boolean(getOpenAiApiKey() && model && client);

  if (!configured || !model || !client) {
    return fallback(sessionContext);
  }

  try {
    const response = await client.responses.create({
      model,
      instructions: contextIntakeInstructions,
      input: buildContextIntakeInput({ sessionContext }),
      store: false,
      stream: false,
      max_output_tokens: 180,
      temperature: 0.3,
      text: {
        format: {
          type: "json_schema",
          name: "mindbridge_context_intake",
          strict: true,
          schema: contextIntakeJsonSchema,
        },
      },
    });
    const parsedJson = parseJson(response.output_text);
    const contextIntake = parseContextIntakeResult(parsedJson);

    if (!contextIntake) {
      return fallback(sessionContext);
    }

    return {
      contextIntake,
      source: "openai",
    };
  } catch {
    return fallback(sessionContext);
  }
}

export function getOpenAiContextIntakeModel() {
  return process.env.OPENAI_CONTEXT_INTAKE_MODEL?.trim() || null;
}

function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY?.trim() || null;
}

function fallback(sessionContext: SessionContext): ContextIntakeAgentResult {
  return {
    contextIntake: getFallbackContextIntake(sessionContext),
    source: "fallback",
  };
}

function parseJson(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}
