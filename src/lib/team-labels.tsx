export const EMPLOYEE_STATUSES = [
  { value: "ACTIVE", label: "Active", color: "bg-emerald-100 text-emerald-700" },
  { value: "ON_LEAVE", label: "On leave", color: "bg-amber-100 text-amber-700" },
  { value: "INACTIVE", label: "Inactive", color: "bg-slate-100 text-slate-700" },
] as const;

export const EMPLOYEE_STATUS_MAP = Object.fromEntries(
  EMPLOYEE_STATUSES.map((s) => [s.value, s]),
) as Record<string, (typeof EMPLOYEE_STATUSES)[number]>;

export const SKILL_LEVELS = [
  { value: "BEGINNER", label: "Beginner", color: "bg-slate-100 text-slate-700" },
  { value: "INTERMEDIATE", label: "Intermediate", color: "bg-blue-100 text-blue-700" },
  { value: "EXPERT", label: "Expert", color: "bg-emerald-100 text-emerald-700" },
] as const;

export const SKILL_LEVEL_MAP = Object.fromEntries(
  SKILL_LEVELS.map((s) => [s.value, s]),
) as Record<string, (typeof SKILL_LEVELS)[number]>;
