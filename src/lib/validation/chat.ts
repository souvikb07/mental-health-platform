import { z } from "zod";

export const chatRequestSchema = z.object({
  sessionId: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(4000),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
