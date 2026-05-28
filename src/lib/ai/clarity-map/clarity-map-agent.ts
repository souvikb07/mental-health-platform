import "server-only";

import { getOpenAiClient } from "@/lib/ai/openai-client";
import {
  clarityMapJsonSchema,
  parseStructuredClarityMap,
} from "@/lib/ai/clarity-map/clarity-map-schema";
import {
  buildClarityMapInput,
  clarityMapInstructions,
} from "@/lib/ai/clarity-map/clarity-map-prompt";
import {
  getFallbackStructuredClarityMap,
  type ClarityMapFallbackInput,
} from "@/lib/ai/clarity-map/clarity-map-fallback";
import type { StructuredClarityMap } from "@/types/clarity-map";

type ClarityMapClient = {
  responses: {
    create: (body: {
      model: string;
      instructions: string;
      input: ReturnType<typeof buildClarityMapInput>;
      store: false;
      stream?: false;
      max_output_tokens: number;
      temperature: number;
      text: {
        format: {
          type: "json_schema";
          name: string;
          strict: true;
          schema: typeof clarityMapJsonSchema;
        };
      };
    }) => Promise<{ output_text?: string }>;
  };
};

export type ClarityMapAgentResult = {
  clarityMap: StructuredClarityMap;
  source: "openai" | "fallback";
};

export async function generateStructuredClarityMap(
  input: ClarityMapFallbackInput,
  options: {
    client?: ClarityMapClient | null;
    model?: string | null;
    configured?: boolean;
  } = {},
): Promise<ClarityMapAgentResult> {
  const model = options.model ?? getOpenAiClarityModel();
  const client = options.client ?? (getOpenAiClient() as ClarityMapClient | null);
  const configured =
    options.configured ?? Boolean(getOpenAiApiKey() && model && client);

  if (!configured || !model || !client) {
    return fallback(input);
  }

  try {
    const response = await client.responses.create({
      model,
      instructions: clarityMapInstructions,
      input: buildClarityMapInput(input),
      store: false,
      stream: false,
      max_output_tokens: 1600,
      temperature: 0.25,
      text: {
        format: {
          type: "json_schema",
          name: "mindbridge_clarity_map",
          strict: true,
          schema: clarityMapJsonSchema,
        },
      },
    });
    const parsedJson = parseJson(response.output_text);
    const clarityMap = parseStructuredClarityMap(parsedJson, {
      messages: input.messages.map(({ id, role }) => ({ id, role })),
    });

    if (!clarityMap) {
      return fallback(input);
    }

    return {
      clarityMap,
      source: "openai",
    };
  } catch {
    return fallback(input);
  }
}

export function getOpenAiClarityModel() {
  return process.env.OPENAI_CLARITY_MODEL?.trim() || null;
}

function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY?.trim() || null;
}

function fallback(input: ClarityMapFallbackInput): ClarityMapAgentResult {
  return {
    clarityMap: getFallbackStructuredClarityMap(input),
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
