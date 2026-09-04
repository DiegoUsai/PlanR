import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeInitiativeStatus } from "@/lib/business-rules/initiative-status";

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
    issueKey: string | null;
    oldStatus: string;
    newStatus: string;
  }> = [];

  if (affectedInitiativeIds.length > 0) {
    const initiatives = await prisma.initiative.findMany({
      where: { id: { in: affectedInitiativeIds } },
      include: {
        allocations: {
          select: {
            allocatedEffortDays: true,
            lockType: true,
            endDate: true,
          },
        },
      },
    });

    for (const init of initiatives) {
      const totalAllocatedDays = init.allocations.reduce(
        (sum: number, a: { allocatedEffortDays: unknown }) =>
          sum + Number(a.allocatedEffortDays),
        0
      );
      const hasHardLockOnly =
        init.allocations.length > 0 &&
        init.allocations.every((a: { lockType: string }) => a.lockType === "HARD");
      const lastAllocationEndDate = init.allocations.length > 0
        ? new Date(
            Math.max(...init.allocations.map((a: { endDate: Date }) => a.endDate.getTime()))
          )
        : null;

      const newStatus = computeInitiativeStatus({
        statoJira: init.statoJira || "",
        estimatedDays: init.estimatedDays ? Number(init.estimatedDays) : null,
        totalAllocatedDays,
        hasHardLockOnly,
        lastAllocationEndDate,
        today,
      });

      if (newStatus !== init.status) {
        await prisma.initiative.update({
          where: { id: init.id },
          data: { status: newStatus },
        });
        reEvaluated.push({
          id: init.id,
          issueKey: init.issueKey,
          oldStatus: init.status,
          newStatus,
        });
      }
    }
  }

  return NextResponse.json({
    deactivatedCount: resourceIds.length,
    releasedAllocationsCount: futureAllocations.length,
    reEvaluatedInitiatives: reEvaluated,
  });
}
