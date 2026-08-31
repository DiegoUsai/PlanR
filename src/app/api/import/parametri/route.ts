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
}

const ROLE_MAP: Record<string, string> = {
  FE: "FE", Frontend: "FE",
  BE: "BE", Backend: "BE",
  Analista: "ANALISTA", ANALISTA: "ANALISTA",
  "Tech Lead": "TECH_LEAD", TECH_LEAD: "TECH_LEAD",
  Architetto: "ARCHITETTO", ARCHITETTO: "ARCHITETTO",
  PM: "PM", "Project Manager": "PM",
  "BA Senior": "BA_SENIOR", BA_SENIOR: "BA_SENIOR",
  Altro: "ALTRO", ALTRO: "ALTRO",
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
  let importedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2;

    const employeeId = row.id_dipendente?.trim();
    if (!employeeId) {
      rowErrors.push({ row: rowNum, field: "id_dipendente", message: "ID dipendente obbligatorio" });
      continue;
    }

    const resource = await prisma.resource.findFirst({
      where: { employeeId },
    });
    if (!resource) {
      rowErrors.push({ row: rowNum, field: "id_dipendente", message: `Risorsa non trovata: "${employeeId}"` });
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

    const weeklyHours = Number(row.ore_settimanali?.trim());
    if (!weeklyHours || weeklyHours <= 0) {
      rowErrors.push({ row: rowNum, field: "ore_settimanali", message: "Ore settimanali non valide" });
      continue;
    }

    const dailyCost = Number(row.costo_giornata?.trim());
    if (isNaN(dailyCost) || dailyCost < 0) {
      rowErrors.push({ row: rowNum, field: "costo_giornata", message: "Costo giornata non valido" });
      continue;
    }

    const coeff = Number(row.coefficiente_produttivita?.trim()) || 1;
    const buffer = row.buffer_ore_settimanali?.trim()
      ? Number(row.buffer_ore_settimanali.trim())
      : null;

    const validFromStr = row.data_inizio_validita?.trim();
    if (!validFromStr || !/^\d{4}-\d{2}-\d{2}$/.test(validFromStr)) {
      rowErrors.push({ row: rowNum, field: "data_inizio_validita", message: "Data inizio validita obbligatoria (YYYY-MM-DD)" });
      continue;
    }
    const validFrom = new Date(validFromStr);

    // Close previous current parameter (set validTo = validFrom - 1 day)
    const currentParam = await prisma.resourceParameter.findFirst({
      where: { resourceId: resource.id, validTo: null },
      orderBy: { validFrom: "desc" },
    });

    if (currentParam) {
      const closingDate = new Date(validFrom);
      closingDate.setDate(closingDate.getDate() - 1);
      await prisma.resourceParameter.update({
        where: { id: currentParam.id },
        data: { validTo: closingDate },
      });
      updatedCount++;
    }

    await prisma.resourceParameter.create({
      data: {
        resourceId: resource.id,
        role: role as never,
        level: level as never,
        weeklyHours,
        dailyCost,
        productivityCoeff: coeff,
        weeklyHoursBuffer: buffer,
        validFrom,
        validTo: null,
      },
    });
    importedCount++;
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
