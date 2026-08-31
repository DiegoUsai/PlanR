import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAbsenceSchema } from "@/lib/validators/absence";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const resourceId = searchParams.get("resourceId");

  const where: Record<string, unknown> = {};
  if (resourceId) where.resourceId = resourceId;

  const absences = await prisma.absence.findMany({
    where,
    include: { resource: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(absences);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createAbsenceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dati non validi", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { date, ...data } = parsed.data;

  const absence = await prisma.absence.create({
    data: {
      ...data,
      date: new Date(date),
    },
  });

  return NextResponse.json(absence, { status: 201 });
}
