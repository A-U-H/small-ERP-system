import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import {
  createSprint,
  updateSprintStatus,
  deleteSprint,
  createTask,
  updateTaskStatus,
} from "@/app/(app)/projects/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  SPRINT_STATUSES,
  SPRINT_STATUS_MAP,
  TASK_STATUSES,
  TASK_STATUS_MAP,
  PRIORITY_MAP,
  PRIORITY_OPTIONS,
} from "@/lib/project-labels";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProjectSprintsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  const canEdit = hasAccess(role, "projects", "edit");

  const [project, employees] = await Promise.all([
    db.project.findUnique({
      where: { id },
      include: {
        sprints: {
          orderBy: { createdAt: "desc" },
          include: {
            tasks: {
              include: { assignee: { select: { name: true } } },
              orderBy: { position: "asc" },
            },
          },
        },
      },
    }),
    db.employee.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!project) {
    return <p className="text-sm text-muted-foreground">Project not found.</p>;
  }

  const sprintsUrl = `/projects/${id}/sprints`;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            <Link href={`/projects/${id}`} className="hover:underline">
              {project.name}
            </Link>{" "}
            <span className="text-muted-foreground">/ Sprints</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {project.sprints.length} sprints ·{" "}
            {project.sprints.filter((s) => s.status === "ACTIVE").length} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ButtonLink href={`/projects/${id}`} variant="secondary">
            Project
          </ButtonLink>
          <ButtonLink href={`/projects/${id}/board`} variant="secondary">
            Board
          </ButtonLink>
        </div>
      </div>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New sprint</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createSprint} className="grid gap-4 sm:grid-cols-6">
              <input type="hidden" name="projectId" value={id} />
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="sprintName">Name *</Label>
                <Input id="sprintName" name="name" required maxLength={150} placeholder="Sprint name" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sprintStart">Start</Label>
                <Input id="sprintStart" name="startDate" type="date" defaultValue={today} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sprintEnd">End</Label>
                <Input id="sprintEnd" name="endDate" type="date" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sprintStatus">Status</Label>
                <NativeSelect id="sprintStatus" name="status" defaultValue="PLANNED">
                  {SPRINT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="flex items-end">
                <Button type="submit" size="sm">
                  Create
                </Button>
              </div>
              <div className="space-y-1 sm:col-span-6">
                <Label htmlFor="sprintGoal">Goal</Label>
                <Textarea id="sprintGoal" name="goal" rows={2} />
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {project.sprints.map((sprint) => {
          return (
            <Card key={sprint.id} id={sprint.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      {sprint.name} <Badge value={sprint.status} map={SPRINT_STATUS_MAP} />
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {sprint.startDate ? formatDate(sprint.startDate) : "—"} →{" "}
                      {sprint.endDate ? formatDate(sprint.endDate) : "—"} ·{" "}
                      {sprint.tasks.length} tasks
                    </p>
                    {sprint.goal && <p className="text-sm text-muted-foreground">{sprint.goal}</p>}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <form action={updateSprintStatus}>
                        <input type="hidden" name="id" value={sprint.id} />
                        <input type="hidden" name="projectId" value={id} />
                        <NativeSelect name="status" defaultValue={sprint.status} aria-label="Sprint status">
                          {SPRINT_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </NativeSelect>
                        <Button type="submit" size="sm" variant="outline">
                          Save
                        </Button>
                      </form>
                      <form action={deleteSprint}>
                        <input type="hidden" name="id" value={sprint.id} />
                        <input type="hidden" name="projectId" value={id} />
                        <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                          Delete
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {sprint.tasks.map((task) => (
                    <div key={task.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{task.name}</span>
                        <Badge value={task.status} map={TASK_STATUS_MAP} />
                        <Badge value={task.priority} map={PRIORITY_MAP} />
                        {task.assignee && (
                          <span className="text-xs text-muted-foreground">{task.assignee.name}</span>
                        )}
                      </div>
                      {canEdit && (
                        <form action={updateTaskStatus}>
                          <input type="hidden" name="id" value={task.id} />
                          <input type="hidden" name="projectId" value={id} />
                          <input type="hidden" name="returnTo" value={sprintsUrl} />
                          <NativeSelect name="status" defaultValue={task.status} aria-label="Move task">
                            {TASK_STATUSES.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </NativeSelect>
                          <Button type="submit" size="sm" variant="outline">
                            Move
                          </Button>
                        </form>
                      )}
                    </div>
                  ))}
                  {sprint.tasks.length === 0 && (
                    <p className="py-2 text-center text-sm text-muted-foreground">No tasks in this sprint.</p>
                  )}
                </div>

                {canEdit && (
                  <form action={createTask} className="flex flex-wrap gap-2 border-t pt-3">
                    <input type="hidden" name="projectId" value={id} />
                    <input type="hidden" name="sprintId" value={sprint.id} />
                    <input type="hidden" name="returnTo" value={sprintsUrl} />
                    <Input name="name" placeholder="Add task to sprint…" required maxLength={150} className="max-w-xs" />
                    <NativeSelect name="status" defaultValue="TODO" aria-label="Task status">
                      {TASK_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </NativeSelect>
                    <NativeSelect name="assigneeId" defaultValue="" aria-label="Assignee">
                      <option value="">Unassigned</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </NativeSelect>
                    <NativeSelect name="priority" defaultValue="MEDIUM" aria-label="Priority">
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </NativeSelect>
                    <Button type="submit" size="sm">
                      Add
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })}
        {project.sprints.length === 0 && (
          <p className="rounded-lg border py-12 text-center text-sm text-muted-foreground">
            No sprints yet. Create your first sprint to start planning.
          </p>
        )}
      </div>
    </div>
  );
}
