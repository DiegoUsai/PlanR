import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateAllocationSchema } from "@/lib/validators/allocation";

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

  const { startDate, endDate, ...data } = parsed.data;
  const updateData: Record<string, unknown> = { ...data };

  if (startDate) updateData.startDate = new Date(startDate);
  if (endDate) updateData.endDate = new Date(endDate);

  if (endDate) {
    const current = await prisma.allocation.findUnique({
      where: { id },
      include: { initiative: { include: { contract: true } } },
    });

    if (current && new Date(endDate) > current.initiative.contract.endDate) {
      return NextResponse.json(
        {
          error: "Data fine allocazione supera data fine contratto",
          contractEndDate: current.initiative.contract.endDate,
        },
        { status: 422 }
      );
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
