import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { EMPLOYEE_STATUSES, EMPLOYEE_STATUS_MAP } from "@/lib/team-labels";
import { workloadSummary } from "@/lib/team-workload";

export const dynamic = "force-dynamic";

export default async function TeamMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  const canEdit = hasAccess(role, "team", "edit");

  const statuses = ["ACTIVE", "ON_LEAVE", "INACTIVE"];
  const status = statuses.includes(params.status ?? "") ? params.status : "";

  const settings = await db.companySettings.findUnique({ where: { id: 1 } });
  const capacity = settings?.defaultWeeklyHours ?? 40;

  const employees = await db.employee.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(params.q
        ? {
            OR: [
              { name: { contains: params.q, mode: "insensitive" } },
              { email: { contains: params.q, mode: "insensitive" } },
              { position: { contains: params.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      department: { select: { name: true } },
      skills: { select: { id: true } },
      assignedTasks: { select: { status: true, estimate: true } },
      timeEntries: { select: { date: true, hours: true } },
      projectMembers: { select: { id: true, project: { select: { status: true } } } },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Members</h1>
          <p className="text-sm text-muted-foreground">
            {employees.length} employees · {employees.filter((e) => e.status === "ACTIVE").length} active
          </p>
        </div>
        {canEdit && (
          <ButtonLink href="/team/members/new">
            <Plus className="size-4" /> New member
          </ButtonLink>
        )}
      </div>

      <form className="flex flex-wrap gap-2" action="/team/members">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search members…"
          className="h-9 rounded-md border bg-background px-3 text-sm"
        />
        <NativeSelect name="status" defaultValue={status} aria-label="Filter by status">
          <option value="">All statuses</option>
          {EMPLOYEE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <div className="space-y-2">
        {employees.map((employee) => {
          const load = workloadSummary(employee, capacity);
          const activeProjects = employee.projectMembers.filter((m) =>
            ["PLANNED", "IN_PROGRESS", "ON_HOLD"].includes(m.project.status),
          ).length;
          return (
            <Link
              key={employee.id}
              href={`/team/members/${employee.id}`}
              className="block rounded-lg border bg-background p-4 transition-colors hover:bg-accent"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{employee.name}</span>
                    <Badge value={employee.status} map={EMPLOYEE_STATUS_MAP} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {employee.position || "—"}
                    {employee.department ? ` · ${employee.department.name}` : ""}
                    {employee.skills.length > 0 ? ` · ${employee.skills.length} skills` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="hidden sm:inline">{activeProjects} projects</span>
                  <span className={load.overloaded ? "font-medium text-destructive" : ""}>
                    {load.committed}h / {capacity}h
                  </span>
                </div>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${load.overloaded ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${load.usedPercent}%` }}
                />
              </div>
            </Link>
          );
        })}
        {employees.length === 0 && (
          <p className="rounded-lg border py-12 text-center text-sm text-muted-foreground">
            No members found.
          </p>
        )}
      </div>
    </div>
  );
}
