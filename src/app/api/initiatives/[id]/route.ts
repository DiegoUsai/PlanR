import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateInitiativeSchema } from "@/lib/validators/initiative";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const initiative = await prisma.initiative.findUnique({
    where: { id },
    include: {
      application: true,
      contract: true,
      module: true,
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
  const parsed = updateInitiativeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dati non validi", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    desiredStartDate,
    desiredEndDate,
    ...data
  } = parsed.data;

  const updateData: Record<string, unknown> = { ...data };
  if (desiredStartDate !== undefined)
    updateData.desiredStartDate = desiredStartDate ? new Date(desiredStartDate) : null;
  if (desiredEndDate !== undefined)
    updateData.desiredEndDate = desiredEndDate ? new Date(desiredEndDate) : null;

  const initiative = await prisma.initiative.update({
    where: { id },
    data: updateData,
    include: { application: true, contract: true, module: true },
  });

  return NextResponse.json(initiative);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const [allocations, consuntivi] = await Promise.all([
    prisma.allocation.count({ where: { initiativeId: id } }),
    prisma.consuntivo.count({ where: { initiativeId: id } }),
  ]);

  const deps = allocations + consuntivi;
  if (deps > 0) {
    const parts = [];
    if (allocations > 0) parts.push(`${allocations} allocazioni`);
    if (consuntivi > 0) parts.push(`${consuntivi} consuntivi`);
    return NextResponse.json(
      { error: `Impossibile eliminare: ${parts.join(", ")} collegate` },
      { status: 409 }
    );
  }

  await prisma.initiative.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
