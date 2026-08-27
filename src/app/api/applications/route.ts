import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createApplicationSchema } from "@/lib/validators/application";

export async function GET() {
  const applications = await prisma.application.findMany({
    include: {
      contracts: true,
      assignedPMs: true,
      modules: true,
      _count: { select: { initiatives: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(applications);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createApplicationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dati non validi", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { contractIds, pmIds, ...data } = parsed.data;

  const application = await prisma.application.create({
    data: {
      ...data,
      contracts: contractIds?.length
        ? { connect: contractIds.map((id) => ({ id })) }
        : undefined,
      assignedPMs: pmIds?.length
        ? { connect: pmIds.map((id) => ({ id })) }
        : undefined,
    },
    include: { contracts: true, assignedPMs: true, modules: true },
  });

  return NextResponse.json(application, { status: 201 });
}
