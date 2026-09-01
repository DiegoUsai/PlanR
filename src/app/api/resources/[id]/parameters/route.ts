import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createResourceParameterSchema } from "@/lib/validators/resource";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const parameters = await prisma.resourceParameter.findMany({
    where: { resourceId: id },
    orderBy: { validFrom: "desc" },
  });
  return NextResponse.json(parameters);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const parsed = createResourceParameterSchema.safeParse({
    ...body,
    resourceId: id,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dati non validi", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { validFrom, validTo, ...data } = parsed.data;
  const newValidFrom = new Date(validFrom);

  try {
    const existing = await prisma.resourceParameter.findFirst({
      where: {
        resourceId: id,
        validTo: null,
        validFrom: newValidFrom,
      },
    });

    if (existing) {
      const parameter = await prisma.resourceParameter.update({
        where: { id: existing.id },
        data: {
          ...data,
          resourceId: id,
          validTo: validTo ? new Date(validTo) : null,
        },
      });
      return NextResponse.json(parameter);
    }

    await prisma.resourceParameter.updateMany({
      where: {
        resourceId: id,
        validTo: null,
        validFrom: { lt: newValidFrom },
      },
      data: {
        validTo: new Date(newValidFrom.getTime() - 86400000),
      },
    });

    const parameter = await prisma.resourceParameter.create({
      data: {
        ...data,
        validFrom: newValidFrom,
        validTo: validTo ? new Date(validTo) : null,
      },
    });

    return NextResponse.json(parameter, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore nel salvataggio parametri";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
