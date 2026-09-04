import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeInitiativeStatus } from "@/lib/business-rules/initiative-status";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const candidates = await prisma.initiative.findMany({
    where: { status: "CONFERMATO_HARD_LOCK" },
    include: {
      allocations: {
        select: { allocatedEffortDays: true, lockType: true, endDate: true },
      },
    },
  });

  let updatedCount = 0;

  for (const init of candidates) {
    const totalAllocatedDays = init.allocations.reduce(
      (sum: number, a: { allocatedEffortDays: unknown }) =>
        sum + Number(a.allocatedEffortDays),
      0
    );
    const hasHardLockOnly =
      init.allocations.length > 0 &&
      init.allocations.every((a: { lockType: string }) => a.lockType === "HARD");
    const lastAllocationEndDate =
      init.allocations.length > 0
        ? new Date(
            Math.max(...init.allocations.map((a: { endDate: Date }) => a.endDate.getTime()))
          )
        : null;

    const newStatus = computeInitiativeStatus({
      statoJira: init.statoJira,
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
      updatedCount++;
    }
  }

  return NextResponse.json({
    evaluated: candidates.length,
    updated: updatedCount,
    timestamp: new Date().toISOString(),
  });
}
