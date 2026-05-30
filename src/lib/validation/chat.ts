import { z } from "zod";

const sessionContextSchema = z.object({
  sessionId: z.string().trim().min(1).max(120),
  countryCode: z.enum(["US", "IN", "GLOBAL"]),
  countryLabel: z.string().trim().min(1).max(80).optional(),
  ageConfirmed: z.boolean().optional(),
  consentAccepted: z.boolean().optional(),
  ageBand: z.string().trim().min(1).max(40).optional(),
  mainConcern: z.string().trim().min(1).max(1000).optional(),
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
  mainConcernText: z.string().trim().min(1).max(1000).optional(),
});

export const chatRequestSchema = z
  .object({
    sessionId: z.string().trim().min(1).max(120),
    message: z.string().trim().min(1).max(4000),
    clientMessageId: z.string().uuid().optional(),
    sessionContext: sessionContextSchema.optional(),
  })
  .refine(
    (request) =>
      !request.sessionContext ||
      request.sessionContext.sessionId === request.sessionId,
    {
      message: "Session context must match the session locator.",
      path: ["sessionContext", "sessionId"],
    },
  );

export type ChatRequest = z.infer<typeof chatRequestSchema>;
