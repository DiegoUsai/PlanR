import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAllocationSchema } from "@/lib/validators/allocation";

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

  const { startDate, endDate, ...data } = parsed.data;
  const allocationStart = new Date(startDate);
  const allocationEnd = new Date(endDate);

  const initiative = await prisma.initiative.findUnique({
    where: { id: data.initiativeId },
    include: { contract: true },
  });

  if (!initiative) {
    return NextResponse.json({ error: "Iniziativa non trovata" }, { status: 404 });
  }

  if (allocationEnd > initiative.contract.endDate) {
    return NextResponse.json(
      {
        error: "Data fine allocazione supera data fine contratto",
        contractEndDate: initiative.contract.endDate,
      },
      { status: 422 }
    );
  }

  const allocation = await prisma.allocation.create({
    data: {
      ...data,
      startDate: allocationStart,
      endDate: allocationEnd,
    },
    include: {
      initiative: { include: { application: true } },
      resource: true,
    },
  });

  return NextResponse.json(allocation, { status: 201 });
}
