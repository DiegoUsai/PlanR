import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeInitiativeStatus } from "@/lib/business-rules/initiative-status";

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

  const totalAllocatedDays = initiative.allocations.reduce(
    (sum: number, a) => sum + Number(a.allocatedEffortDays),
    0
  );
  const hasHardLockOnly =
    initiative.allocations.length > 0 &&
    initiative.allocations.every((a) => a.lockType === "HARD");
  const lastAllocationEndDate =
    initiative.allocations.length > 0
      ? new Date(
          Math.max(...initiative.allocations.map((a) => a.endDate.getTime()))
        )
      : null;

  const correctStatus = computeInitiativeStatus({
    statoJira: initiative.statoJira,
    estimatedDays: initiative.estimatedDays ? Number(initiative.estimatedDays) : null,
    totalAllocatedDays,
    hasHardLockOnly,
    lastAllocationEndDate,
  });

  if (correctStatus !== initiative.status) {
    await prisma.initiative.update({
      where: { id },
      data: { status: correctStatus },
    });
    return NextResponse.json({ ...initiative, status: correctStatus });
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
