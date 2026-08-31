import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

interface AbsenceRow {
  nominativo: string;
  giorno: string;
  ore_assenza: string;
  tipo_assenza: string;
  note: string;
}

const ABSENCE_TYPE_MAP: Record<string, string> = {
  Ferie: "FERIE", FERIE: "FERIE",
  Malattia: "MALATTIA", MALATTIA: "MALATTIA",
  Permesso: "PERMESSO", PERMESSO: "PERMESSO",
  Altro: "ALTRO", ALTRO: "ALTRO",
};

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "File CSV obbligatorio" }, { status: 400 });
  }

  const text = await file.text();
  const { data, errors: parseErrors } = Papa.parse<AbsenceRow>(text, {
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
    nominativo: string;
    lastName: string;
    firstName: string;
    date: string;
    hours: number;
    type: string;
    notes: string | null;
  }
  const validRows: ValidRow[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2;

    const nominativo = row.nominativo?.trim();
    if (!nominativo) {
      rowErrors.push({ row: rowNum, field: "nominativo", message: "Nominativo mancante" });
      continue;
    }

    const dateStr = row.giorno?.trim();
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      rowErrors.push({ row: rowNum, field: "giorno", message: `Data non valida: "${dateStr}". Formato atteso: YYYY-MM-DD` });
      continue;
    }

    const hours = parseFloat(row.ore_assenza?.trim());
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      rowErrors.push({ row: rowNum, field: "ore_assenza", message: `Ore non valide: "${row.ore_assenza}"` });
      continue;
    }

    const parts = nominativo.split(/\s+/);
    const lastName = parts[0] || "";
    const firstName = parts.slice(1).join(" ") || "";

    validRows.push({
      rowNum,
      nominativo,
      lastName,
      firstName,
      date: dateStr,
      hours,
      type: ABSENCE_TYPE_MAP[row.tipo_assenza?.trim()] || "FERIE",
      notes: row.note?.trim() || null,
    });
  }

  if (validRows.length === 0) {
    const importLog = await prisma.importLog.create({
      data: {
        type: "ASSENZE",
        filename: file.name,
        totalRows: data.length,
        importedRows: 0,
        updatedRows: 0,
        errorRows: rowErrors.length,
        errors: rowErrors.length > 0 ? rowErrors : undefined,
      },
    });
    return NextResponse.json({
      id: importLog.id,
      totalRows: data.length,
      importedRows: 0,
      updatedRows: 0,
      errorRows: rowErrors.length,
      errors: rowErrors,
    });
  }

  // Phase 2: batch-load all resources
  const allResources = await prisma.resource.findMany({
    select: { id: true, firstName: true, lastName: true },
  });
  const resourceMap = new Map<string, string>();
  for (const r of allResources) {
    resourceMap.set(`${r.lastName} ${r.firstName}`, r.id);
  }

  // Phase 3: resolve resources, build insert data
  const toCreate: Array<{
    resourceId: string;
    date: Date;
    type: string;
    source: string;
    hours: number;
    notes: string | null;
  }> = [];
  const affectedResourceIds = new Set<string>();
  let minDate = validRows[0].date;
  let maxDate = validRows[0].date;

  for (const row of validRows) {
    const resourceId = resourceMap.get(row.nominativo);
    if (!resourceId) {
      rowErrors.push({ row: row.rowNum, field: "nominativo", message: `Risorsa non trovata: "${row.nominativo}"` });
      continue;
    }
    affectedResourceIds.add(resourceId);
    if (row.date < minDate) minDate = row.date;
    if (row.date > maxDate) maxDate = row.date;
    toCreate.push({
      resourceId,
      date: new Date(row.date),
      type: row.type as never,
      source: "FACTORIAL",
      hours: row.hours,
      notes: row.notes,
    });
  }

  // Phase 4: delete existing FACTORIAL absences in date range for affected resources, then bulk create
  const deleted = await prisma.absence.deleteMany({
    where: {
      source: "FACTORIAL",
      resourceId: { in: [...affectedResourceIds] },
      date: {
        gte: new Date(minDate),
        lte: new Date(maxDate),
      },
    },
  });

  const result = await prisma.absence.createMany({ data: toCreate as never[] });

  const importLog = await prisma.importLog.create({
    data: {
      type: "ASSENZE",
      filename: file.name,
      totalRows: data.length,
      importedRows: result.count,
      updatedRows: deleted.count,
      errorRows: rowErrors.length,
      errors: rowErrors.length > 0 ? rowErrors : undefined,
    },
  });

  return NextResponse.json({
    id: importLog.id,
    totalRows: data.length,
    importedRows: result.count,
    replacedRows: deleted.count,
    errorRows: rowErrors.length,
    errors: rowErrors,
  });
}
