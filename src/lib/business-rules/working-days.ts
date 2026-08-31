export function workingDays(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);

  while (current <= endDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

export function calculateEffortDays(
  start: Date,
  end: Date,
  allocationPercentage: number
): number {
  const days = workingDays(start, end);
  return Math.round((days * allocationPercentage) / 100 * 10) / 10;
}
