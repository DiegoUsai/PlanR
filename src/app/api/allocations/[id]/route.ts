import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateAllocationSchema } from "@/lib/validators/allocation";
import { calculateEffortDays } from "@/lib/business-rules/working-days";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const allocation = await prisma.allocation.findUnique({
    where: { id },
    include: {
      initiative: { include: { application: true, contract: true } },
      resource: true,
    },
  });

  if (!allocation) {
    return NextResponse.json({ error: "Allocazione non trovata" }, { status: 404 });
  }

  return NextResponse.json(allocation);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateAllocationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dati non validi", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { startDate, endDate, softLockExpiry, allocatedEffortDays, ...data } = parsed.data;
  const updateData: Record<string, unknown> = { ...data };

  if (startDate) updateData.startDate = new Date(startDate);
  if (endDate) updateData.endDate = new Date(endDate);
  if (softLockExpiry !== undefined)
    updateData.softLockExpiry = softLockExpiry ? new Date(softLockExpiry) : null;

  if (allocatedEffortDays !== undefined) {
    updateData.allocatedEffortDays = allocatedEffortDays;
  } else if (startDate && endDate && data.allocationPercentage) {
    updateData.allocatedEffortDays = calculateEffortDays(
      new Date(startDate),
      new Date(endDate),
      data.allocationPercentage
    );
  }

  if (endDate) {
    const current = await prisma.allocation.findUnique({
      where: { id },
      include: { initiative: { include: { contract: true } } },
    });

    if (current?.initiative.contract && new Date(endDate) > current.initiative.contract.endDate) {
      if (!body.confirm) {
        return NextResponse.json(
          {
            warnings: [
              `Data fine allocazione (${new Date(endDate).toLocaleDateString("it-IT")}) supera data fine contratto (${current.initiative.contract.endDate.toLocaleDateString("it-IT")})`,
            ],
            requiresConfirmation: true,
          },
          { status: 409 }
        );
      }
    }
  }

  const allocation = await prisma.allocation.update({
    where: { id },
    data: updateData,
    include: {
      initiative: { include: { application: true } },
      resource: true,
    },
  });

  return NextResponse.json(allocation);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.allocation.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
