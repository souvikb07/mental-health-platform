import { z } from "zod";

const sessionContextSchema = z.object({
  sessionId: z.string().trim().min(1).max(120),
  countryCode: z.enum(["US", "IN", "GLOBAL"]),
  countryLabel: z.string().trim().min(1).max(80).optional(),
  ageConfirmed: z.boolean().optional(),
  ageBand: z.string().trim().min(1).max(40).optional(),
  mainConcern: z.string().trim().min(1).max(1000).optional(),
});

export const chatRequestSchema = z.object({
  sessionId: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(4000),
  sessionContext: sessionContextSchema.optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
