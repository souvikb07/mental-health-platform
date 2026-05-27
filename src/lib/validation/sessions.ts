import { z } from "zod";

export const mainConcernCategorySchema = z.enum([
  "overwhelmed",
  "anxious_worried",
  "low_numb_disconnected",
  "work_study_stress",
  "relationship_family",
  "sleep_energy",
  "not_sure",
]);

export const createSessionRequestSchema = z.object({
  country: z.string().trim().min(1).max(80),
  ageBand: z.string().trim().min(1).max(40).optional(),
  ageConfirmed: z.literal(true),
  consentAccepted: z.literal(true),
  mainConcernCategory: mainConcernCategorySchema,
  mainConcernText: z.string().trim().max(1000).optional(),
  mainConcern: z.string().trim().min(1).max(1000).optional(),
});

export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;
