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

  // Phase 1: validate all rows and collect unique names/dates
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
  const uniqueNames = new Set<string>();

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

    uniqueNames.add(nominativo);
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

  // Phase 3: resolve resources, collect dates for batch absence lookup
  interface ResolvedRow {
    resourceId: string;
    date: Date;
    hours: number;
    type: string;
    notes: string | null;
  }
  const resolvedRows: ResolvedRow[] = [];
  const dateRange = { min: validRows[0].date, max: validRows[0].date };

  for (const row of validRows) {
    const resourceId = resourceMap.get(row.nominativo);
    if (!resourceId) {
      rowErrors.push({ row: row.rowNum, field: "nominativo", message: `Risorsa non trovata: "${row.nominativo}"` });
      continue;
    }
    if (row.date < dateRange.min) dateRange.min = row.date;
    if (row.date > dateRange.max) dateRange.max = row.date;
    resolvedRows.push({
      resourceId,
      date: new Date(row.date),
      hours: row.hours,
      type: row.type,
      notes: row.notes,
    });
  }

  // Phase 4: batch-load existing absences in date range
  const existingAbsences = await prisma.absence.findMany({
    where: {
      date: {
        gte: new Date(dateRange.min),
        lte: new Date(dateRange.max),
      },
    },
    select: { id: true, resourceId: true, date: true, notes: true },
  });
  const existingMap = new Map<string, { id: string; notes: string | null }>();
  for (const a of existingAbsences) {
    const key = `${a.resourceId}|${a.date.toISOString().split("T")[0]}`;
    existingMap.set(key, { id: a.id, notes: a.notes });
  }

  // Phase 5: split into creates and updates, execute in batches
  let importedCount = 0;
  let updatedCount = 0;

  const toCreate: Array<{
    resourceId: string;
    date: Date;
    type: string;
    source: string;
    hours: number;
    notes: string | null;
  }> = [];
  const toUpdate: Array<{
    id: string;
    hours: number;
    type: string;
    notes: string | null;
  }> = [];

  for (const row of resolvedRows) {
    const key = `${row.resourceId}|${row.date.toISOString().split("T")[0]}`;
    const existing = existingMap.get(key);

    if (existing) {
      toUpdate.push({
        id: existing.id,
        hours: row.hours,
        type: row.type,
        notes: row.notes || existing.notes,
      });
    } else {
      toCreate.push({
        resourceId: row.resourceId,
        date: row.date,
        type: row.type as never,
        source: "FACTORIAL",
        hours: row.hours,
        notes: row.notes,
      });
    }
  }

  if (toCreate.length > 0) {
    const result = await prisma.absence.createMany({ data: toCreate as never[] });
    importedCount = result.count;
  }

  // Updates must be individual but batched via $transaction
  if (toUpdate.length > 0) {
    const BATCH_SIZE = 50;
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const batch = toUpdate.slice(i, i + BATCH_SIZE);
      await prisma.$transaction(
        batch.map((u) =>
          prisma.absence.update({
            where: { id: u.id },
            data: {
              hours: u.hours,
              type: u.type as never,
              source: "FACTORIAL",
              notes: u.notes,
            },
          })
        )
      );
    }
    updatedCount = toUpdate.length;
  }

  const importLog = await prisma.importLog.create({
    data: {
      type: "ASSENZE",
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
