export const RESOURCE_ROLE_LABELS: Record<string, string> = {
  FE: "Frontend",
  BE: "Backend",
  ANALISTA: "Analista",
  TECH_LEAD: "Tech Lead",
  ARCHITETTO: "Architetto",
  PM: "Project Manager",
  BA_SENIOR: "BA Senior",
  ALTRO: "Altro",
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

export const RESOURCE_POOL_LABELS: Record<string, string> = {
  MANUTENZIONE: "Manutenzione",
  EVOLUTIVA_ADEGUATIVA: "Evolutiva/Adeguativa",
};

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  SUBAPPALTO: "Subappalto",
  APPALTO: "Appalto",
};

export const INITIATIVE_TYPE_LABELS: Record<string, string> = {
  MEV: "MEV",
  MAD: "MAD",
};

export const INITIATIVE_STATUS_LABELS: Record<string, string> = {
  IN_ATTESA_DI_ALLOCAZIONE: "In attesa allocazione",
  ALLOCATO: "Allocato",
  IN_LAVORAZIONE: "In lavorazione",
  COMPLETATO: "Completato",
  READY_PENDING_RESOURCES: "Ready - Pending Resources",
  IN_ATTESA_COPERTURA_CONTRATTUALE: "Attesa copertura contrattuale",
  FUORI_SCOPE: "Fuori scope",
};

export const INITIATIVE_STATUS_COLORS: Record<
  string,
  "default" | "primary" | "secondary" | "success" | "warning" | "error" | "info"
> = {
  IN_ATTESA_DI_ALLOCAZIONE: "warning",
  ALLOCATO: "info",
  IN_LAVORAZIONE: "primary",
  COMPLETATO: "success",
  READY_PENDING_RESOURCES: "secondary",
  IN_ATTESA_COPERTURA_CONTRATTUALE: "error",
  FUORI_SCOPE: "default",
};

export const PRIORITY_LABELS: Record<string, string> = {
  ALTA: "Alta",
  MEDIA: "Media",
  BASSA: "Bassa",
};

export const PRIORITY_COLORS: Record<string, "error" | "warning" | "info"> = {
  ALTA: "error",
  MEDIA: "warning",
  BASSA: "info",
};

export const ALERT_TYPE_LABELS: Record<string, string> = {
  SOVRA_ALLOCAZIONE: "Sovra-allocazione",
  SOTTO_UTILIZZO: "Sotto-utilizzo",
  SCADENZA_SOFT_LOCK: "Scadenza soft lock",
  READY_PENDING_RESOURCES: "Pending Resources",
  INIZIATIVA_SENZA_ALLOCAZIONI: "Senza allocazioni",
  PROSSIMITA_SCADENZA_CONTRATTO: "Scadenza contratto",
  SLITTAMENTO_COEFFICIENTE: "Slittamento coefficiente",
  COSTO_SUPERIORE_VALORE: "Costo > valore",
  PROFILO_SATURO: "Profilo saturo",
  PIPELINE_VALUE_ELEVATA: "Pipeline value elevata",
  ACCUMULO_PENDING_RESOURCES: "Accumulo pending",
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
