import { z } from "zod";

const contractTypeEnum = z.enum(["SUBAPPALTO", "APPALTO"]);

export const createContractSchema = z.object({
  identifier: z.string().min(1, "Identificativo obbligatorio"),
  type: contractTypeEnum,
  clientSlug: z.string().min(1, "Cliente obbligatorio"),
  amount: z.number().positive("Importo deve essere positivo"),
  startDate: z.string().date(),
  endDate: z.string().date(),
  pmEffortPercentage: z.number().min(0).max(100),
  notes: z.string().optional(),
  applicationIds: z.array(z.string().uuid()).optional(),
});

export const updateContractSchema = createContractSchema.partial();

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
