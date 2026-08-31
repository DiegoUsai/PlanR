import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

interface AbsenceRow {
  nominativo: string;
  giorno: string;
  ore_assenza: string;
}

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
  let importedCount = 0;
  let updatedCount = 0;

  const resourceCache = new Map<string, string>();

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

    let resourceId = resourceCache.get(nominativo);
    if (!resourceId) {
      const parts = nominativo.split(/\s+/);
      const lastName = parts[0] || "";
      const firstName = parts.slice(1).join(" ") || "";
      const resource = await prisma.resource.findFirst({
        where: { lastName, firstName },
      });
      if (!resource) {
        rowErrors.push({ row: rowNum, field: "nominativo", message: `Risorsa non trovata: "${nominativo}"` });
        continue;
      }
      resourceId = resource.id;
      resourceCache.set(nominativo, resourceId);
    }

    const absenceDate = new Date(dateStr);

    const existing = await prisma.absence.findUnique({
      where: { resourceId_startDate: { resourceId, startDate: absenceDate } },
    });

    if (existing) {
      await prisma.absence.update({
        where: { id: existing.id },
        data: { hours, endDate: absenceDate },
      });
      updatedCount++;
    } else {
      await prisma.absence.create({
        data: {
          resourceId,
          startDate: absenceDate,
          endDate: absenceDate,
          type: "FERIE",
          hours,
        },
      });
      importedCount++;
    }
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
