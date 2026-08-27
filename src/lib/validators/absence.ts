import { z } from "zod";

const absenceTypeEnum = z.enum(["FERIE", "MALATTIA", "PERMESSO", "ALTRO"]);

export const createAbsenceSchema = z.object({
  resourceId: z.string().uuid(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  type: absenceTypeEnum,
  hours: z.number().positive().max(24),
  notes: z.string().optional(),
});

export const updateAbsenceSchema = createAbsenceSchema.partial();

export type CreateAbsenceInput = z.infer<typeof createAbsenceSchema>;
export type UpdateAbsenceInput = z.infer<typeof updateAbsenceSchema>;
