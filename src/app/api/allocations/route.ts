import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAllocationSchema } from "@/lib/validators/allocation";
import { calculateEffortDays } from "@/lib/business-rules/working-days";
import { reEvaluateInitiativeStatus } from "@/lib/business-rules/initiative-status";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const resourceId = searchParams.get("resourceId");
  const initiativeId = searchParams.get("initiativeId");

  const where: Record<string, unknown> = {};
  if (resourceId) where.resourceId = resourceId;
  if (initiativeId) where.initiativeId = initiativeId;

  const allocations = await prisma.allocation.findMany({
    where,
    include: {
      initiative: { include: { application: true, contract: true } },
      resource: true,
    },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(allocations);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createAllocationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dati non validi", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { startDate, endDate, softLockExpiry, allocatedEffortDays, ...data } = parsed.data;
  const allocationStart = new Date(startDate);
  const allocationEnd = new Date(endDate);

  const effortDays = allocatedEffortDays
    ?? calculateEffortDays(allocationStart, allocationEnd, data.allocationPercentage);

  const initiative = await prisma.initiative.findUnique({
    where: { id: data.initiativeId },
    include: { contract: true },
  });

  if (!initiative) {
    return NextResponse.json({ error: "Iniziativa non trovata" }, { status: 404 });
  }

  const warnings: string[] = [];

  if (initiative.contract && allocationEnd > initiative.contract.endDate) {
    warnings.push(
      `Data fine allocazione (${allocationEnd.toLocaleDateString("it-IT")}) supera data fine contratto (${initiative.contract.endDate.toLocaleDateString("it-IT")})`
    );
  }

  if (warnings.length > 0 && !body.confirm) {
    return NextResponse.json(
      { warnings, requiresConfirmation: true },
      { status: 409 }
    );
  }

  const allocation = await prisma.allocation.create({
    data: {
      ...data,
      allocatedEffortDays: effortDays,
      startDate: allocationStart,
      endDate: allocationEnd,
      softLockExpiry: softLockExpiry ? new Date(softLockExpiry) : null,
    },
    include: {
      initiative: { include: { application: true } },
      resource: true,
    },
  });

  const statusChange = await reEvaluateInitiativeStatus(prisma, data.initiativeId);

  return NextResponse.json({ ...allocation, statusChange }, { status: 201 });
}
