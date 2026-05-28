import "server-only";

import { getOpenAiClient } from "@/lib/ai/openai-client";
import {
  buildTriageInput,
  triageInstructions,
  type TriagePromptInput,
} from "@/lib/ai/triage/triage-prompt";
import {
  parseTriageSignal,
  triageJsonSchema,
  type TriageSignal,
} from "@/lib/ai/triage/triage-schema";
import {
  unavailableTriage,
  type TriageUnavailableResult,
} from "@/lib/ai/triage/triage-fallback";

type TriageResponsesClient = {
  responses: {
    create: (body: {
      model: string;
      instructions: string;
      input: ReturnType<typeof buildTriageInput>;
      store: false;
      stream: false;
      max_output_tokens: number;
      temperature: number;
      text: {
        format: {
          type: "json_schema";
          name: string;
          strict: true;
          schema: typeof triageJsonSchema;
        };
      };
    }) => Promise<{ output_text?: string }>;
  };
};

export type AiTriageResult =
  | {
      available: true;
      signal: TriageSignal;
    }
  | TriageUnavailableResult;

export async function classifyWithAiTriage(
  input: TriagePromptInput,
  options: {
    client?: TriageResponsesClient | null;
    model?: string | null;
    configured?: boolean;
  } = {},
): Promise<AiTriageResult> {
  const model = options.model ?? getOpenAiTriageModel();
  const client =
    options.client ?? (getOpenAiClient() as TriageResponsesClient | null);
  const configured =
    options.configured ?? Boolean(getOpenAiApiKey() && model && client);

  if (!configured || !model || !client) {
    return unavailableTriage("missing_config");
  }

  try {
    const response = await client.responses.create({
      model,
      instructions: triageInstructions,
      input: buildTriageInput(input),
      store: false,
      stream: false,
      max_output_tokens: 220,
      temperature: 0,
      text: {
        format: {
          type: "json_schema",
          name: "mindbridge_safety_triage",
          strict: true,
          schema: triageJsonSchema,
        },
      },
    });
    const parsedJson = parseJson(response.output_text);
    const signal = parseTriageSignal(parsedJson);

    if (!signal) {
      return unavailableTriage("invalid_output");
    }

    return {
      available: true,
      signal,
    };
  } catch {
    return unavailableTriage("api_error");
  }
}

export function getOpenAiTriageModel() {
  return process.env.OPENAI_TRIAGE_MODEL?.trim() || null;
}

function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY?.trim() || null;
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
