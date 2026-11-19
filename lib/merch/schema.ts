import { z } from "zod";

export const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  category: z.string().trim().max(60).nullable().optional(),
  price_idr: z.number().int().min(1000, "Harga minimal Rp1.000").max(50_000_000),
  stock: z.number().int().min(0).max(100_000),
  image_url: z.string().trim().url("URL gambar tidak valid").startsWith("https://", "Gambar harus https").nullable().optional().or(z.literal("").transform(() => null)),
  weight_grams: z.number().int().min(1).max(50_000).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(9999).optional(),
});
