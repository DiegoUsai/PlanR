import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createResourceSchema } from "@/lib/validators/resource";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");
  const belonging = searchParams.get("belonging");

  const where: Record<string, unknown> = {};
  if (belonging) where.belonging = belonging;
  const now = new Date();
  if (role) {
    where.parameters = {
      some: {
        role,
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
      },
    };
  }

  const resources = await prisma.resource.findMany({
    where,
    include: {
      parameters: {
        where: {
          validFrom: { lte: now },
          OR: [{ validTo: null }, { validTo: { gte: now } }],
        },
        orderBy: { validFrom: "desc" },
        take: 1,
      },
      _count: { select: { allocations: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json(resources);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createResourceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dati non validi", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { joinDate, ...data } = parsed.data;

  const resource = await prisma.resource.create({
    data: {
      ...data,
      joinDate: joinDate ? new Date(joinDate) : undefined,
    },
  });

  return NextResponse.json(resource, { status: 201 });
}
