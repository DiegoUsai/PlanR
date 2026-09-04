import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const initiative = await prisma.initiative.findUnique({
    where: { id },
    include: {
      application: true,
      contract: true,
      modules: true,
      allocations: {
        include: { resource: true },
        orderBy: { startDate: "asc" },
      },
    },
  });

  if (!initiative) {
    return NextResponse.json({ error: "Iniziativa non trovata" }, { status: 404 });
  }

  return NextResponse.json(initiative);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  if (typeof body.notes !== "string" && body.notes !== null) {
    return NextResponse.json(
      { error: "Solo il campo 'notes' è modificabile" },
      { status: 400 }
    );
  }

  const initiative = await prisma.initiative.update({
    where: { id },
    data: { notes: body.notes },
    include: { application: true, contract: true, modules: true },
  });

  return NextResponse.json(initiative);
}
