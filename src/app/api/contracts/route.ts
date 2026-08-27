import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createContractSchema } from "@/lib/validators/contract";

export async function GET() {
  const contracts = await prisma.contract.findMany({
    include: {
      applications: true,
      _count: { select: { initiatives: true } },
    },
    orderBy: { endDate: "asc" },
  });
  return NextResponse.json(contracts);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createContractSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dati non validi", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { applicationIds, startDate, endDate, ...data } = parsed.data;

  const contract = await prisma.contract.create({
    data: {
      ...data,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      applications: applicationIds?.length
        ? { connect: applicationIds.map((id) => ({ id })) }
        : undefined,
    },
    include: { applications: true },
  });

  return NextResponse.json(contract, { status: 201 });
}
