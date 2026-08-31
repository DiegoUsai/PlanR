import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function decimalToNumber(d: unknown): number {
  if (d === null || d === undefined) return 0;
  return Number(d);
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const config = await prisma.bUConfiguration.findFirst();
    const globalBuffer = config ? decimalToNumber(config.weeklyHoursBuffer) : 8;

    const horizonEnd = new Date(today);
    horizonEnd.setDate(horizonEnd.getDate() + 12 * 7);

    const resources = await prisma.resource.findMany({
      where: { attivo: true },
      include: {
        parameters: { orderBy: { validFrom: "desc" } },
        allocations: {
          where: {
            endDate: { gte: today },
            startDate: { lte: horizonEnd },
          },
        },
        absences: {
          where: {
            date: { gte: today, lte: horizonEnd },
          },
        },
      },
    });

    const weeks: string[] = [];
    const current = getWeekStart(today);
    for (let i = 0; i < 12; i++) {
      weeks.push(
        `${current.getDate().toString().padStart(2, "0")}/${(current.getMonth() + 1).toString().padStart(2, "0")}`
      );
      current.setDate(current.getDate() + 7);
    }

    const heatmap: {
      resourceId: string;
      resourceName: string;
      role: string;
      weeks: number[];
    }[] = [];

    const distribution = { under: 0, optimal: 0, warning: 0, over: 0 };
    let totalSaturation = 0;
    let saturationCount = 0;

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

      const weekValues: number[] = [];
      const weekStart = getWeekStart(today);

      for (let w = 0; w < 12; w++) {
        const wStart = new Date(weekStart);
        wStart.setDate(wStart.getDate() + w * 7);
        const wEnd = new Date(wStart);
        wEnd.setDate(wEnd.getDate() + 6);

        let allocHours = 0;
        for (const alloc of resource.allocations) {
          const aStart = new Date(alloc.startDate);
          const aEnd = new Date(alloc.endDate);
          if (aStart <= wEnd && aEnd >= wStart) {
            const days = decimalToNumber(alloc.allocatedEffortDays);
            const totalWeeks = Math.max(
              1,
              Math.ceil(
                (aEnd.getTime() - aStart.getTime()) /
                  (7 * 24 * 60 * 60 * 1000)
              )
            );
            allocHours += (days * 8) / totalWeeks;
          }
        }

        let absHours = 0;
        for (const abs of resource.absences) {
          const aDate = new Date(abs.date);
          if (aDate >= wStart && aDate <= wEnd) {
            absHours += decimalToNumber(abs.hours);
          }
        }

        const capacity = Math.max(0, weeklyHours - buffer - absHours);
        const sat = capacity > 0 ? Math.round((allocHours / capacity) * 100) : 0;
        weekValues.push(sat);

        if (w === 0) {
          totalSaturation += sat;
          saturationCount++;
          if (sat < 75) distribution.under++;
          else if (sat <= 85) distribution.optimal++;
          else if (sat <= 90) distribution.warning++;
          else distribution.over++;
        }
      }

      heatmap.push({
        resourceId: resource.id,
        resourceName: `${resource.lastName} ${resource.firstName}`,
        role: param.role,
        weeks: weekValues,
      });
    }

    return NextResponse.json({
      weeks,
      heatmap,
      distribution,
      avgSaturation:
        saturationCount > 0 ? Math.round(totalSaturation / saturationCount) : 0,
      totalResources: resources.length,
    });
  } catch {
    return NextResponse.json({
      weeks: [],
      heatmap: [],
      distribution: { under: 0, optimal: 0, warning: 0, over: 0 },
      avgSaturation: 0,
      totalResources: 0,
    });
  }
}
