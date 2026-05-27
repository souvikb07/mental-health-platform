import { z } from "zod";

export const createSessionRequestSchema = z.object({
  country: z.string().trim().min(1).max(80).optional(),
  ageBand: z.string().trim().min(1).max(40).optional(),
  ageConfirmed: z.boolean().optional(),
  mainConcern: z.string().trim().min(1).max(1000),
});

export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;
