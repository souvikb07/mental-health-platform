import "server-only";

import { z } from "zod";

import { parseStructuredClarityMap } from "@/lib/ai/clarity-map/clarity-map-schema";
import type { EnhancedClarityMapResponse } from "@/lib/server/clarity-map";
import {
  decryptSensitiveJson,
  encryptSensitiveJson,
} from "@/lib/server/crypto/sensitive-data";
import { dataBackendUnavailable } from "@/lib/server/http/api-errors";
import type { EncryptedEnvelope } from "@/types/database";
import type { ApiChatMessage } from "@/types/risk";

type GeneratedClarityMapResponse = Extract<
  EnhancedClarityMapResponse,
  { type: "clarity_map" }
>;

const persistedClarityMapSchema = z.object({
  version: z.literal("clarity_map_response.v1"),
  response: z.object({
    type: z.literal("clarity_map"),
    source: z.enum(["openai", "fallback"]),
    clarityMap: z.unknown(),
  }),
});

export function encryptClarityMapResponse(
  response: GeneratedClarityMapResponse,
): EncryptedEnvelope {
  return encryptSensitiveJson({
    version: "clarity_map_response.v1",
    response,
  });
}

export function decryptClarityMapResponse(
  envelope: unknown,
  messages: ApiChatMessage[],
): GeneratedClarityMapResponse {
  try {
    const payload = persistedClarityMapSchema.parse(
      decryptSensitiveJson<unknown>(envelope),
    );
    const clarityMap = parseStructuredClarityMap(payload.response.clarityMap, {
      messages: messages.map(({ id, role }) => ({ id, role })),
    });

    if (!clarityMap || clarityMap.status !== "generated") {
      throw new Error("Retained Clarity Map payload is invalid.");
    }

    return {
      type: "clarity_map",
      source: payload.response.source,
      clarityMap,
    };
  } catch {
    throw dataBackendUnavailable();
  }
}

export function decryptClarityMapResponseForExport(
  envelope: unknown,
): GeneratedClarityMapResponse {
  try {
    const payload = persistedClarityMapSchema.parse(
      decryptSensitiveJson<unknown>(envelope),
    );
    const evidenceMessageIds = getEvidenceMessageIds(
      payload.response.clarityMap,
    );
    const clarityMap = parseStructuredClarityMap(payload.response.clarityMap, {
      messages: evidenceMessageIds.map((id) => ({ id, role: "user" })),
    });

    if (!clarityMap || clarityMap.status !== "generated") {
      throw new Error("Retained Clarity Map payload is invalid.");
    }

    return {
      type: "clarity_map",
      source: payload.response.source,
      clarityMap,
    };
  } catch {
    throw dataBackendUnavailable();
  }
}

function getEvidenceMessageIds(value: unknown) {
  if (
    !isRecord(value) ||
    !isRecord(value.keyInsight) ||
    !Array.isArray(value.keyInsight.evidence)
  ) {
    return [];
  }

  return [
    ...new Set(
      value.keyInsight.evidence.flatMap((item) =>
        isRecord(item) && Array.isArray(item.evidenceMessageIds)
          ? item.evidenceMessageIds.filter(
              (messageId): messageId is string => typeof messageId === "string",
            )
          : [],
      ),
    ),
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
