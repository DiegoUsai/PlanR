import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function decimalToNumber(d: unknown): number {
  if (d === null || d === undefined) return 0;
  return Number(d);
}

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const softLocks = await prisma.allocation.findMany({
      where: {
        lockType: "SOFT",
        endDate: { gte: today },
      },
      include: {
        resource: { include: { parameters: { orderBy: { validFrom: "desc" } } } },
        initiative: {
          include: { application: true },
        },
      },
    });

    let totalValue = 0;
    const items = softLocks.map((alloc) => {
      const param = alloc.resource.parameters.find((p) => {
        const from = new Date(p.validFrom);
        const to = p.validTo ? new Date(p.validTo) : null;
        return from <= today && (!to || to >= today);
      });

      const dailyCost = param ? decimalToNumber(param.dailyCost) : 0;
      const value =
        decimalToNumber(alloc.allocatedEffortDays) * dailyCost;
      totalValue += value;

      return {
        id: alloc.id,
        resourceName: `${alloc.resource.lastName} ${alloc.resource.firstName}`,
        initiativeTitle: alloc.initiative.title,
        applicationName: alloc.initiative.application.name,
        effortDays: decimalToNumber(alloc.allocatedEffortDays),
        startDate: alloc.startDate,
        endDate: alloc.endDate,
        softLockExpiry: alloc.softLockExpiry,
        value,
      };
    });

    const uniqueResources = new Set(softLocks.map((a) => a.resourceId)).size;

    return NextResponse.json({
      items,
      totalValue,
      totalSoftLocks: softLocks.length,
      uniqueResources,
    });
  } catch {
    return NextResponse.json({
      items: [],
      totalValue: 0,
      totalSoftLocks: 0,
      uniqueResources: 0,
    });
  }
}
