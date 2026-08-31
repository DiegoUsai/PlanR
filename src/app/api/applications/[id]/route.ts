import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateApplicationSchema } from "@/lib/validators/application";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      contracts: true,
      assignedPMs: true,
      modules: true,
      initiatives: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Applicativo non trovato" }, { status: 404 });
  }

  return NextResponse.json(application);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateApplicationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dati non validi", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { contractIds, pmIds, ...data } = parsed.data;

  const application = await prisma.application.update({
    where: { id },
    data: {
      ...data,
      contracts: contractIds
        ? { set: contractIds.map((cid) => ({ id: cid })) }
        : undefined,
      assignedPMs: pmIds
        ? { set: pmIds.map((pid) => ({ id: pid })) }
        : undefined,
    },
    include: { contracts: true, assignedPMs: true, modules: true },
  });

  return NextResponse.json(application);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const deps = await prisma.initiative.count({ where: { applicationId: id } });
  if (deps > 0) {
    return NextResponse.json(
      { error: `Impossibile eliminare: ${deps} iniziative collegate` },
      { status: 409 }
    );
  }

  await prisma.application.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
