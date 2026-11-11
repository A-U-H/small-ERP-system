import Link from "next/link";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { workloadSummary } from "@/lib/team-workload";

export const dynamic = "force-dynamic";

export default async function TeamWorkloadPage() {
  const [settings, employees] = await Promise.all([
    db.companySettings.findUnique({ where: { id: 1 } }),
    db.employee.findMany({
      where: { status: { not: "INACTIVE" } },
      include: {
        department: { select: { name: true } },
        assignedTasks: { select: { status: true, estimate: true } },
        timeEntries: { select: { date: true, hours: true } },
        projectMembers: { select: { id: true, project: { select: { status: true } } } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const capacity = settings?.defaultWeeklyHours ?? 40;

  const rows = employees
    .map((employee) => {
      const load = workloadSummary(employee, capacity);
      const activeProjects = employee.projectMembers.filter((m) =>
        ["PLANNED", "IN_PROGRESS", "ON_HOLD"].includes(m.project.status),
      ).length;
      return { employee, load, activeProjects };
    })
    .sort((a, b) => b.load.committed - a.load.committed);

  const totalCommitted = rows.reduce((s, r) => s + r.load.committed, 0);
  const overloadedCount = rows.filter((r) => r.load.overloaded).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Workload</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} members · {totalCommitted}h committed this week ·{" "}
          {overloadedCount} overloaded
        </p>
        <p className="text-xs text-muted-foreground">
          Committed = active task estimates + hours logged this week. Weekly capacity: {capacity}h
          (configured in Settings → Company).
        </p>
      </div>

      <div className="space-y-3">
        {rows.map(({ employee, load, activeProjects }) => (
          <Link
            key={employee.id}
            href={`/team/members/${employee.id}`}
            className="block rounded-lg border bg-background p-4 transition-colors hover:bg-accent"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{employee.name}</span>
                  {load.overloaded && (
                    <Badge value="overloaded" map={{ overloaded: { label: "Overloaded", color: "bg-rose-100 text-rose-700" } }} />
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {employee.position || "—"}
                  {employee.department ? ` · ${employee.department.name}` : ""} ·{" "}
                  {activeProjects} active projects
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {load.committed}h <span className="text-muted-foreground">/ {capacity}h</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {load.activeTaskHours}h tasks · {load.hoursThisWeek}h logged
                </p>
              </div>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${load.overloaded ? "bg-destructive" : "bg-primary"}`}
                style={{ width: `${load.usedPercent}%` }}
              />
            </div>
          </Link>
        ))}
        {rows.length === 0 && (
          <p className="rounded-lg border py-12 text-center text-sm text-muted-foreground">
            No active members to show.
          </p>
        )}
      </div>
    </div>
  );
}
