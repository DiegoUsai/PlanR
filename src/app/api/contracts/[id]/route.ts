import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateContractSchema } from "@/lib/validators/contract";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      client: true,
      applications: true,
      initiatives: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!contract) {
    return NextResponse.json({ error: "Contratto non trovato" }, { status: 404 });
  }

  return NextResponse.json(contract);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateContractSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dati non validi", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { applicationIds, startDate, endDate, ...data } = parsed.data;

  const contract = await prisma.contract.update({
    where: { id },
    data: {
      ...data,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      applications: applicationIds
        ? { set: applicationIds.map((aid) => ({ id: aid })) }
        : undefined,
    },
    include: { client: true, applications: true },
  });

  return NextResponse.json(contract);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const deps = await prisma.initiative.count({ where: { contractId: id } });
  if (deps > 0) {
    return NextResponse.json(
      { error: `Impossibile eliminare: ${deps} iniziative collegate` },
      { status: 409 }
    );
  }

  await prisma.contract.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
