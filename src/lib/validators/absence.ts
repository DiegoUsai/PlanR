import { z } from "zod";

const absenceTypeEnum = z.enum(["FERIE", "MALATTIA", "PERMESSO", "ALTRO"]);
const absenceSourceEnum = z.enum(["FACTORIAL", "JIRA"]);

export const createAbsenceSchema = z.object({
  resourceId: z.string().uuid(),
  date: z.string().date(),
  hours: z.number().positive().max(24),
  type: absenceTypeEnum,
  source: absenceSourceEnum.default("FACTORIAL"),
  notes: z.string().optional(),
});

export const updateAbsenceSchema = createAbsenceSchema.partial();

export type CreateAbsenceInput = z.infer<typeof createAbsenceSchema>;
export type UpdateAbsenceInput = z.infer<typeof updateAbsenceSchema>;
