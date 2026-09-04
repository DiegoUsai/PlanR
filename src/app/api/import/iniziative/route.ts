import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";
import { isNonPlannableJiraStatus, computeInitiativeStatus } from "@/lib/business-rules/initiative-status";
import { Decimal } from "@prisma/client/runtime/library";

interface CsvRow {
  "Issue key": string;
  "Issue id": string;
  Summary: string;
  Description: string;
  Status: string;
  Priority: string;
  "Custom field (Service Type)": string;
  "Custom field (Contratti BU DOC)": string;
  "Due date": string;
  "Custom field (Valore economico stimato)": string;
  "Original estimate": string;
  "Custom field (Progetto BU DOC)": string;
  "Custom field (Richiedente)": string;
  "Custom field (Data richiesta)": string;
  "Custom field (Tenant)": string;
  Components: string;
  "Custom field (Corsia d'urgenza)": string;
  "Custom field (Engineering Excellence)": string;
  "Custom field (Engineering Excellence).1": string;
  "Custom field (Engineering Excellence).2": string;
  "Custom field (Sizing Sviluppo)": string;
  "Custom field (Polarità Sizing Sviluppo)": string;
  "Custom field (Sizing Analisi)": string;
  "Custom field (Polarità Sizing Analisi)": string;
  "Custom field (Affidabilità della stima)": string;
  "Custom field (Analisi PTF)": string;
  "Custom field (Figure necessarie)": string;
  "Custom field (Vincoli e/o criticità)": string;
  "Custom field (In riuso da)": string;
}

const PRIORITY_MAP: Record<string, string> = {
  highest: "HIGHEST",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
  lowest: "LOWEST",
};

function parseJiraDate(raw: string): Date | null {
  if (!raw || !raw.trim()) return null;
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d;
  const match = raw.match(/(\d{1,2})\/(\w{3})\/(\d{2})\s/);
  if (match) {
    const months: Record<string, string> = {
      Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
      Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
    };
    const mon = months[match[2]];
    if (mon) {
      const year = parseInt(match[3]) < 50 ? `20${match[3]}` : `19${match[3]}`;
      return new Date(`${year}-${mon}-${match[1].padStart(2, "0")}`);
    }
  }
  return null;
}

function cleanEE(...vals: string[]): string | null {
  const parts = vals
    .map((v) => v?.trim())
    .filter((v) => v && v.toLowerCase() !== "no" && v !== "");
  return parts.length > 0 ? parts.join(", ") : null;
}

function nullIfEmpty(val: string | undefined): string | null {
  if (!val || !val.trim()) return null;
  const v = val.trim();
  return v.toLowerCase() === "no" ? null : v;
}

interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; issueKey: string; error: string }>;
  anomalies: Array<{
    issueKey: string;
    initiativeId: string;
    title: string;
    changes: Array<{ field: string; oldValue: string | null; newValue: string | null }>;
    hasActiveAllocations: boolean;
    isRejected: boolean;
  }>;
  contractAlerts: string[];
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const decisionsRaw = formData.get("decisions");
  const decisions: Record<string, "confirm" | "reject"> = decisionsRaw
    ? JSON.parse(decisionsRaw as string)
    : {};

  if (!file) {
    return NextResponse.json({ error: "File mancante" }, { status: 400 });
  }

  const text = await file.text();
  const { data: rows, errors: parseErrors } = Papa.parse<CsvRow>(text, {
    header: true,
    delimiter: ";",
    skipEmptyLines: true,
  });

  if (parseErrors.length > 0 && rows.length === 0) {
    return NextResponse.json(
      { error: "Errore parsing CSV", details: parseErrors },
      { status: 400 }
    );
  }

  const [applications, contracts, existingInitiatives] = await Promise.all([
    prisma.application.findMany({ include: { modules: true } }),
    prisma.contract.findMany(),
    prisma.initiative.findMany({
      include: {
        allocations: true,
        modules: true,
      },
    }),
  ]);

  const appByName = new Map(applications.map((a) => [a.name.toLowerCase(), a]));
  const contractByJiraId = new Map(
    contracts
      .filter((c) => c.idContrattoJira)
      .map((c) => [c.idContrattoJira!, c])
  );
  const existingByKey = new Map(
    existingInitiatives.map((i) => [i.issueKey, i])
  );

  const result: ImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    anomalies: [],
    contractAlerts: [],
  };

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const issueKey = row["Issue key"]?.trim();
    const issueId = row["Issue id"]?.trim();
    const statoJira = row["Status"]?.trim();

    if (!issueKey || !issueId || !statoJira) {
      result.errors.push({
        row: idx + 2,
        issueKey: issueKey || "?",
        error: "Issue key, Issue id o Status mancante",
      });
      continue;
    }

    if (isNonPlannableJiraStatus(statoJira)) {
      result.skipped++;
      continue;
    }

    const appName = row["Custom field (Progetto BU DOC)"]?.trim();
    if (!appName) {
      result.errors.push({
        row: idx + 2,
        issueKey,
        error: "Progetto BU DOC mancante",
      });
      continue;
    }

    const app = appByName.get(appName.toLowerCase());
    if (!app) {
      result.errors.push({
        row: idx + 2,
        issueKey,
        error: `Applicativo "${appName}" non trovato in anagrafica`,
      });
      continue;
    }

    const priorityRaw = row["Priority"]?.trim().toLowerCase();
    const priority = PRIORITY_MAP[priorityRaw];
    if (!priority) {
      result.errors.push({
        row: idx + 2,
        issueKey,
        error: `Priorità "${row["Priority"]}" non riconosciuta`,
      });
      continue;
    }

    const contrattoBuDoc = row["Custom field (Contratti BU DOC)"]?.trim();
    let contractId: string | null = null;
    if (contrattoBuDoc) {
      const contract = contractByJiraId.get(contrattoBuDoc);
      if (contract) {
        contractId = contract.id;
      } else {
        if (!result.contractAlerts.includes(contrattoBuDoc)) {
          result.contractAlerts.push(contrattoBuDoc);
        }
      }
    }

    const origEstimate = row["Original estimate"]?.trim();
    const estimatedDays = origEstimate
      ? parseFloat((parseInt(origEstimate) / 28800).toFixed(2))
      : null;

    const desiredEndDate = parseJiraDate(row["Due date"]);
    const dataRichiesta = parseJiraDate(row["Custom field (Data richiesta)"]);

    const components = row["Components"]?.trim() || null;

    const engineeringExcellence = cleanEE(
      row["Custom field (Engineering Excellence)"],
      row["Custom field (Engineering Excellence).1"],
      row["Custom field (Engineering Excellence).2"]
    );

    const corsiaUrgenza = nullIfEmpty(row["Custom field (Corsia d'urgenza)"]);

    const initiativeData = {
      issueKey,
      issueId: parseInt(issueId),
      applicationId: app.id,
      contractId,
      title: row["Summary"]?.trim() || issueKey,
      description: row["Description"]?.trim() || null,
      tipologia: row["Custom field (Service Type)"]?.trim() || null,
      priority: priority as "HIGHEST" | "HIGH" | "MEDIUM" | "LOW" | "LOWEST",
      statoJira,
      desiredEndDate,
      estimatedDays: estimatedDays !== null ? new Decimal(estimatedDays) : null,
      economicValue: row["Custom field (Valore economico stimato)"]?.trim() || null,
      richiedente: row["Custom field (Richiedente)"]?.trim() || null,
      dataRichiesta,
      tenant: row["Custom field (Tenant)"]?.trim() || null,
      corsiaUrgenza,
      engineeringExcellence,
      sizingSviluppo: row["Custom field (Sizing Sviluppo)"]?.trim() || null,
      polaritaSizingSviluppo: row["Custom field (Polarità Sizing Sviluppo)"]?.trim() || null,
      sizingAnalisi: row["Custom field (Sizing Analisi)"]?.trim() || null,
      polaritaSizingAnalisi: row["Custom field (Polarità Sizing Analisi)"]?.trim() || null,
      affidabilitaStima: row["Custom field (Affidabilità della stima)"]?.trim() || null,
      analisiPtf: row["Custom field (Analisi PTF)"]?.trim() || null,
      figureNecessarie: row["Custom field (Figure necessarie)"]?.trim() || null,
      vincoliCriticita: row["Custom field (Vincoli e/o criticità)"]?.trim() || null,
      inRiusoDa: row["Custom field (In riuso da)"]?.trim() || null,
    };

    const existing = existingByKey.get(issueKey);

    if (existing) {
      const changes: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];

      const oldDays = existing.estimatedDays ? Number(existing.estimatedDays) : null;
      if (estimatedDays !== oldDays) {
        changes.push({
          field: "Giorni stimati",
          oldValue: oldDays !== null ? String(oldDays) : null,
          newValue: estimatedDays !== null ? String(estimatedDays) : null,
        });
      }

      const oldEnd = existing.desiredEndDate?.toISOString().split("T")[0] ?? null;
      const newEnd = desiredEndDate?.toISOString().split("T")[0] ?? null;
      if (oldEnd !== newEnd) {
        changes.push({
          field: "Data fine desiderata",
          oldValue: oldEnd,
          newValue: newEnd,
        });
      }

      if (existing.priority !== priority) {
        changes.push({
          field: "Priorità",
          oldValue: existing.priority,
          newValue: priority,
        });
      }

      const oldTipo = existing.tipologia;
      const newTipo = initiativeData.tipologia;
      if (oldTipo !== newTipo) {
        changes.push({
          field: "Tipologia",
          oldValue: oldTipo,
          newValue: newTipo,
        });
      }

      if (existing.statoJira !== statoJira) {
        changes.push({
          field: "Stato Jira",
          oldValue: existing.statoJira,
          newValue: statoJira,
        });
      }

      const hasActiveAllocations = existing.allocations.length > 0;
      const isRejected = statoJira.toLowerCase() === "rejected";

      if (changes.length > 0) {
        const decision = decisions[issueKey];
        if (!decision) {
          result.anomalies.push({
            issueKey,
            initiativeId: existing.id,
            title: existing.title,
            changes,
            hasActiveAllocations,
            isRejected: isRejected && hasActiveAllocations,
          });
          continue;
        }
        if (decision === "reject") {
          result.skipped++;
          continue;
        }
      }

      const allocations = existing.allocations;
      const totalAllocDays = allocations.reduce(
        (sum, a) => sum + Number(a.allocatedEffortDays),
        0
      );
      const hasHardOnly = allocations.length > 0 && allocations.every((a) => a.lockType === "HARD");
      const lastEnd = allocations.length > 0
        ? new Date(Math.max(...allocations.map((a) => new Date(a.endDate).getTime())))
        : null;

      const newStatus = computeInitiativeStatus({
        statoJira,
        estimatedDays,
        totalAllocatedDays: totalAllocDays,
        hasHardLockOnly: hasHardOnly,
        lastAllocationEndDate: lastEnd,
      });

      const moduleIds = components
        ? resolveModules(components, app.modules)
        : [];

      await prisma.initiative.update({
        where: { id: existing.id },
        data: {
          ...initiativeData,
          status: newStatus,
          modules: { set: moduleIds.map((id) => ({ id })) },
        },
      });
      result.updated++;
    } else {
      const newStatus = computeInitiativeStatus({
        statoJira,
        estimatedDays,
        totalAllocatedDays: 0,
        hasHardLockOnly: false,
        lastAllocationEndDate: null,
      });

      const moduleIds = components
        ? resolveModules(components, app.modules)
        : [];

      await prisma.initiative.create({
        data: {
          ...initiativeData,
          status: newStatus,
          modules: moduleIds.length > 0
            ? { connect: moduleIds.map((id) => ({ id })) }
            : undefined,
        },
      });
      result.created++;
    }
  }

  for (const jiraId of result.contractAlerts) {
    const existing = await prisma.alert.findFirst({
      where: {
        type: "CONTRATTO_NON_CENSITO",
        entityId: jiraId,
        status: { in: ["ATTIVO", "PRESO_IN_CARICO"] },
      },
    });
    if (!existing) {
      await prisma.alert.create({
        data: {
          type: "CONTRATTO_NON_CENSITO",
          severity: "OPERATIVO",
          entityType: "Contract",
          entityId: jiraId,
          message: `Contratto Jira "${jiraId}" non censito in anagrafica`,
        },
      });
    }
  }

  return NextResponse.json(result);
}

function resolveModules(
  components: string,
  appModules: Array<{ id: string; name: string; jiraComponent: string | null }>
): string[] {
  const parts = components.split(",").map((c) => c.trim()).filter(Boolean);
  const ids: string[] = [];
  for (const part of parts) {
    const match = appModules.find(
      (m) =>
        m.jiraComponent?.toLowerCase() === part.toLowerCase() ||
        m.name.toLowerCase() === part.toLowerCase()
    );
    if (match && !ids.includes(match.id)) {
      ids.push(match.id);
    }
  }
  return ids;
}
