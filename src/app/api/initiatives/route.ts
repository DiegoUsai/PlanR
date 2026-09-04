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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const staleIds: string[] = [];
  for (const init of initiatives) {
    if (init.status !== "CONFERMATO_HARD_LOCK") continue;
    const lastAlloc = await prisma.allocation.findFirst({
      where: { initiativeId: init.id },
      orderBy: { endDate: "desc" },
      select: { endDate: true },
    });
    if (lastAlloc && lastAlloc.endDate < today) {
      staleIds.push(init.id);
    }
  }

  if (staleIds.length > 0) {
    await prisma.initiative.updateMany({
      where: { id: { in: staleIds } },
      data: { status: "COMPLETATO" },
    });
    for (const init of initiatives) {
      if (staleIds.includes(init.id)) {
        (init as Record<string, unknown>).status = "COMPLETATO";
      }
    }
  }

  return NextResponse.json(initiatives);
}
