import type { InitiativeStatus } from "@prisma/client";

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
  const { statoJira, estimatedDays, totalAllocatedDays, hasHardLockOnly, lastAllocationEndDate } = input;
  const today = input.today ?? new Date();
  today.setHours(0, 0, 0, 0);

  const jiraLower = statoJira.toLowerCase();

  if (jiraLower === "rejected") return "REJECTED";

  if (jiraLower === "approvato") {
    if (lastAllocationEndDate && lastAllocationEndDate < today) {
      return "COMPLETATO";
    }
    return "CONFERMATO_HARD_LOCK";
  }

  if (jiraLower === "stimato") {
    if (estimatedDays && totalAllocatedDays >= estimatedDays) {
      if (hasHardLockOnly) {
        if (lastAllocationEndDate && lastAllocationEndDate < today) {
          return "COMPLETATO";
        }
        return "CONFERMATO_HARD_LOCK";
      }
      return "ALLOCATO_SOFT_LOCK";
    }
    if (totalAllocatedDays > 0) {
      return "PENDING_RESOURCES";
    }
    return "ATTESA_DI_ALLOCAZIONE";
  }

  return "ATTESA_DI_ALLOCAZIONE";
}
