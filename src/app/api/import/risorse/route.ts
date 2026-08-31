import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

interface ResourceRow {
  nominativo: string;
  ruolo: string;
  livello: string;
  tipologia: string;
  appartenenza: string;
  pool: string;
  is_ptf: string;
  note: string;
}

const ROLE_MAP: Record<string, string> = {
  FE: "FE", BE: "BE", Analista: "ANALISTA", "Tech Lead": "TECH_LEAD",
  Architetto: "ARCHITETTO", PM: "PM", "BA Senior": "BA_SENIOR", Altro: "ALTRO",
  ANALISTA: "ANALISTA", TECH_LEAD: "TECH_LEAD", ARCHITETTO: "ARCHITETTO",
  BA_SENIOR: "BA_SENIOR", ALTRO: "ALTRO",
};

const LEVEL_MAP: Record<string, string> = {
  Junior: "JUNIOR", Mid: "MID", Senior: "SENIOR",
  JUNIOR: "JUNIOR", MID: "MID", SENIOR: "SENIOR",
};

const TYPE_MAP: Record<string, string> = {
  Interna: "INTERNA", Esterna: "ESTERNA", INTERNA: "INTERNA", ESTERNA: "ESTERNA",
};

const BELONGING_MAP: Record<string, string> = {
  "BU Documentale": "BU_DOCUMENTALE", "Engineering Excellence": "ENGINEERING_EXCELLENCE",
  BU_DOCUMENTALE: "BU_DOCUMENTALE", ENGINEERING_EXCELLENCE: "ENGINEERING_EXCELLENCE",
};

const POOL_MAP: Record<string, string> = {
  Manutenzione: "MANUTENZIONE", Evolutiva: "EVOLUTIVA_ADEGUATIVA",
  "Evolutiva/Adeguativa": "EVOLUTIVA_ADEGUATIVA",
  MANUTENZIONE: "MANUTENZIONE", EVOLUTIVA_ADEGUATIVA: "EVOLUTIVA_ADEGUATIVA",
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
  let importedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2;

    const name = row.nominativo?.trim();
    if (!name) {
      rowErrors.push({ row: rowNum, field: "nominativo", message: "Nominativo mancante" });
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

    const pool = POOL_MAP[row.pool?.trim()];
    if (!pool) {
      rowErrors.push({ row: rowNum, field: "pool", message: `Pool non valido: "${row.pool}"` });
      continue;
    }

    const isPTF = row.is_ptf?.trim().toLowerCase() === "true" || row.is_ptf?.trim() === "1";

    const existing = await prisma.resource.findFirst({ where: { name } });

    if (existing) {
      await prisma.resource.update({
        where: { id: existing.id },
        data: {
          role: role as never,
          level: level as never,
          type: type as never,
          belonging: belonging as never,
          pool: pool as never,
          isPTF: isPTF,
          notes: row.note?.trim() || existing.notes,
        },
      });
      updatedCount++;
    } else {
      await prisma.resource.create({
        data: {
          name,
          role: role as never,
          level: level as never,
          type: type as never,
          belonging: belonging as never,
          pool: pool as never,
          isPTF: isPTF,
          notes: row.note?.trim() || null,
        },
      });
      importedCount++;
    }
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
