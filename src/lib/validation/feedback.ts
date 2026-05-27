import { z } from "zod";

export const feedbackRequestSchema = z.object({
  sessionId: z.string().trim().min(1).max(120),
  clarityRating: z.number().int().min(1).max(5),
  helpfulnessRating: z.number().int().min(1).max(5),
  feltSafe: z.boolean().nullable().optional(),
  unsafeOrUnhelpful: z.boolean().optional(),
  comment: z.string().trim().max(2000).nullable().optional(),
});

export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;
