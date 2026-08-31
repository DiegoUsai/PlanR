import { z } from "zod";

const lockTypeEnum = z.enum(["SOFT", "HARD"]);
const resourceRoleEnum = z.enum([
  "FE", "BE", "ANALISTA", "TECH_LEAD", "ARCHITETTO", "PM", "BA_SENIOR", "ALTRO",
]);

export const createAllocationSchema = z.object({
  initiativeId: z.string().uuid(),
  resourceId: z.string().uuid(),
  lockType: lockTypeEnum,
  softLockExpiry: z.string().date().nullable().optional(),
  allocationPercentage: z.number().int().min(1).max(100),
  startDate: z.string().date(),
  endDate: z.string().date(),
  allocatedEffortDays: z.number().positive().optional(),
  roleInInitiative: resourceRoleEnum,
  affiancamento: z.boolean().default(false),
  isSeniorAffiancamento: z.boolean().default(false),
  notes: z.string().optional(),
});

export const updateAllocationSchema = createAllocationSchema.partial();

export type CreateAllocationInput = z.infer<typeof createAllocationSchema>;
export type UpdateAllocationInput = z.infer<typeof updateAllocationSchema>;
