import { z } from "zod";

const resourceRoleEnum = z.enum([
  "FE", "BE", "ANALISTA", "TECH_LEAD", "ARCHITETTO", "PM", "BA_SENIOR", "ALTRO",
]);
const resourceLevelEnum = z.enum(["JUNIOR", "MID", "SENIOR"]);
const resourceTypeEnum = z.enum(["INTERNA", "ESTERNA"]);
const resourceBelongingEnum = z.enum(["BU_DOCUMENTALE", "ENGINEERING_EXCELLENCE"]);
const resourcePoolEnum = z.enum(["MANUTENZIONE", "EVOLUTIVA_ADEGUATIVA"]);

export const createResourceSchema = z.object({
  name: z.string().min(1, "Nominativo obbligatorio"),
  role: resourceRoleEnum,
  level: resourceLevelEnum,
  type: resourceTypeEnum,
  belonging: resourceBelongingEnum,
  pool: resourcePoolEnum,
  isPTF: z.boolean().default(false),
  joinDate: z.string().date().optional(),
  notes: z.string().optional(),
});

export const updateResourceSchema = createResourceSchema.partial();

export const createResourceParameterSchema = z.object({
  resourceId: z.string().uuid(),
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
