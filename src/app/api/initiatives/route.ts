import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createInitiativeSchema } from "@/lib/validators/initiative";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get("applicationId");
  const contractId = searchParams.get("contractId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (applicationId) where.applicationId = applicationId;
  if (contractId) where.contractId = contractId;
  if (status) where.status = status;

  const initiatives = await prisma.initiative.findMany({
    where,
    include: {
      application: true,
      contract: true,
      module: true,
      _count: { select: { allocations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(initiatives);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createInitiativeSchema.safeParse(body);

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

  const initiative = await prisma.initiative.create({
    data: {
      ...data,
      desiredStartDate: desiredStartDate ? new Date(desiredStartDate) : null,
      desiredEndDate: desiredEndDate ? new Date(desiredEndDate) : null,
      softLockExpiry: softLockExpiry ? new Date(softLockExpiry) : null,
    },
    include: { application: true, contract: true, module: true },
  });

  return NextResponse.json(initiative, { status: 201 });
}
