import { startOfWeek } from "date-fns";

export interface WorkloadSource {
  assignedTasks: { status: string; estimate: { toString(): string } | null }[];
  timeEntries: { date: Date; hours: { toString(): string } }[];
}

const ACTIVE_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED"];

export function workloadSummary(source: WorkloadSource, capacity = 40) {
  const activeTaskHours =
    source.assignedTasks
      .filter((t) => ACTIVE_STATUSES.includes(t.status))
      .reduce((s, t) => s + Number(t.estimate ?? 1), 0) ?? 0;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const hoursThisWeek =
    source.timeEntries
      .filter((e) => e.date >= weekStart)
      .reduce((s, e) => s + Number(e.hours), 0) ?? 0;

  const committed = Math.round((activeTaskHours + hoursThisWeek) * 100) / 100;
  const usedPercent = capacity > 0 ? Math.min(100, Math.round((committed / capacity) * 100)) : 0;
  const overloaded = committed > capacity;

  return { activeTaskHours, hoursThisWeek, committed, usedPercent, overloaded, capacity };
}
