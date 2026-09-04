import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      modules: true,
      _count: { select: { allocations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(initiatives);
}
