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
          include: {
            initiative: {
              include: { application: true },
            },
          },
        },
        absences: {
          where: {
            date: { gte: today, lte: horizonEnd },
          },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    const weeks: { label: string; start: string; end: string }[] = [];
    const weekStart = getWeekStart(today);
    for (let i = 0; i < 12; i++) {
      const wStart = new Date(weekStart);
      wStart.setDate(wStart.getDate() + i * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 6);
      weeks.push({
        label: `${wStart.getDate().toString().padStart(2, "0")}/${(wStart.getMonth() + 1).toString().padStart(2, "0")}`,
        start: wStart.toISOString(),
        end: wEnd.toISOString(),
      });
    }

    interface WeekAllocation {
      initiativeTitle: string;
      applicationName: string;
      lockType: string;
      hoursInWeek: number;
      allocationId: string;
    }

    interface WeekCell {
      saturation: number;
      capacity: number;
      allocated: number;
      absenceHours: number;
      allocations: WeekAllocation[];
    }

    interface ResourceRow {
      resourceId: string;
      resourceName: string;
      role: string;
      level: string;
      type: string;
      weeks: WeekCell[];
    }

    const rows: ResourceRow[] = [];

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

      const weekCells: WeekCell[] = [];

      for (const week of weeks) {
        const wStart = new Date(week.start);
        const wEnd = new Date(week.end);

        let absHours = 0;
        for (const abs of resource.absences) {
          const aDate = new Date(abs.date);
          if (aDate >= wStart && aDate <= wEnd) {
            absHours += decimalToNumber(abs.hours);
          }
        }

        const capacity = Math.max(0, weeklyHours - buffer - absHours);

        let allocated = 0;
        const weekAllocations: WeekAllocation[] = [];

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
            const hoursInWeek = (days * 8) / totalWeeks;
            allocated += hoursInWeek;

            weekAllocations.push({
              initiativeTitle: alloc.initiative.title,
              applicationName: alloc.initiative.application.name,
              lockType: alloc.lockType,
              hoursInWeek: Math.round(hoursInWeek * 10) / 10,
              allocationId: alloc.id,
            });
          }
        }

        const saturation =
          capacity > 0 ? Math.round((allocated / capacity) * 100) : 0;

        weekCells.push({
          saturation,
          capacity: Math.round(capacity * 10) / 10,
          allocated: Math.round(allocated * 10) / 10,
          absenceHours: Math.round(absHours * 10) / 10,
          allocations: weekAllocations,
        });
      }

      rows.push({
        resourceId: resource.id,
        resourceName: `${resource.lastName} ${resource.firstName}`,
        role: param.role,
        level: param.level,
        type: resource.type,
        weeks: weekCells,
      });
    }

    return NextResponse.json({ weeks, rows });
  } catch {
    return NextResponse.json({ weeks: [], rows: [] });
  }
}
