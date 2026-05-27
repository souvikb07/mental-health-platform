import { z } from "zod";

export const clarityMapRequestSchema = z.object({
  sessionId: z.string().trim().min(1).max(120),
});

export type ClarityMapRequest = z.infer<typeof clarityMapRequestSchema>;
