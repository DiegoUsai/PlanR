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
    softLockExpiry,
    ...data
  } = parsed.data;

  const updateData: Record<string, unknown> = { ...data };
  if (desiredStartDate !== undefined)
    updateData.desiredStartDate = desiredStartDate ? new Date(desiredStartDate) : null;
  if (desiredEndDate !== undefined)
    updateData.desiredEndDate = desiredEndDate ? new Date(desiredEndDate) : null;
  if (softLockExpiry !== undefined)
    updateData.softLockExpiry = softLockExpiry ? new Date(softLockExpiry) : null;

  const initiative = await prisma.initiative.update({
    where: { id },
    data: updateData,
    include: { application: true, contract: true, module: true },
  });

  return NextResponse.json(initiative);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const deps = await prisma.allocation.count({ where: { initiativeId: id } });
  if (deps > 0) {
    return NextResponse.json(
      { error: `Impossibile eliminare: ${deps} allocazioni collegate` },
      { status: 409 }
    );
  }

  await prisma.initiative.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
