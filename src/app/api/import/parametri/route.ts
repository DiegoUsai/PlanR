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

interface ResolvedRow extends Omit<ValidRow, "rowNum" | "employeeId"> {
  resourceId: string;
}

function parseAndValidateRows(data: ParametriRow[]) {
  const rowErrors: { row: number; field: string; message: string }[] = [];
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

  return { validRows, rowErrors };
}

function datesCovered(
  allocationStart: Date,
  allocationEnd: Date,
  paramPeriods: Array<{ validFrom: Date; validTo: Date | null }>
): boolean {
  const sorted = [...paramPeriods].sort(
    (a, b) => a.validFrom.getTime() - b.validFrom.getTime()
  );
  for (const p of sorted) {
    const pEnd = p.validTo ?? new Date("2099-12-31");
    if (p.validFrom <= allocationStart && pEnd >= allocationEnd) return true;
    if (p.validFrom <= allocationStart && pEnd >= allocationStart) {
      if (pEnd >= allocationEnd) return true;
    }
  }
  let cursor = new Date(allocationStart);
  for (const p of sorted) {
    const pEnd = p.validTo ?? new Date("2099-12-31");
    if (p.validFrom > cursor) return false;
    if (pEnd >= cursor) {
      cursor = new Date(pEnd);
      cursor.setDate(cursor.getDate() + 1);
    }
    if (cursor > allocationEnd) return true;
  }
  return cursor > allocationEnd;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const mode = (formData.get("mode") as string) || "append";

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

  const { validRows, rowErrors } = parseAndValidateRows(data);

  const allResources = await prisma.resource.findMany({
    where: { employeeId: { not: null } },
    select: { id: true, employeeId: true, firstName: true, lastName: true },
  });
  const resourceMap = new Map<string, { id: string; name: string }>();
  for (const r of allResources) {
    if (r.employeeId) resourceMap.set(r.employeeId, { id: r.id, name: `${r.lastName} ${r.firstName}` });
  }

  const resolvedRows: ResolvedRow[] = [];
  const rowsByResource = new Map<string, ResolvedRow[]>();

  for (const row of validRows) {
    const resource = resourceMap.get(row.employeeId);
    if (!resource) {
      rowErrors.push({ row: row.rowNum, field: "id_dipendente", message: `Risorsa non trovata: "${row.employeeId}"` });
      continue;
    }
    const resolved: ResolvedRow = {
      resourceId: resource.id,
      role: row.role,
      level: row.level,
      weeklyHours: row.weeklyHours,
      dailyCost: row.dailyCost,
      productivityCoeff: row.productivityCoeff,
      weeklyHoursBuffer: row.weeklyHoursBuffer,
      validFrom: row.validFrom,
      validTo: row.validTo,
    };
    resolvedRows.push(resolved);
    const existing = rowsByResource.get(resource.id) || [];
    existing.push(resolved);
    rowsByResource.set(resource.id, existing);
  }

  if (mode === "override") {
    const resourceIds = [...rowsByResource.keys()];
    const activeAllocations = await prisma.allocation.findMany({
      where: { resourceId: { in: resourceIds } },
      select: { id: true, resourceId: true, startDate: true, endDate: true },
    });

    const gaps: Array<{
      resourceId: string;
      resourceName: string;
      allocationStart: string;
      allocationEnd: string;
    }> = [];

    for (const alloc of activeAllocations) {
      const newParams = rowsByResource.get(alloc.resourceId);
      if (!newParams) continue;
      const periods = newParams.map((p) => ({
        validFrom: p.validFrom,
        validTo: p.validTo,
      }));
      if (!datesCovered(alloc.startDate, alloc.endDate, periods)) {
        const resource = allResources.find((r) => r.id === alloc.resourceId);
        gaps.push({
          resourceId: alloc.resourceId,
          resourceName: resource ? `${resource.lastName} ${resource.firstName}` : alloc.resourceId,
          allocationStart: alloc.startDate.toISOString().split("T")[0],
          allocationEnd: alloc.endDate.toISOString().split("T")[0],
        });
      }
    }

    if (gaps.length > 0) {
      return NextResponse.json(
        {
          blocked: true,
          error: "I nuovi parametri non coprono tutti i periodi con allocazioni attive",
          gaps,
        },
        { status: 422 }
      );
    }

    const deleteOps = resourceIds.map((rid) =>
      prisma.resourceParameter.deleteMany({ where: { resourceId: rid } })
    );
    const BATCH = 50;
    for (let i = 0; i < deleteOps.length; i += BATCH) {
      await prisma.$transaction(deleteOps.slice(i, i + BATCH));
    }

    const createData = resolvedRows.map((r) => ({
      resourceId: r.resourceId,
      role: r.role as never,
      level: r.level as never,
      weeklyHours: r.weeklyHours,
      dailyCost: r.dailyCost,
      productivityCoeff: r.productivityCoeff,
      weeklyHoursBuffer: r.weeklyHoursBuffer,
      validFrom: r.validFrom,
      validTo: r.validTo,
    }));

    const result = await prisma.resourceParameter.createMany({
      data: createData as never[],
      skipDuplicates: true,
    });

    const importLog = await prisma.importLog.create({
      data: {
        type: "PARAMETRI",
        filename: file.name,
        totalRows: data.length,
        importedRows: result.count,
        updatedRows: 0,
        errorRows: rowErrors.length,
        errors: rowErrors.length > 0 ? rowErrors : undefined,
      },
    });

    return NextResponse.json({
      id: importLog.id,
      mode,
      totalRows: data.length,
      importedRows: result.count,
      deletedParams: deleteOps.length,
      errorRows: rowErrors.length,
      errors: rowErrors,
    });
  }

  // Append mode: close-and-create (existing behavior)
  const resourceIds = [...new Set(resolvedRows.map((r) => r.resourceId))];
  const currentParams = await prisma.resourceParameter.findMany({
    where: {
      resourceId: { in: resourceIds },
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

  if (closeOps.length > 0) {
    const BATCH_SIZE = 50;
    for (let i = 0; i < closeOps.length; i += BATCH_SIZE) {
      await prisma.$transaction(closeOps.slice(i, i + BATCH_SIZE));
    }
    updatedCount = closeOps.length;
  }

  if (createData.length > 0) {
    const result = await prisma.resourceParameter.createMany({
      data: createData as never[],
      skipDuplicates: true,
    });
    importedCount = result.count;
  }

  const importLog = await prisma.importLog.create({
    data: {
      type: "PARAMETRI",
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
    mode,
    totalRows: data.length,
    importedRows: importedCount,
    updatedRows: updatedCount,
    errorRows: rowErrors.length,
    errors: rowErrors,
  });
}
