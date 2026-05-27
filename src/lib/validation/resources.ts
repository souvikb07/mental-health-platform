import { z } from "zod";

export const resourcesQuerySchema = z.object({
  country: z.string().trim().min(1).max(80).optional(),
  topic: z.string().trim().min(1).max(80).optional(),
  riskLevel: z
    .enum(["none", "low", "medium", "high", "imminent"])
    .optional(),
});

export type ResourcesQuery = z.infer<typeof resourcesQuerySchema>;
