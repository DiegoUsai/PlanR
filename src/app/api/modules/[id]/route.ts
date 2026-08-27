import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  const module = await prisma.module.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
    },
  });

  return NextResponse.json(module);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const deps = await prisma.initiative.count({ where: { moduleId: id } });
  if (deps > 0) {
    return NextResponse.json(
      { error: `Impossibile eliminare: ${deps} iniziative collegate` },
      { status: 409 }
    );
  }

  await prisma.module.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
