import { z } from "zod";

export const SERVICE_SLUGS = ["plagiasi", "ai-detector", "drillbit", "parafrase"] as const;

export const createOrderSchema = z.object({
  file_id: z.string().uuid(),
  service_slug: z.enum(SERVICE_SLUGS),
  use_quota_id: z.string().uuid().nullable().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
