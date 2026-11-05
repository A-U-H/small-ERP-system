import { db } from "@/lib/db";
import {
  createTimeEntry,
  deleteTimeEntry,
} from "@/app/(app)/team/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TeamTimePage() {
  const [employees, projects, tasks, entries] = await Promise.all([
    db.employee.findMany({
      where: { status: { not: "INACTIVE" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.project.findMany({
      where: { archived: false },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.task.findMany({
      where: { project: { archived: false } },
      select: { id: true, name: true, projectId: true, project: { select: { name: true } } },
      orderBy: [{ projectId: "asc" }, { name: "asc" }],
    }),
    db.timeEntry.findMany({
      include: {
        employee: { select: { name: true } },
        project: { select: { id: true, name: true } },
        task: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
      take: 50,
    }),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const tasksByProject = new Map<string, typeof tasks>();
  for (const task of tasks) {
    const list = tasksByProject.get(task.projectId) ?? [];
    list.push(task);
    tasksByProject.set(task.projectId, list);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Time tracking</h1>
        <p className="text-sm text-muted-foreground">
          Manual time entries tied to projects and tasks
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log time</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTimeEntry} className="grid gap-4 sm:grid-cols-6">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="employeeId">Member *</Label>
              <NativeSelect id="employeeId" name="employeeId" required>
                <option value="">Select member…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="projectId">Project *</Label>
              <NativeSelect id="projectId" name="projectId" required>
                <option value="">Select project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label htmlFor="date">Date *</Label>
              <Input id="date" name="date" type="date" defaultValue={today} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="hours">Hours *</Label>
              <Input id="hours" name="hours" type="number" min="0.25" max="24" step="0.25" required />
            </div>
            <div className="space-y-1 sm:col-span-3">
              <Label htmlFor="taskId">Task</Label>
              <NativeSelect id="taskId" name="taskId" defaultValue="">
                <option value="">No task</option>
                {Array.from(tasksByProject.entries()).map(([projectId, list]) => (
                  <optgroup key={projectId} label={list[0]?.project.name ?? ""}>
                    {list.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1 sm:col-span-3">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" maxLength={2000} />
            </div>
            <div className="flex items-end gap-4 sm:col-span-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="billable" defaultChecked className="size-4" />
                Billable
              </label>
              <Button type="submit">Log time</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent entries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-medium">{entry.employee.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {formatDate(entry.date)} · {entry.project.name}
                    {entry.task ? ` · ${entry.task.name}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!entry.billable && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      non-billable
                    </span>
                  )}
                  <span className="font-medium">{Number(entry.hours)}h</span>
                  <form action={deleteTimeEntry}>
                    <input type="hidden" name="id" value={entry.id} />
                    <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                      Delete
                    </Button>
                  </form>
                </div>
              </div>
              {entry.notes && (
                <p className="mt-1 text-xs text-muted-foreground">{entry.notes}</p>
              )}
            </div>
          ))}
          {entries.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No time logged yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
