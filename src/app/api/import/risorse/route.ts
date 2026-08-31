import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

interface ResourceRow {
  id_dipendente: string;
  cognome: string;
  nome: string;
  tipologia: string;
  appartenenza: string;
  is_ptf: string;
  note: string;
}

const TYPE_MAP: Record<string, string> = {
  Interna: "INTERNA", Esterna: "ESTERNA", INTERNA: "INTERNA", ESTERNA: "ESTERNA",
};

const BELONGING_MAP: Record<string, string> = {
  "BU Documentale": "BU_DOCUMENTALE", "Engineering Excellence": "ENGINEERING_EXCELLENCE",
  BU_DOCUMENTALE: "BU_DOCUMENTALE", ENGINEERING_EXCELLENCE: "ENGINEERING_EXCELLENCE",
};

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "File CSV obbligatorio" }, { status: 400 });
  }

  const text = await file.text();
  const { data, errors: parseErrors } = Papa.parse<ResourceRow>(text, {
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
    lastName: string;
    firstName: string;
    employeeId: string | null;
    type: string;
    belonging: string;
    isPTF: boolean;
    notes: string | null;
  }
  const validRows: ValidRow[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2;

    const lastName = row.cognome?.trim();
    const firstName = row.nome?.trim();
    if (!lastName || !firstName) {
      rowErrors.push({ row: rowNum, field: "cognome/nome", message: "Cognome e nome obbligatori" });
      continue;
    }

    const type = TYPE_MAP[row.tipologia?.trim()];
    if (!type) {
      rowErrors.push({ row: rowNum, field: "tipologia", message: `Tipologia non valida: "${row.tipologia}"` });
      continue;
    }

    const belonging = BELONGING_MAP[row.appartenenza?.trim()];
    if (!belonging) {
      rowErrors.push({ row: rowNum, field: "appartenenza", message: `Appartenenza non valida: "${row.appartenenza}"` });
      continue;
    }

    validRows.push({
      rowNum,
      lastName,
      firstName,
      employeeId: row.id_dipendente?.trim() || null,
      type,
      belonging,
      isPTF: row.is_ptf?.trim().toLowerCase() === "true" || row.is_ptf?.trim() === "1",
      notes: row.note?.trim() || null,
    });
  }

  // Phase 2: batch-load all existing resources
  const allResources = await prisma.resource.findMany({
    select: { id: true, firstName: true, lastName: true, employeeId: true, notes: true },
  });
  const byEmployeeId = new Map<string, typeof allResources[0]>();
  const byName = new Map<string, typeof allResources[0]>();
  for (const r of allResources) {
    if (r.employeeId) byEmployeeId.set(r.employeeId, r);
    byName.set(`${r.lastName}|${r.firstName}`, r);
  }

  // Phase 3: separate creates and updates
  let importedCount = 0;
  let updatedCount = 0;

  const toCreate: Array<{
    lastName: string;
    firstName: string;
    employeeId: string | null;
    type: string;
    belonging: string;
    isPTF: boolean;
    notes: string | null;
  }> = [];
  const updateOps: Array<ReturnType<typeof prisma.resource.update>> = [];

  for (const row of validRows) {
    const existing = (row.employeeId && byEmployeeId.get(row.employeeId))
      || byName.get(`${row.lastName}|${row.firstName}`);

    if (existing) {
      updateOps.push(
        prisma.resource.update({
          where: { id: existing.id },
          data: {
            employeeId: row.employeeId || existing.employeeId,
            type: row.type as never,
            belonging: row.belonging as never,
            isPTF: row.isPTF,
            notes: row.notes || existing.notes,
          },
        })
      );
    } else {
      toCreate.push({
        lastName: row.lastName,
        firstName: row.firstName,
        employeeId: row.employeeId,
        type: row.type as never,
        belonging: row.belonging as never,
        isPTF: row.isPTF,
        notes: row.notes,
      });
    }
  }

  if (toCreate.length > 0) {
    const result = await prisma.resource.createMany({ data: toCreate as never[] });
    importedCount = result.count;
  }

  if (updateOps.length > 0) {
    const BATCH_SIZE = 50;
    for (let i = 0; i < updateOps.length; i += BATCH_SIZE) {
      await prisma.$transaction(updateOps.slice(i, i + BATCH_SIZE));
    }
    updatedCount = updateOps.length;
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
