import { z } from "zod";

export const updateInitiativeNotesSchema = z.object({
  notes: z.string().nullable(),
});

export type UpdateInitiativeNotesInput = z.infer<typeof updateInitiativeNotesSchema>;
