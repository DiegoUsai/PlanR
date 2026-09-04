import type { InitiativeStatus, PrismaClient } from "@prisma/client";

const NON_PLANNABLE_JIRA_STATES = [
  "To Do",
  "Studio fattibilità",
  "Pronta per la stima",
];

export function isNonPlannableJiraStatus(statoJira: string): boolean {
  return NON_PLANNABLE_JIRA_STATES.some(
    (s) => s.toLowerCase() === statoJira.toLowerCase()
  );
}

interface StatusInput {
  statoJira: string;
  estimatedDays: number | null;
  totalAllocatedDays: number;
  hasHardLockOnly: boolean;
  lastAllocationEndDate: Date | null;
  today?: Date;
}

export function computeInitiativeStatus(input: StatusInput): InitiativeStatus {
  const { statoJira, estimatedDays, totalAllocatedDays, lastAllocationEndDate } = input;
  const today = input.today ?? new Date();
  today.setHours(0, 0, 0, 0);

  const jiraLower = statoJira.toLowerCase();

  if (jiraLower === "rejected") return "REJECTED";

  const effortCovered = estimatedDays != null && totalAllocatedDays >= estimatedDays;

  if (jiraLower === "approvato") {
    if (effortCovered && lastAllocationEndDate && lastAllocationEndDate < today) {
      return "COMPLETATO";
    }
    if (effortCovered) {
      return "CONFERMATO_HARD_LOCK";
    }
    return "PENDING_RESOURCES";
  }

  if (jiraLower === "stimato") {
    if (effortCovered) {
      return "ALLOCATO_SOFT_LOCK";
    }
    if (totalAllocatedDays > 0) {
      return "PENDING_RESOURCES";
    }
    return "ATTESA_DI_ALLOCAZIONE";
  }

  return "ATTESA_DI_ALLOCAZIONE";
}

export async function reEvaluateInitiativeStatus(
  db: PrismaClient,
  initiativeId: string
): Promise<{ oldStatus: string; newStatus: string } | null> {
  const initiative = await db.initiative.findUnique({
    where: { id: initiativeId },
    include: {
      allocations: {
        select: { allocatedEffortDays: true, lockType: true, endDate: true },
      },
    },
  });

  if (!initiative) return null;

  const totalAllocatedDays = initiative.allocations.reduce(
    (sum: number, a: { allocatedEffortDays: unknown }) =>
      sum + Number(a.allocatedEffortDays),
    0
  );
  const hasHardLockOnly =
    initiative.allocations.length > 0 &&
    initiative.allocations.every((a: { lockType: string }) => a.lockType === "HARD");
  const lastAllocationEndDate =
    initiative.allocations.length > 0
      ? new Date(
          Math.max(
            ...initiative.allocations.map((a: { endDate: Date }) => a.endDate.getTime())
          )
        )
      : null;

  const newStatus = computeInitiativeStatus({
    statoJira: initiative.statoJira,
    estimatedDays: initiative.estimatedDays ? Number(initiative.estimatedDays) : null,
    totalAllocatedDays,
    hasHardLockOnly,
    lastAllocationEndDate,
  });

  if (newStatus !== initiative.status) {
    await db.initiative.update({
      where: { id: initiativeId },
      data: { status: newStatus },
    });
    return { oldStatus: initiative.status, newStatus };
  }

  return null;
}
