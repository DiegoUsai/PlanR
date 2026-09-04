export const RESOURCE_ROLE_LABELS: Record<string, string> = {
  ANALISTA_FUNZIONALE: "Analista Funzionale",
  ANALISTA_HD1: "Analista HD1",
  SAP_HD1: "SAP HD1",
  TECH_LEADER: "Tech Leader",
  ANALISTA_HD2: "Analista HD2",
  SENIOR_DEV: "Senior Dev",
  DEVELOPER: "Developer",
  SAP_CONSULTANT: "SAP Consultant",
  RESP_BU: "Resp. BU",
  UI_UX: "UI/UX",
  DEVOPS: "DevOps",
  PROJECT_MANAGER: "Project Manager",
  ARCHITECT: "Architect",
};

export const RESOURCE_LEVEL_LABELS: Record<string, string> = {
  JUNIOR: "Junior",
  MID: "Mid",
  SENIOR: "Senior",
};

export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  INTERNA: "Interna",
  ESTERNA: "Esterna",
};

export const RESOURCE_BELONGING_LABELS: Record<string, string> = {
  BU_DOCUMENTALE: "BU Documentale",
  ENGINEERING_EXCELLENCE: "Engineering Excellence",
};

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  SUBAPPALTO: "Subappalto",
  APPALTO: "Appalto",
};

export const INITIATIVE_STATUS_LABELS: Record<string, string> = {
  ATTESA_DI_ALLOCAZIONE: "In attesa allocazione",
  ALLOCATO_SOFT_LOCK: "Allocato (Soft Lock)",
  CONFERMATO_HARD_LOCK: "Confermato (Hard Lock)",
  PENDING_RESOURCES: "Pending Resources",
  COMPLETATO: "Completato",
  REJECTED: "Rejected",
};

export const INITIATIVE_STATUS_COLORS: Record<
  string,
  "default" | "primary" | "secondary" | "success" | "warning" | "error" | "info"
> = {
  ATTESA_DI_ALLOCAZIONE: "warning",
  ALLOCATO_SOFT_LOCK: "info",
  CONFERMATO_HARD_LOCK: "primary",
  PENDING_RESOURCES: "secondary",
  COMPLETATO: "success",
  REJECTED: "default",
};

export const PRIORITY_LABELS: Record<string, string> = {
  HIGHEST: "Highest",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
  LOWEST: "Lowest",
};

export const PRIORITY_COLORS: Record<string, "error" | "warning" | "info" | "default" | "success"> = {
  HIGHEST: "error",
  HIGH: "warning",
  MEDIUM: "info",
  LOW: "default",
  LOWEST: "success",
};

export const ALERT_TYPE_LABELS: Record<string, string> = {
  SOVRA_ALLOCAZIONE: "Sovra-allocazione",
  SOTTO_UTILIZZO: "Sotto-utilizzo",
  SCADENZA_SOFT_LOCK: "Scadenza soft lock",
  PENDING_RESOURCES: "Pending Resources",
  INIZIATIVA_SENZA_ALLOCAZIONI: "Senza allocazioni",
  PROSSIMITA_SCADENZA_CONTRATTO: "Scadenza contratto",
  SLITTAMENTO_COEFFICIENTE: "Slittamento coefficiente",
  COSTO_SUPERIORE_VALORE: "Costo > valore",
  PROFILO_SATURO: "Profilo saturo",
  PIPELINE_VALUE_ELEVATA: "Pipeline value elevata",
  ACCUMULO_PENDING_RESOURCES: "Accumulo pending",
  CONTRATTO_NON_CENSITO: "Contratto non censito",
  REJECTED_CON_ALLOCAZIONI: "Rejected con allocazioni",
  ANOMALIE_REIMPORT: "Anomalie re-import",
};

export const ALERT_SEVERITY_LABELS: Record<string, string> = {
  OPERATIVO: "Operativo",
  STRATEGICO: "Strategico",
};

export const ALERT_STATUS_LABELS: Record<string, string> = {
  ATTIVO: "Attivo",
  PRESO_IN_CARICO: "Preso in carico",
  SILENZIATO: "Silenziato",
  RISOLTO: "Risolto",
};
