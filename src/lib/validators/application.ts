import { z } from "zod";

export const createApplicationSchema = z.object({
  name: z.string().min(1, "Nome obbligatorio"),
  description: z.string().optional(),
  contractIds: z.array(z.string().uuid()).optional(),
  pmIds: z.array(z.string().uuid()).optional(),
});

export const updateApplicationSchema = createApplicationSchema.partial();

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
