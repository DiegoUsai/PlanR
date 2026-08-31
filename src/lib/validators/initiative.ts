import { z } from "zod";

const initiativeTypeEnum = z.enum(["MEV", "MAD"]);
const priorityEnum = z.enum(["ALTA", "MEDIA", "BASSA"]);
const initiativeStatusEnum = z.enum([
  "IN_ATTESA_DI_ALLOCAZIONE",
  "ALLOCATO",
  "IN_LAVORAZIONE",
  "COMPLETATO",
  "READY_PENDING_RESOURCES",
  "IN_ATTESA_COPERTURA_CONTRATTUALE",
  "FUORI_SCOPE",
]);
const sizingSizeEnum = z.enum(["XS", "S", "M", "L", "XL"]);
const polarityEnum = z.enum(["PRIMA_META", "SECONDA_META"]);
const analysisTestSizeEnum = z.enum(["A_XS", "A_S", "A_M", "A_L"]);
const reliabilityLevelEnum = z.enum(["ALTA", "MEDIA", "BASSA"]);
const economicValueEnum = z.enum([
  "UNDER_5K", "FROM_5K_TO_10K", "FROM_10K_TO_15K", "FROM_15K_TO_20K",
  "FROM_20K_TO_30K", "FROM_30K_TO_40K", "OVER_40K",
]);

export const createInitiativeSchema = z.object({
  applicationId: z.string().uuid(),
  moduleId: z.string().uuid().nullable().optional(),
  contractId: z.string().uuid(),
  code: z.string().min(1, "Codice obbligatorio"),
  title: z.string().min(1, "Titolo obbligatorio"),
  description: z.string().optional(),
  type: initiativeTypeEnum,
  priority: priorityEnum,
  desiredStartDate: z.string().date().optional(),
  desiredEndDate: z.string().date().optional(),
  estimatedDays: z.number().positive().optional(),
  requiredProfiles: z.string().optional(),
  status: initiativeStatusEnum.default("IN_ATTESA_DI_ALLOCAZIONE"),
  sizingSize: sizingSizeEnum.optional(),
  polarity: polarityEnum.optional(),
  analysisTestSize: analysisTestSizeEnum.optional(),
  affidabilitaStima: reliabilityLevelEnum.optional(),
  vincoliCriticita: z.string().optional(),
  reuseFlag: z.boolean().default(false),
  economicValue: economicValueEnum.optional(),
  notes: z.string().optional(),
});

export const updateInitiativeSchema = createInitiativeSchema.partial();

export type CreateInitiativeInput = z.infer<typeof createInitiativeSchema>;
export type UpdateInitiativeInput = z.infer<typeof updateInitiativeSchema>;
