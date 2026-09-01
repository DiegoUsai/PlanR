import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

interface AlertCandidate {
  type: string;
  severity: "OPERATIVO" | "STRATEGICO";
  entityType: string;
  entityId: string;
  message: string;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeeksBetween(start: Date, end: Date): Date[] {
  const weeks: Date[] = [];
  const current = getWeekStart(start);
  while (current <= end) {
    weeks.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

function decimalToNumber(d: Decimal | number | null | undefined): number {
  if (d === null || d === undefined) return 0;
  if (typeof d === "number") return d;
  return Number(d);
}

export async function computeAlerts(): Promise<AlertCandidate[]> {
  const alerts: AlertCandidate[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const config = await prisma.bUConfiguration.findFirst();
  const saturationAlarm = config?.saturationAlarm ?? 90;
  const annualBudget = config ? decimalToNumber(config.annualBudget) : 0;

  const horizonEnd = new Date(today);
  horizonEnd.setDate(horizonEnd.getDate() + 12 * 7);

  const weeks = getWeeksBetween(today, horizonEnd);

  const resources = await prisma.resource.findMany({
    where: { attivo: true },
    include: {
      parameters: { orderBy: { validFrom: "desc" } },
      allocations: {
        where: {
          endDate: { gte: today },
          startDate: { lte: horizonEnd },
        },
        include: { initiative: true },
      },
      absences: {
        where: {
          date: { gte: today, lte: horizonEnd },
        },
      },
    },
  });

  const globalBuffer = config ? decimalToNumber(config.weeklyHoursBuffer) : 8;

  for (const resource of resources) {
    const currentParam = resource.parameters.find((p) => {
      const from = new Date(p.validFrom);
      const to = p.validTo ? new Date(p.validTo) : null;
      return from <= today && (!to || to >= today);
    });

    if (!currentParam) continue;

    const weeklyHours = decimalToNumber(currentParam.weeklyHours);
    const buffer = currentParam.weeklyHoursBuffer
      ? decimalToNumber(currentParam.weeklyHoursBuffer)
      : globalBuffer;
    const coeff = decimalToNumber(currentParam.productivityCoeff);

    let overWeeks = 0;
    let underWeeks = 0;

    for (const weekStart of weeks) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      let allocatedHours = 0;
      for (const alloc of resource.allocations) {
        const allocStart = new Date(alloc.startDate);
        const allocEnd = new Date(alloc.endDate);
        if (allocStart <= weekEnd && allocEnd >= weekStart) {
          const days = decimalToNumber(alloc.allocatedEffortDays);
          const totalAllocWeeks = Math.max(
            1,
            Math.ceil(
              (allocEnd.getTime() - allocStart.getTime()) /
                (7 * 24 * 60 * 60 * 1000)
            )
          );
          allocatedHours += (days * 8) / totalAllocWeeks;
        }
      }

      let absenceHours = 0;
      for (const abs of resource.absences) {
        const absDate = new Date(abs.date);
        if (absDate >= weekStart && absDate <= weekEnd) {
          absenceHours += decimalToNumber(abs.hours);
        }
      }

      const capacity = Math.max(0, weeklyHours - buffer - absenceHours);
      const saturation = capacity > 0 ? (allocatedHours / capacity) * 100 : 0;

      if (saturation > saturationAlarm) {
        overWeeks++;
      } else {
        overWeeks = 0;
      }

      if (saturation < 50 && capacity > 0) {
        underWeeks++;
      } else {
        underWeeks = 0;
      }

      if (overWeeks >= 2) {
        alerts.push({
          type: "SOVRA_ALLOCAZIONE",
          severity: "OPERATIVO",
          entityType: "Resource",
          entityId: resource.id,
          message: `${resource.lastName} ${resource.firstName}: saturazione > ${saturationAlarm}% per ${overWeeks} settimane consecutive`,
        });
        overWeeks = 0;
      }

      if (underWeeks >= 2) {
        alerts.push({
          type: "SOTTO_UTILIZZO",
          severity: "OPERATIVO",
          entityType: "Resource",
          entityId: resource.id,
          message: `${resource.lastName} ${resource.firstName}: saturazione < 50% per ${underWeeks} settimane consecutive`,
        });
        underWeeks = 0;
      }
    }

    // Prossimita scadenza parametro (validTo)
    if (currentParam.validTo) {
      const paramEnd = new Date(currentParam.validTo);
      const thirtyDays = new Date(today);
      thirtyDays.setDate(thirtyDays.getDate() + 30);

      if (paramEnd <= thirtyDays && paramEnd >= today) {
        const activeAllocs = resource.allocations.filter(
          (a) => new Date(a.endDate) >= today
        );
        if (activeAllocs.length > 0) {
          alerts.push({
            type: "PROSSIMITA_SCADENZA_CONTRATTO",
            severity: "OPERATIVO",
            entityType: "Resource",
            entityId: resource.id,
            message: `${resource.lastName} ${resource.firstName}: parametri scadono il ${paramEnd.toLocaleDateString("it-IT")} con ${activeAllocs.length} allocazione/i attive`,
          });
        }
      }
    }

    // Slittamento per coefficiente
    if (coeff < 1) {
      for (const alloc of resource.allocations) {
        const effectiveDays =
          decimalToNumber(alloc.allocatedEffortDays) / coeff;
        const desiredEnd = alloc.initiative.desiredEndDate
          ? new Date(alloc.initiative.desiredEndDate)
          : null;
        if (desiredEnd) {
          const startDate = new Date(alloc.startDate);
          const neededWeeks = effectiveDays / 5;
          const projectedEnd = new Date(startDate);
          projectedEnd.setDate(
            projectedEnd.getDate() + Math.ceil(neededWeeks * 7)
          );
          if (projectedEnd > desiredEnd) {
            alerts.push({
              type: "SLITTAMENTO_COEFFICIENTE",
              severity: "OPERATIVO",
              entityType: "Initiative",
              entityId: alloc.initiativeId,
              message: `${alloc.initiative.title}: coefficiente ${coeff} di ${resource.lastName} ${resource.firstName} causa slittamento oltre data desiderata`,
            });
          }
        }
      }
    }
  }

  // Scadenza soft lock
  const expiredSoftLocks = await prisma.allocation.findMany({
    where: {
      lockType: "SOFT",
      softLockExpiry: { lt: today },
    },
    include: { resource: true, initiative: true },
  });

  for (const alloc of expiredSoftLocks) {
    alerts.push({
      type: "SCADENZA_SOFT_LOCK",
      severity: "OPERATIVO",
      entityType: "Allocation",
      entityId: alloc.id,
      message: `Soft lock scaduto: ${alloc.resource.lastName} ${alloc.resource.firstName} su ${alloc.initiative.title}`,
    });
  }

  // Ready - Pending Resources > 2 settimane
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const pendingInitiatives = await prisma.initiative.findMany({
    where: {
      status: "READY_PENDING_RESOURCES",
      updatedAt: { lt: twoWeeksAgo },
    },
  });

  for (const init of pendingInitiatives) {
    alerts.push({
      type: "READY_PENDING_RESOURCES",
      severity: "OPERATIVO",
      entityType: "Initiative",
      entityId: init.id,
      message: `${init.title}: in stato Pending Resources da oltre 2 settimane`,
    });
  }

  // Iniziativa senza allocazioni nell'orizzonte corto
  const unallocatedInitiatives = await prisma.initiative.findMany({
    where: {
      status: {
        in: [
          "IN_ATTESA_DI_ALLOCAZIONE",
          "READY_PENDING_RESOURCES",
          "ALLOCATO",
        ],
      },
      allocations: { none: {} },
    },
  });

  for (const init of unallocatedInitiatives) {
    alerts.push({
      type: "INIZIATIVA_SENZA_ALLOCAZIONI",
      severity: "OPERATIVO",
      entityType: "Initiative",
      entityId: init.id,
      message: `${init.title}: nessuna allocazione assegnata`,
    });
  }

  // Costo > valore economico
  const valueMap: Record<string, number> = {
    LT_5K: 5000,
    DA_5K_A_10K: 10000,
    DA_10K_A_15K: 15000,
    DA_15K_A_20K: 20000,
    DA_20K_A_30K: 30000,
    DA_30K_A_40K: 40000,
    GT_40K: 50000,
  };

  const initiativesWithCost = await prisma.initiative.findMany({
    where: {
      economicValue: { not: null },
      allocations: { some: {} },
    },
    include: {
      allocations: {
        include: {
          resource: { include: { parameters: true } },
        },
      },
    },
  });

  for (const init of initiativesWithCost) {
    if (!init.economicValue) continue;
    const maxValue = valueMap[init.economicValue] ?? 0;
    if (maxValue === 0) continue;

    let totalCost = 0;
    for (const alloc of init.allocations) {
      const param = alloc.resource.parameters.find((p) => {
        const from = new Date(p.validFrom);
        const to = p.validTo ? new Date(p.validTo) : null;
        return from <= today && (!to || to >= today);
      });
      if (param) {
        totalCost +=
          decimalToNumber(alloc.allocatedEffortDays) *
          decimalToNumber(param.dailyCost);
      }
    }

    if (totalCost > maxValue) {
      alerts.push({
        type: "COSTO_SUPERIORE_VALORE",
        severity: "OPERATIVO",
        entityType: "Initiative",
        entityId: init.id,
        message: `${init.title}: costo previsto €${totalCost.toLocaleString("it-IT")} supera valore ${init.economicValue}`,
      });
    }
  }

  // --- Strategic alerts ---

  // Profilo saturo: tutte risorse di un profilo > 85% per 4 settimane
  const roleGroups = new Map<string, typeof resources>();
  for (const r of resources) {
    const currentP = r.parameters.find((p) => {
      const from = new Date(p.validFrom);
      const to = p.validTo ? new Date(p.validTo) : null;
      return from <= today && (!to || to >= today);
    });
    const role = currentP?.role ?? "SENZA_RUOLO";
    const group = roleGroups.get(role) ?? [];
    group.push(r);
    roleGroups.set(role, group);
  }

  // Pipeline value elevata: soft lock value > 20% budget
  if (annualBudget > 0) {
    const softLockAllocs = await prisma.allocation.findMany({
      where: {
        lockType: "SOFT",
        endDate: { gte: today },
      },
      include: {
        resource: { include: { parameters: true } },
      },
    });

    let softLockValue = 0;
    for (const alloc of softLockAllocs) {
      const param = alloc.resource.parameters.find((p) => {
        const from = new Date(p.validFrom);
        const to = p.validTo ? new Date(p.validTo) : null;
        return from <= today && (!to || to >= today);
      });
      if (param) {
        softLockValue +=
          decimalToNumber(alloc.allocatedEffortDays) *
          decimalToNumber(param.dailyCost);
      }
    }

    if (softLockValue > annualBudget * 0.2) {
      alerts.push({
        type: "PIPELINE_VALUE_ELEVATA",
        severity: "STRATEGICO",
        entityType: "BU",
        entityId: "global",
        message: `Soft lock value €${softLockValue.toLocaleString("it-IT")} supera 20% del budget annuale (€${annualBudget.toLocaleString("it-IT")})`,
      });
    }
  }

  // Accumulo Pending Resources: > 3 iniziative sullo stesso profilo
  const pendingByProfile = await prisma.initiative.findMany({
    where: { status: "READY_PENDING_RESOURCES" },
  });

  const profileCount = new Map<string, number>();
  for (const init of pendingByProfile) {
    const profiles = init.requiredProfiles?.split(",").map((p) => p.trim()) ?? [];
    for (const profile of profiles) {
      if (profile) {
        profileCount.set(profile, (profileCount.get(profile) ?? 0) + 1);
      }
    }
  }

  for (const [profile, count] of profileCount) {
    if (count > 3) {
      alerts.push({
        type: "ACCUMULO_PENDING_RESOURCES",
        severity: "STRATEGICO",
        entityType: "Profile",
        entityId: profile,
        message: `${count} iniziative Pending Resources richiedono profilo ${profile}`,
      });
    }
  }

  return alerts;
}

export async function generateAndPersistAlerts(): Promise<{
  generated: number;
  resolved: number;
}> {
  const candidates = await computeAlerts();

  // Resolve alerts that no longer apply
  const activeAlerts = await prisma.alert.findMany({
    where: { status: { in: ["ATTIVO", "PRESO_IN_CARICO"] } },
  });

  let resolved = 0;
  for (const existing of activeAlerts) {
    const stillRelevant = candidates.some(
      (c) =>
        c.type === existing.type &&
        c.entityType === existing.entityType &&
        c.entityId === existing.entityId
    );
    if (!stillRelevant) {
      await prisma.alert.update({
        where: { id: existing.id },
        data: { status: "RISOLTO", resolvedAt: new Date() },
      });
      resolved++;
    }
  }

  // Create new alerts (avoid duplicates)
  let generated = 0;
  for (const candidate of candidates) {
    const exists = await prisma.alert.findFirst({
      where: {
        type: candidate.type as never,
        entityType: candidate.entityType,
        entityId: candidate.entityId,
        status: { in: ["ATTIVO", "PRESO_IN_CARICO"] },
      },
    });

    if (!exists) {
      await prisma.alert.create({
        data: {
          type: candidate.type as never,
          severity: candidate.severity as never,
          entityType: candidate.entityType,
          entityId: candidate.entityId,
          message: candidate.message,
        },
      });
      generated++;
    }
  }

  return { generated, resolved };
}
