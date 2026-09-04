import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reEvaluateInitiativeStatus } from "@/lib/business-rules/initiative-status";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const resourceIds: string[] = body.resourceIds;

  if (!Array.isArray(resourceIds) || resourceIds.length === 0) {
    return NextResponse.json(
      { error: "resourceIds obbligatorio (array non vuoto)" },
      { status: 400 }
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureAllocations = await prisma.allocation.findMany({
    where: {
      resourceId: { in: resourceIds },
      endDate: { gt: today },
    },
    select: { id: true, resourceId: true, initiativeId: true },
  });

  const affectedInitiativeIds = [
    ...new Set(futureAllocations.map((a) => a.initiativeId)),
  ];

  await prisma.$transaction([
    prisma.resource.updateMany({
      where: { id: { in: resourceIds } },
      data: { attivo: false },
    }),
    prisma.allocation.deleteMany({
      where: {
        resourceId: { in: resourceIds },
        endDate: { gt: today },
      },
    }),
  ]);

  const reEvaluated: Array<{
    id: string;
    oldStatus: string;
    newStatus: string;
  }> = [];

  for (const initiativeId of affectedInitiativeIds) {
    const result = await reEvaluateInitiativeStatus(prisma, initiativeId);
    if (result) {
      reEvaluated.push({ id: initiativeId, ...result });
    }
  }

  return NextResponse.json({
    deactivatedCount: resourceIds.length,
    releasedAllocationsCount: futureAllocations.length,
    reEvaluatedInitiatives: reEvaluated,
  });
}
