import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

interface ParametriRow {
  id_dipendente: string;
  ruolo: string;
  livello: string;
  ore_settimanali: string;
  costo_giornata: string;
  coefficiente_produttivita: string;
  buffer_ore_settimanali: string;
  data_inizio_validita: string;
  data_fine_validita: string;
}

const ROLE_MAP: Record<string, string> = {
  "Analista Funzionale": "ANALISTA_FUNZIONALE", ANALISTA_FUNZIONALE: "ANALISTA_FUNZIONALE",
  "Analista HD1": "ANALISTA_HD1", ANALISTA_HD1: "ANALISTA_HD1",
  "SAP HD1": "SAP_HD1", SAP_HD1: "SAP_HD1",
  "Tech Leader": "TECH_LEADER", TECH_LEADER: "TECH_LEADER",
  "Analista HD2": "ANALISTA_HD2", ANALISTA_HD2: "ANALISTA_HD2",
  "Senior Dev": "SENIOR_DEV", SENIOR_DEV: "SENIOR_DEV",
  Developer: "DEVELOPER", DEVELOPER: "DEVELOPER",
  "SAP Consultant": "SAP_CONSULTANT", SAP_CONSULTANT: "SAP_CONSULTANT",
  "Resp. BU": "RESP_BU", RESP_BU: "RESP_BU",
  "UI/UX": "UI_UX", UI_UX: "UI_UX",
  DevOps: "DEVOPS", DEVOPS: "DEVOPS",
  "Project Manager": "PROJECT_MANAGER", PROJECT_MANAGER: "PROJECT_MANAGER",
  Architect: "ARCHITECT", ARCHITECT: "ARCHITECT",
};

const LEVEL_MAP: Record<string, string> = {
  Junior: "JUNIOR", JUNIOR: "JUNIOR",
  Mid: "MID", MID: "MID",
  Senior: "SENIOR", SENIOR: "SENIOR",
};

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "File CSV obbligatorio" }, { status: 400 });
  }

  const text = await file.text();
  const { data, errors: parseErrors } = Papa.parse<ParametriRow>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter: ";",
    transformHeader: (h: string) => h.trim(),
  });

  if (parseErrors.length > 0) {
    return NextResponse.json(
      { error: "Errore parsing CSV", details: parseErrors },
      { status: 400 }
    );
  }

  const rowErrors: { row: number; field: string; message: string }[] = [];

  // Phase 1: validate all rows
  interface ValidRow {
    rowNum: number;
    employeeId: string;
    role: string;
    level: string;
    weeklyHours: number;
    dailyCost: number;
    productivityCoeff: number;
    weeklyHoursBuffer: number | null;
    validFrom: Date;
    validTo: Date | null;
  }
  const validRows: ValidRow[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2;

    const employeeId = row.id_dipendente?.trim();
    if (!employeeId) {
      rowErrors.push({ row: rowNum, field: "id_dipendente", message: "ID dipendente obbligatorio" });
      continue;
    }

    const role = ROLE_MAP[row.ruolo?.trim()];
    if (!role) {
      rowErrors.push({ row: rowNum, field: "ruolo", message: `Ruolo non valido: "${row.ruolo}"` });
      continue;
    }

    const level = LEVEL_MAP[row.livello?.trim()];
    if (!level) {
      rowErrors.push({ row: rowNum, field: "livello", message: `Livello non valido: "${row.livello}"` });
      continue;
    }

    const weeklyHours = Number(row.ore_settimanali?.trim().replace(",", "."));
    if (!weeklyHours || weeklyHours <= 0) {
      rowErrors.push({ row: rowNum, field: "ore_settimanali", message: "Ore settimanali non valide" });
      continue;
    }

    const dailyCost = Number(row.costo_giornata?.trim().replace(",", "."));
    if (isNaN(dailyCost) || dailyCost < 0) {
      rowErrors.push({ row: rowNum, field: "costo_giornata", message: "Costo giornata non valido" });
      continue;
    }

    const validFromStr = row.data_inizio_validita?.trim();
    if (!validFromStr || !/^\d{4}-\d{2}-\d{2}$/.test(validFromStr)) {
      rowErrors.push({ row: rowNum, field: "data_inizio_validita", message: "Data inizio validita obbligatoria (YYYY-MM-DD)" });
      continue;
    }

    const validToStr = row.data_fine_validita?.trim();
    let validTo: Date | null = null;
    if (validToStr) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(validToStr)) {
        rowErrors.push({ row: rowNum, field: "data_fine_validita", message: "Formato data fine non valido (YYYY-MM-DD)" });
        continue;
      }
      validTo = new Date(validToStr);
    }

    validRows.push({
      rowNum,
      employeeId,
      role,
      level,
      weeklyHours,
      dailyCost,
      productivityCoeff: Number(row.coefficiente_produttivita?.trim().replace(",", ".")) || 1,
      weeklyHoursBuffer: row.buffer_ore_settimanali?.trim()
        ? Number(row.buffer_ore_settimanali.trim().replace(",", "."))
        : null,
      validFrom: new Date(validFromStr),
      validTo,
    });
  }

  // Phase 2: batch-load all resources by employeeId
  const allResources = await prisma.resource.findMany({
    where: { employeeId: { not: null } },
    select: { id: true, employeeId: true },
  });
  const resourceMap = new Map<string, string>();
  for (const r of allResources) {
    if (r.employeeId) resourceMap.set(r.employeeId, r.id);
  }

  // Phase 3: resolve resources, collect resource IDs for parameter lookup
  interface ResolvedRow {
    resourceId: string;
    role: string;
    level: string;
    weeklyHours: number;
    dailyCost: number;
    productivityCoeff: number;
    weeklyHoursBuffer: number | null;
    validFrom: Date;
    validTo: Date | null;
  }
  const resolvedRows: ResolvedRow[] = [];
  const resourceIds = new Set<string>();

  for (const row of validRows) {
    const resourceId = resourceMap.get(row.employeeId);
    if (!resourceId) {
      rowErrors.push({ row: row.rowNum, field: "id_dipendente", message: `Risorsa non trovata: "${row.employeeId}"` });
      continue;
    }
    resourceIds.add(resourceId);
    resolvedRows.push({
      resourceId,
      role: row.role,
      level: row.level,
      weeklyHours: row.weeklyHours,
      dailyCost: row.dailyCost,
      productivityCoeff: row.productivityCoeff,
      weeklyHoursBuffer: row.weeklyHoursBuffer,
      validFrom: row.validFrom,
      validTo: row.validTo,
    });
  }

  // Phase 4: batch-load current parameters for affected resources
  const currentParams = await prisma.resourceParameter.findMany({
    where: {
      resourceId: { in: [...resourceIds] },
      validTo: null,
    },
    select: { id: true, resourceId: true, validFrom: true },
  });
  const currentParamMap = new Map<string, { id: string; validFrom: Date }>();
  for (const p of currentParams) {
    const existing = currentParamMap.get(p.resourceId);
    if (!existing || p.validFrom > existing.validFrom) {
      currentParamMap.set(p.resourceId, { id: p.id, validFrom: p.validFrom });
    }
  }

  // Phase 5: build batch operations
  let importedCount = 0;
  let updatedCount = 0;

  const closeOps: Array<ReturnType<typeof prisma.resourceParameter.update>> = [];
  const createData: Array<{
    resourceId: string;
    role: string;
    level: string;
    weeklyHours: number;
    dailyCost: number;
    productivityCoeff: number;
    weeklyHoursBuffer: number | null;
    validFrom: Date;
    validTo: Date | null;
  }> = [];

  for (const row of resolvedRows) {
    const currentParam = currentParamMap.get(row.resourceId);

    if (currentParam && currentParam.validFrom < row.validFrom) {
      const closingDate = new Date(row.validFrom);
      closingDate.setDate(closingDate.getDate() - 1);
      closeOps.push(
        prisma.resourceParameter.update({
          where: { id: currentParam.id },
          data: { validTo: closingDate },
        })
      );
    }

    createData.push({
      resourceId: row.resourceId,
      role: row.role as never,
      level: row.level as never,
      weeklyHours: row.weeklyHours,
      dailyCost: row.dailyCost,
      productivityCoeff: row.productivityCoeff,
      weeklyHoursBuffer: row.weeklyHoursBuffer,
      validFrom: row.validFrom,
      validTo: row.validTo,
    });
  }

  // Phase 6: execute in batches
  if (closeOps.length > 0) {
    const BATCH_SIZE = 50;
    for (let i = 0; i < closeOps.length; i += BATCH_SIZE) {
      await prisma.$transaction(closeOps.slice(i, i + BATCH_SIZE));
    }
    updatedCount = closeOps.length;
  }

  if (createData.length > 0) {
    const result = await prisma.resourceParameter.createMany({ data: createData as never[], skipDuplicates: true });
    importedCount = result.count;
  }

  const importLog = await prisma.importLog.create({
    data: {
      type: "RISORSE",
      filename: file.name,
      totalRows: data.length,
      importedRows: importedCount,
      updatedRows: updatedCount,
      errorRows: rowErrors.length,
      errors: rowErrors.length > 0 ? rowErrors : undefined,
    },
  });

  return NextResponse.json({
    id: importLog.id,
    totalRows: data.length,
    importedRows: importedCount,
    updatedRows: updatedCount,
    errorRows: rowErrors.length,
    errors: rowErrors,
  });
}
