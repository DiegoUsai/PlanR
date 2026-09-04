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

    const config = await prisma.bUConfiguration.findFirst();
    const globalBuffer = config ? decimalToNumber(config.weeklyHoursBuffer) : 8;
    const annualBudget = config ? decimalToNumber(config.annualBudget) : 0;

    const [
      totalResources,
      activeResources,
      totalInitiatives,
      initiatives,
      totalContracts,
      activeAlerts,
    ] = await Promise.all([
      prisma.resource.count(),
      prisma.resource.count({ where: { attivo: true } }),
      prisma.initiative.count(),
      prisma.initiative.findMany({
        select: { status: true, economicValue: true },
      }),
      prisma.contract.count(),
      prisma.alert.count({
        where: { status: { in: ["ATTIVO", "PRESO_IN_CARICO"] } },
      }),
    ]);

    // Status distribution for donut
    const statusDistribution: Record<string, number> = {};
    for (const init of initiatives) {
      statusDistribution[init.status] =
        (statusDistribution[init.status] ?? 0) + 1;
    }

    // Average saturation (current week)
    const resources = await prisma.resource.findMany({
      where: { attivo: true },
      include: {
        parameters: { orderBy: { validFrom: "desc" } },
        allocations: {
          where: {
            endDate: { gte: today },
            startDate: { lte: today },
          },
        },
        absences: {
          where: {
            date: today,
          },
        },
      },
    });

    let totalSat = 0;
    let satCount = 0;

    for (const resource of resources) {
      const param = resource.parameters.find((p) => {
        const from = new Date(p.validFrom);
        const to = p.validTo ? new Date(p.validTo) : null;
        return from <= today && (!to || to >= today);
      });
      if (!param) continue;

      const weeklyHours = decimalToNumber(param.weeklyHours);
      const buffer = param.weeklyHoursBuffer
        ? decimalToNumber(param.weeklyHoursBuffer)
        : globalBuffer;

      let allocHours = 0;
      for (const alloc of resource.allocations) {
        const days = decimalToNumber(alloc.allocatedEffortDays);
        const aStart = new Date(alloc.startDate);
        const aEnd = new Date(alloc.endDate);
        const totalWeeks = Math.max(
          1,
          Math.ceil(
            (aEnd.getTime() - aStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
          )
        );
        allocHours += (days * 8) / totalWeeks;
      }

      let absHours = 0;
      for (const abs of resource.absences) {
        absHours += decimalToNumber(abs.hours);
      }

      const capacity = Math.max(0, weeklyHours - buffer - absHours);
      const sat = capacity > 0 ? (allocHours / capacity) * 100 : 0;
      totalSat += sat;
      satCount++;
    }

    const avgSaturation =
      satCount > 0 ? Math.round(totalSat / satCount) : 0;

    function parseEconomicValue(val: string | null): number {
      if (!val) return 0;
      const v = val.toLowerCase().replace(/\s/g, "");
      if (v.includes(">40") || v.includes(">40")) return 45000;
      if (v.includes("30") && v.includes("40")) return 35000;
      if (v.includes("20") && v.includes("30")) return 25000;
      if (v.includes("15") && v.includes("20")) return 17500;
      if (v.includes("10") && v.includes("15")) return 12500;
      if (v.includes("5") && v.includes("10")) return 7500;
      if (v.includes("<5") || v.includes("< 5")) return 2500;
      return 0;
    }

    let pipelineValue = 0;
    const pipelineByStatus: Record<string, number> = {};
    for (const init of initiatives) {
      if (init.status === "COMPLETATO" || init.status === "REJECTED")
        continue;
      const val = parseEconomicValue(init.economicValue);
      pipelineValue += val;
      pipelineByStatus[init.status] =
        (pipelineByStatus[init.status] ?? 0) + val;
    }

    return NextResponse.json({
      totalResources,
      activeResources,
      totalInitiatives,
      totalContracts,
      activeAlerts,
      avgSaturation,
      statusDistribution,
      pipelineValue,
      pipelineByStatus,
      annualBudget,
    });
  } catch {
    return NextResponse.json({
      totalResources: 0,
      activeResources: 0,
      totalInitiatives: 0,
      totalContracts: 0,
      activeAlerts: 0,
      avgSaturation: 0,
      statusDistribution: {},
      pipelineValue: 0,
      pipelineByStatus: {},
      annualBudget: 0,
    });
  }
}
