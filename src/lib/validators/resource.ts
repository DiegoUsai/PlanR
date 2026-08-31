import { z } from "zod";

const resourceRoleEnum = z.enum([
  "FE", "BE", "ANALISTA", "TECH_LEAD", "ARCHITETTO", "PM", "BA_SENIOR", "ALTRO",
]);
const resourceLevelEnum = z.enum(["JUNIOR", "MID", "SENIOR"]);
const resourceTypeEnum = z.enum(["INTERNA", "ESTERNA"]);
const resourceBelongingEnum = z.enum(["BU_DOCUMENTALE", "ENGINEERING_EXCELLENCE"]);
export const createResourceSchema = z.object({
  firstName: z.string().min(1, "Nome obbligatorio"),
  lastName: z.string().min(1, "Cognome obbligatorio"),
  employeeId: z.string().optional(),
  type: resourceTypeEnum,
  belonging: resourceBelongingEnum,
  isPTF: z.boolean().default(false),
  attivo: z.boolean().default(true),
  joinDate: z.string().date().optional(),
  notes: z.string().optional(),
});

export const updateResourceSchema = createResourceSchema.partial();

export const createResourceParameterSchema = z.object({
  resourceId: z.string().uuid(),
  role: resourceRoleEnum,
  level: resourceLevelEnum,
  weeklyHours: z.number().positive(),
  dailyCost: z.number().nonnegative(),
  productivityCoeff: z.number().positive().default(1.0),
  weeklyHoursBuffer: z.number().nonnegative().nullable().optional(),
  validFrom: z.string().date(),
  validTo: z.string().date().nullable().optional(),
});

export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type CreateResourceParameterInput = z.infer<typeof createResourceParameterSchema>;
