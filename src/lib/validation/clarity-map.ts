import { z } from "zod";

import type { ApiChatMessage } from "@/types/risk";

const legacyClarityMapRequestSchema = z.object({
  sessionId: z.string().trim().min(1).max(120),
});

const sessionContextSchema = z.object({
  sessionId: z.string().trim().min(1).max(120),
  countryCode: z.enum(["US", "IN", "GLOBAL"]),
  countryLabel: z.string().trim().min(1).max(80).optional(),
  ageConfirmed: z.boolean().optional(),
  consentAccepted: z.boolean().optional(),
  ageBand: z.string().trim().max(40).optional(),
  mainConcern: z.string().trim().max(200).optional(),
  mainConcernCategory: z
    .enum([
      "overwhelmed",
      "anxious_worried",
      "low_numb_disconnected",
      "work_study_stress",
      "relationship_family",
      "sleep_energy",
      "not_sure",
    ])
    .optional(),
  mainConcernLabel: z.string().trim().min(1).max(100).optional(),
  mainConcernText: z.string().trim().max(1000).optional(),
});

const clarityMapMessageSchema = z.object({
  id: z.string().trim().min(1).max(120),
  role: z.enum(["assistant", "user"]),
  content: z.string().trim().min(1).max(4000),
  createdAt: z.string().trim().min(1).max(80),
}) satisfies z.ZodType<ApiChatMessage>;

export const enhancedClarityMapRequestSchema = z.object({
  sessionId: z.string().trim().min(1).max(120),
  sessionContext: sessionContextSchema,
  messages: z.array(clarityMapMessageSchema).max(80),
  lastRisk: z.unknown().optional(),
  lastSafetyState: z.unknown().optional(),
});

export const clarityMapRequestSchema = z.union([
  enhancedClarityMapRequestSchema,
  legacyClarityMapRequestSchema,
]);

export type ClarityMapRequest = z.infer<typeof clarityMapRequestSchema>;
export type LegacyClarityMapRequest = z.infer<typeof legacyClarityMapRequestSchema>;
export type EnhancedClarityMapRequest = z.infer<
  typeof enhancedClarityMapRequestSchema
>;

export function isEnhancedClarityMapRequest(
  request: ClarityMapRequest,
): request is EnhancedClarityMapRequest {
  return "sessionContext" in request && "messages" in request;
}
