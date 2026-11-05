import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import {
  createTask,
  updateTaskStatus,
  deleteTask,
  createComment,
} from "@/app/(app)/projects/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { TASK_STATUSES, PRIORITY_MAP, PRIORITY_OPTIONS } from "@/lib/project-labels";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  const canEdit = hasAccess(role, "projects", "edit");

  const [project, employees, milestones] = await Promise.all([
    db.project.findUnique({
      where: { id },
      include: {
        tasks: {
          include: {
            assignee: { select: { name: true } },
            milestone: { select: { name: true } },
            subtasks: { select: { done: true } },
            comments: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
          },
          orderBy: { position: "asc" },
        },
      },
    }),
    db.employee.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.milestone.findMany({ where: { projectId: id }, select: { id: true, name: true }, orderBy: { order: "asc" } }),
  ]);

  if (!project) {
    return <p className="text-sm text-muted-foreground">Project not found.</p>;
  }

  const boardUrl = `/projects/${id}/board`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            <Link href={`/projects/${id}`} className="hover:underline">
              {project.name}
            </Link>{" "}
            <span className="text-muted-foreground">/ Board</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {project.tasks.length} tasks ·{" "}
            {project.tasks.filter((t) => t.status === "DONE").length} done
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ButtonLink href={`/projects/${id}`} variant="secondary">
            Project
          </ButtonLink>
          <ButtonLink href={`/projects/${id}/sprints`} variant="secondary">
            Sprints
          </ButtonLink>
        </div>
      </div>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add task</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createTask} className="grid gap-4 sm:grid-cols-6">
              <input type="hidden" name="projectId" value={id} />
              <input type="hidden" name="returnTo" value={boardUrl} />
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="boardTask">Name *</Label>
                <Input id="boardTask" name="name" required maxLength={150} placeholder="Task name" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="boardStatus">Status</Label>
                <NativeSelect id="boardStatus" name="status" defaultValue="TODO">
                  {TASK_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label htmlFor="boardAssignee">Assignee</Label>
                <NativeSelect id="boardAssignee" name="assigneeId" defaultValue="">
                  <option value="">Unassigned</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label htmlFor="boardMilestone">Milestone</Label>
                <NativeSelect id="boardMilestone" name="milestoneId" defaultValue="">
                  <option value="">None</option>
                  {milestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label htmlFor="boardPriority">Priority</Label>
                <NativeSelect id="boardPriority" name="priority" defaultValue="MEDIUM">
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="flex items-end">
                <Button type="submit" size="sm">
                  Add task
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4 overflow-x-auto pb-2">
        {TASK_STATUSES.map((column) => {
          const tasks = project.tasks.filter((t) => t.status === column.value);
          return (
            <div key={column.value} className="w-72 shrink-0 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between px-3 py-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${column.color}`}>
                  {column.label}
                </span>
                <span className="text-xs text-muted-foreground">{tasks.length}</span>
              </div>
              <div className="space-y-2 p-2">
                {tasks.map((task) => (
                  <div key={task.id} className="rounded-md border bg-background p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{task.name}</span>
                      <div className="flex gap-1">
                        <Badge value={task.priority} map={PRIORITY_MAP} />
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {task.assignee && <span>{task.assignee.name}</span>}
                      {task.milestone && <span>{task.milestone.name}</span>}
                      {task.dueDate && <span>Due {formatDate(task.dueDate)}</span>}
                      {task.subtasks.length > 0 && (
                        <span>
                          {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length} subtasks
                        </span>
                      )}
                      {task.comments.length > 0 && <span>{task.comments.length} comments</span>}
                    </div>

                    {task.comments.length > 0 && (
                      <div className="mt-2 space-y-1 border-t pt-2">
                        {task.comments.slice(0, 2).map((comment) => (
                          <p key={comment.id} className="text-xs text-muted-foreground">
                            <span className="font-medium">{comment.author.name}:</span> {comment.body}
                          </p>
                        ))}
                      </div>
                    )}

                    {canEdit && (
                      <>
                        <div className="mt-2 flex gap-1">
                          <form action={updateTaskStatus} className="flex flex-1 gap-1">
                            <input type="hidden" name="id" value={task.id} />
                            <input type="hidden" name="projectId" value={id} />
                            <input type="hidden" name="returnTo" value={boardUrl} />
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
                          <form action={deleteTask}>
                            <input type="hidden" name="id" value={task.id} />
                            <input type="hidden" name="projectId" value={id} />
                            <input type="hidden" name="returnTo" value={boardUrl} />
                            <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                              Delete
                            </Button>
                          </form>
                        </div>
                        <form action={createComment} className="mt-2 space-y-1">
                          <input type="hidden" name="projectId" value={id} />
                          <input type="hidden" name="taskId" value={task.id} />
                          <input type="hidden" name="returnTo" value={boardUrl} />
                          <Textarea name="body" rows={1} required placeholder="Add comment…" />
                          <Button type="submit" size="sm" variant="outline">
                            Comment
                          </Button>
                        </form>
                      </>
                    )}
                  </div>
                ))}
                {tasks.length === 0 && (
                  <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                    No tasks here
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
