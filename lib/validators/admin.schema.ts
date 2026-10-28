import { z } from "zod";

export const updateOrderStatusSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("diproses"),
    admin_notes: z.string().optional(),
  }),
  z.object({
    status: z.literal("selesai"),
    admin_notes: z.string().optional(),
  }),
  z.object({
    status: z.literal("dibatalkan"),
    cancel_reason: z.string().min(1, "Alasan pembatalan wajib diisi."),
  }),
]);

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
