import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateResourceSchema } from "@/lib/validators/resource";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const resource = await prisma.resource.findUnique({
    where: { id },
    include: {
      parameters: { orderBy: { validFrom: "desc" } },
      allocations: {
        include: { initiative: { include: { application: true } } },
        orderBy: { startDate: "desc" },
      },
      absences: { orderBy: { startDate: "desc" } },
      managedApps: true,
    },
  });

  if (!resource) {
    return NextResponse.json({ error: "Risorsa non trovata" }, { status: 404 });
  }

  return NextResponse.json(resource);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateResourceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dati non validi", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { joinDate, ...data } = parsed.data;

  const resource = await prisma.resource.update({
    where: { id },
    data: {
      ...data,
      joinDate: joinDate ? new Date(joinDate) : undefined,
    },
  });

  return NextResponse.json(resource);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const [allocations, consuntivi, parameters, absences] = await Promise.all([
    prisma.allocation.count({ where: { resourceId: id } }),
    prisma.consuntivo.count({ where: { resourceId: id } }),
    prisma.resourceParameter.count({ where: { resourceId: id } }),
    prisma.absence.count({ where: { resourceId: id } }),
  ]);

  const deps = allocations + consuntivi + parameters + absences;
  if (deps > 0) {
    const parts = [];
    if (allocations > 0) parts.push(`${allocations} allocazioni`);
    if (consuntivi > 0) parts.push(`${consuntivi} consuntivi`);
    if (parameters > 0) parts.push(`${parameters} parametri`);
    if (absences > 0) parts.push(`${absences} assenze`);
    return NextResponse.json(
      { error: `Impossibile eliminare: ${parts.join(", ")} collegate` },
      { status: 409 }
    );
  }

  await prisma.resource.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
