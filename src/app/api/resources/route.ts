import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createResourceSchema } from "@/lib/validators/resource";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pool = searchParams.get("pool");
  const role = searchParams.get("role");
  const belonging = searchParams.get("belonging");

  const where: Record<string, unknown> = {};
  if (pool) where.pool = pool;
  if (role) where.role = role;
  if (belonging) where.belonging = belonging;

  const resources = await prisma.resource.findMany({
    where,
    include: {
      parameters: {
        where: { validTo: null },
        take: 1,
      },
      _count: { select: { allocations: true } },
    },
    orderBy: { name: "asc" },
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
