import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import {
  updateEmployee,
  addEmployeeSkill,
  removeEmployeeSkill,
  checkIn,
  checkOut,
} from "@/app/(app)/team/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import {
  EMPLOYEE_STATUSES,
  EMPLOYEE_STATUS_MAP,
  SKILL_LEVELS,
  SKILL_LEVEL_MAP,
} from "@/lib/team-labels";
import { PROJECT_MEMBER_ROLE_MAP } from "@/lib/project-labels";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { workloadSummary } from "@/lib/team-workload";

export const dynamic = "force-dynamic";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  const canEdit = hasAccess(role, "team", "edit");

  const [employee, departments, technologies, unlinkedUsers, settings] = await Promise.all([
      db.employee.findUnique({
        where: { id },
        include: {
          department: true,
          user: { select: { id: true, name: true, email: true } },
          skills: { include: { technology: { select: { id: true, name: true, color: true } } } },
          projectMembers: {
            include: { project: { select: { id: true, name: true, status: true } } },
          },
          assignedTasks: {
            select: {
              status: true,
              estimate: true,
              project: { select: { name: true } },
            },
          },
          timeEntries: {
            include: { project: { select: { name: true } }, task: { select: { name: true } } },
            orderBy: { date: "desc" },
          },
          attendance: { orderBy: { date: "desc" } },
        },
      }),
      db.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      db.technology.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      db.user.findMany({
        where: { employeeId: null },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
      db.companySettings.findUnique({ where: { id: 1 } }),
    ]);

  if (!employee) {
    return <p className="text-sm text-muted-foreground">Member not found.</p>;
  }

  const capacity = settings?.defaultWeeklyHours ?? 40;
  const load = workloadSummary(employee, capacity);
  const skillIds = employee.skills.map((s) => s.technologyId);
  const activeProjects = employee.projectMembers.filter((m) =>
    ["PLANNED", "IN_PROGRESS", "ON_HOLD"].includes(m.project.status),
  ).length;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todaysEntry = employee.attendance.find((a) => a.date.getTime() === today.getTime());

  const toDate = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");
  const hoursLabel = (h: { toString(): string } | null | undefined) =>
    h === null || h === undefined ? "—" : `${Number(h)}h`;

  const userOptions = [
    ...(employee.user ? [employee.user] : []),
    ...unlinkedUsers,
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{employee.name}</h1>
            <Badge value={employee.status} map={EMPLOYEE_STATUS_MAP} />
          </div>
          <p className="text-sm text-muted-foreground">
            {employee.position || "No position"}
            {employee.department ? ` · ${employee.department.name}` : ""}
            {employee.email ? ` · ${employee.email}` : ""}
            {employee.phone ? ` · ${employee.phone}` : ""}
          </p>
        </div>
        <Link href="/team/members">
          <Button variant="secondary">Back</Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={updateEmployee} className="grid gap-4 sm:grid-cols-2">
                  <input type="hidden" name="id" value={employee.id} />
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input id="name" name="name" defaultValue={employee.name} required maxLength={150} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" name="email" type="email" defaultValue={employee.email} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <Input id="position" name="position" maxLength={100} defaultValue={employee.position ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="departmentId">Department</Label>
                    <NativeSelect id="departmentId" name="departmentId" defaultValue={employee.departmentId ?? ""}>
                      <option value="">None</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" maxLength={30} defaultValue={employee.phone ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hireDate">Hire date</Label>
                    <Input id="hireDate" name="hireDate" type="date" defaultValue={toDate(employee.hireDate)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">Hourly rate (AED)</Label>
                    <Input id="hourlyRate" name="hourlyRate" type="number" min="0" step="0.01" defaultValue={employee.hourlyRate?.toString() ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <NativeSelect id="status" name="status" defaultValue={employee.status}>
                      {EMPLOYEE_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  {userOptions.length > 0 && (
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="userId">Login account</Label>
                      <NativeSelect id="userId" name="userId" defaultValue={employee.userId ?? ""}>
                        <option value="">None</option>
                        {userOptions.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email})
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <Button type="submit">Save changes</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workload</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Committed this week</span>
                <span className={load.overloaded ? "font-medium text-destructive" : "font-medium"}>
                  {load.committed}h / {capacity}h
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${load.overloaded ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${load.usedPercent}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Active task estimates</p>
                  <p className="mt-1 font-medium">{load.activeTaskHours}h</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Logged this week</p>
                  <p className="mt-1 font-medium">{load.hoursThisWeek}h</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Active projects</p>
                  <p className="mt-1 font-medium">{activeProjects}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Hourly rate</p>
                  <p className="mt-1 font-medium">{formatCurrency(employee.hourlyRate)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assigned projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {employee.projectMembers.map((m) => (
                <Link
                  key={m.id}
                  href={`/projects/${m.projectId}`}
                  className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                >
                  <span className="font-medium">{m.project.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {PROJECT_MEMBER_ROLE_MAP[m.role]}
                  </span>
                </Link>
              ))}
              {employee.projectMembers.length === 0 && (
                <p className="py-2 text-center text-sm text-muted-foreground">
                  Not assigned to any project yet.
                </p>
              )}
              <p className="pt-2 text-xs text-muted-foreground">
                Memberships are managed from the project page.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {employee.skills.map((skill) => (
                  <div key={skill.id} className="flex items-center gap-2 rounded-md border px-2 py-1">
                    <Badge value={skill.level} map={SKILL_LEVEL_MAP} />
                    <span className="text-sm font-medium">{skill.technology.name}</span>
                    {canEdit && (
                      <form action={removeEmployeeSkill}>
                        <input type="hidden" name="id" value={skill.id} />
                        <input type="hidden" name="employeeId" value={employee.id} />
                        <Button type="submit" size="sm" variant="ghost" className="h-6 px-1 text-destructive">
                          ×
                        </Button>
                      </form>
                    )}
                  </div>
                ))}
                {employee.skills.length === 0 && (
                  <p className="text-sm text-muted-foreground">No skills assigned.</p>
                )}
              </div>

              {canEdit && technologies.length > 0 && (
                <form action={addEmployeeSkill} className="flex flex-wrap items-end gap-3 rounded-md border p-3">
                  <input type="hidden" name="employeeId" value={employee.id} />
                  <div className="min-w-40 flex-1 space-y-1">
                    <Label htmlFor="technologyId">Add skill</Label>
                    <NativeSelect id="technologyId" name="technologyId" required>
                      <option value="">Select technology…</option>
                      {technologies
                        .filter((t) => !skillIds.includes(t.id))
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="level">Level</Label>
                    <NativeSelect id="level" name="level" defaultValue="INTERMEDIATE">
                      {SKILL_LEVELS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <Button type="submit" size="sm">
                    Add
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Time entries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {employee.timeEntries.slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-2 text-sm">
                  <div>
                    <span className="font-medium">{formatDate(entry.date)}</span>
                    <span className="ml-2 text-muted-foreground">
                      {entry.project.name}
                      {entry.task ? ` · ${entry.task.name}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!entry.billable && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">non-billable</span>
                    )}
                    <span className="font-medium">{Number(entry.hours)}h</span>
                  </div>
                </div>
              ))}
              {employee.timeEntries.length === 0 && (
                <p className="py-2 text-center text-sm text-muted-foreground">No time logged yet.</p>
              )}
              <ButtonLink href="/team/time" variant="outline" size="sm">
                Log time
              </ButtonLink>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {todaysEntry ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
                  <div>
                    <span className="font-medium">Today</span>
                    <p className="text-xs text-muted-foreground">
                      In: {todaysEntry.checkInAt ? formatDateTime(todaysEntry.checkInAt) : "—"} ·{" "}
                      Out: {todaysEntry.checkOutAt ? formatDateTime(todaysEntry.checkOutAt) : "—"}
                    </p>
                  </div>
                  {canEdit && todaysEntry.checkInAt && !todaysEntry.checkOutAt && (
                    <form action={checkOut}>
                      <input type="hidden" name="id" value={todaysEntry.id} />
                      <Button type="submit" size="sm" variant="outline">
                        Check out
                      </Button>
                    </form>
                  )}
                </div>
              ) : (
                canEdit && (
                  <form action={checkIn}>
                    <input type="hidden" name="employeeId" value={employee.id} />
                    <Button type="submit" size="sm" variant="outline">
                      Check in today
                    </Button>
                  </form>
                )
              )}

              <div className="space-y-1 border-t pt-2">
                {employee.attendance.slice(0, 7).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">{formatDate(entry.date)}</span>
                    <span className="font-medium">{hoursLabel(entry.hours)}</span>
                  </div>
                ))}
                {employee.attendance.length === 0 && (
                  <p className="py-1 text-center text-sm text-muted-foreground">No attendance recorded.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
