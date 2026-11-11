export const PROJECT_STATUSES = [
  { value: "PLANNED", label: "Planned", color: "bg-slate-100 text-slate-700" },
  { value: "IN_PROGRESS", label: "In progress", color: "bg-blue-100 text-blue-700" },
  { value: "ON_HOLD", label: "On hold", color: "bg-amber-100 text-amber-700" },
  { value: "COMPLETED", label: "Completed", color: "bg-emerald-100 text-emerald-700" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-rose-100 text-rose-700" },
] as const;

export const PROJECT_STATUS_MAP = Object.fromEntries(
  PROJECT_STATUSES.map((s) => [s.value, s]),
) as Record<string, (typeof PROJECT_STATUSES)[number]>;

export const MILESTONE_STATUSES = [
  { value: "PENDING", label: "Pending", color: "bg-slate-100 text-slate-700" },
  { value: "IN_PROGRESS", label: "In progress", color: "bg-blue-100 text-blue-700" },
  { value: "DONE", label: "Done", color: "bg-emerald-100 text-emerald-700" },
] as const;

export const MILESTONE_STATUS_MAP = Object.fromEntries(
  MILESTONE_STATUSES.map((s) => [s.value, s]),
) as Record<string, (typeof MILESTONE_STATUSES)[number]>;

export const TASK_STATUSES = [
  { value: "TODO", label: "To do", color: "bg-slate-100 text-slate-700" },
  { value: "IN_PROGRESS", label: "In progress", color: "bg-blue-100 text-blue-700" },
  { value: "IN_REVIEW", label: "In review", color: "bg-violet-100 text-violet-700" },
  { value: "DONE", label: "Done", color: "bg-emerald-100 text-emerald-700" },
  { value: "BLOCKED", label: "Blocked", color: "bg-rose-100 text-rose-700" },
] as const;

export const TASK_STATUS_MAP = Object.fromEntries(
  TASK_STATUSES.map((s) => [s.value, s]),
) as Record<string, (typeof TASK_STATUSES)[number]>;

export const SPRINT_STATUSES = [
  { value: "PLANNED", label: "Planned", color: "bg-slate-100 text-slate-700" },
  { value: "ACTIVE", label: "Active", color: "bg-blue-100 text-blue-700" },
  { value: "CLOSED", label: "Closed", color: "bg-emerald-100 text-emerald-700" },
] as const;

export const SPRINT_STATUS_MAP = Object.fromEntries(
  SPRINT_STATUSES.map((s) => [s.value, s]),
) as Record<string, (typeof SPRINT_STATUSES)[number]>;

export const PRIORITIES = [
  { value: "LOW", label: "Low", color: "bg-slate-100 text-slate-700" },
  { value: "MEDIUM", label: "Medium", color: "bg-amber-100 text-amber-700" },
  { value: "HIGH", label: "High", color: "bg-rose-100 text-rose-700" },
] as const;

export const PRIORITY_MAP = Object.fromEntries(
  PRIORITIES.map((s) => [s.value, s]),
) as Record<string, (typeof PRIORITIES)[number]>;

export const PRIORITY_OPTIONS = PRIORITIES.map(({ value, label }) => ({ value, label }));

export const PROJECT_MEMBER_ROLES = [
  { value: "PROJECT_MANAGER", label: "Project Manager" },
  { value: "TEAM_MEMBER", label: "Team Member" },
  { value: "REVIEWER", label: "Reviewer" },
  { value: "VIEWER", label: "Viewer / Guest" },
];

export const PROJECT_MEMBER_ROLE_MAP = Object.fromEntries(
  PROJECT_MEMBER_ROLES.map((r) => [r.value, r.label]),
) as Record<string, string>;
