import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import {
  updateProject,
  archiveProject,
  createMilestone,
  updateMilestoneStatus,
  deleteMilestone,
  createTask,
  updateTaskStatus,
  deleteTask,
  createSubtask,
  deleteSubtask,
  createProjectMember,
  removeProjectMember,
  createComment,
  createAttachment,
} from "@/app/(app)/projects/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SubtaskToggle } from "@/components/projects/subtask-toggle";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_MAP,
  PRIORITY_MAP,
  PRIORITY_OPTIONS,
  MILESTONE_STATUSES,
  MILESTONE_STATUS_MAP,
  TASK_STATUSES,
  TASK_STATUS_MAP,
  PROJECT_MEMBER_ROLES,
  PROJECT_MEMBER_ROLE_MAP,
} from "@/lib/project-labels";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { projectProgress } from "@/lib/project-progress";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  const canEdit = hasAccess(role, "projects", "edit");

  const [project, companies, contracts, employees, tags] = await Promise.all([
    db.project.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        contract: { select: { id: true, number: true } },
        milestones: { orderBy: { order: "asc" } },
        tasks: {
          include: { assignee: { select: { name: true } }, subtasks: { orderBy: { createdAt: "asc" } } },
          orderBy: { createdAt: "desc" },
        },
        members: { include: { employee: { select: { name: true, position: true } } } },
        comments: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
        attachments: { orderBy: { createdAt: "desc" } },
        tags: { include: { tag: true } },
        sprints: { orderBy: { createdAt: "desc" } },
      },
    }),
    db.company.findMany({ where: { archived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.contract.findMany({
      where: { archived: false, status: { in: ["SIGNED", "ACTIVE"] } },
      select: { id: true, number: true, companyId: true },
      orderBy: { createdAt: "desc" },
    }),
    db.employee.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, position: true },
      orderBy: { name: "asc" },
    }),
    db.tag.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  if (!project) {
    return <p className="text-sm text-muted-foreground">Project not found.</p>;
  }

  const activity = await db.activityLog.findMany({
    where: {
      entityId: {
        in: [
          project.id,
          ...project.milestones.map((m) => m.id),
          ...project.tasks.map((t) => t.id),
          ...project.sprints.map((s) => s.id),
          ...project.members.map((m) => m.id),
          ...project.comments.map((c) => c.id),
          ...project.attachments.map((a) => a.id),
        ],
      },
    },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const progress = projectProgress(project.tasks);
  const selectedTagIds = project.tags.map((t) => t.tagId);
  const memberIds = project.members.map((m) => m.employeeId);

  const milestoneGroups = [
    { id: "", name: "General", tasks: [] as typeof project.tasks },
    ...project.milestones.map((m) => ({ id: m.id, name: m.name, tasks: [] as typeof project.tasks })),
  ];
  for (const task of project.tasks) {
    const group = milestoneGroups.find((g) => g.id === (task.milestoneId ?? ""));
    if (group) group.tasks.push(task);
  }

  const toDate = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");
  const formatBytes = (b: number | null | undefined) => {
    if (!b) return "";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{project.name}</h1>
            <Badge value={project.status} map={PROJECT_STATUS_MAP} />
            <Badge value={project.priority} map={PRIORITY_MAP} />
            {project.tags.map(({ tag }) => (
              <span key={tag.id} className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {tag.name}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link href={`/crm/companies/${project.companyId}`} className="hover:underline">
              {project.company.name}
            </Link>
            {project.contract && (
              <Link href={`/crm/contracts/${project.contractId}`} className="hover:underline">
                · {project.contract.number}
              </Link>
            )}
            {project.startDate && <span>· {formatDate(project.startDate)}</span>}
            {project.endDate && <span>→ {formatDate(project.endDate)}</span>}
            {project.budget !== null && <span>· {formatCurrency(project.budget)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ButtonLink href={`/projects/${project.id}/board`} variant="secondary">
            Board
          </ButtonLink>
          <ButtonLink href={`/projects/${project.id}/sprints`} variant="secondary">
            Sprints
          </ButtonLink>
          <Link href="/projects">
            <Button variant="secondary">Back</Button>
          </Link>
          {canEdit && (
            <form action={archiveProject}>
              <input type="hidden" name="id" value={project.id} />
              <Button type="submit" variant="destructive">
                Archive
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-sm font-medium">{progress}% complete</span>
      </div>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateProject} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={project.id} />
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" defaultValue={project.name} required maxLength={150} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyId">Client company *</Label>
                <NativeSelect id="companyId" name="companyId" defaultValue={project.companyId} required>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractId">Linked contract</Label>
                <NativeSelect id="contractId" name="contractId" defaultValue={project.contractId ?? ""}>
                  <option value="">None</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.number} ({companies.find((x) => x.id === c.companyId)?.name ?? "—"})
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start date</Label>
                <Input id="startDate" name="startDate" type="date" defaultValue={toDate(project.startDate)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End date</Label>
                <Input id="endDate" name="endDate" type="date" defaultValue={toDate(project.endDate)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <NativeSelect id="status" name="status" defaultValue={project.status}>
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <NativeSelect id="priority" name="priority" defaultValue={project.priority}>
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (AED)</Label>
                <Input id="budget" name="budget" type="number" min="0" step="0.01" defaultValue={project.budget?.toString() ?? ""} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" rows={3} defaultValue={project.description ?? ""} />
              </div>
              {tags.length > 0 && (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-3">
                    {tags.map((tag) => (
                      <label key={tag.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="tagIds"
                          value={tag.id}
                          defaultChecked={selectedTagIds.includes(tag.id)}
                          className="size-4"
                        />
                        {tag.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="sm:col-span-2">
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Milestones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {project.milestones.map((milestone) => (
                <div key={milestone.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-medium">{milestone.name}</span>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge value={milestone.status} map={MILESTONE_STATUS_MAP} />
                        {milestone.dueDate && <span>Due {formatDate(milestone.dueDate)}</span>}
                        {milestone.billingValue !== null && (
                          <span>{formatCurrency(milestone.billingValue)}</span>
                        )}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <form action={updateMilestoneStatus}>
                          <input type="hidden" name="id" value={milestone.id} />
                          <input type="hidden" name="projectId" value={project.id} />
                          <NativeSelect name="status" defaultValue={milestone.status} aria-label="Milestone status">
                            {MILESTONE_STATUSES.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </NativeSelect>
                          <Button type="submit" size="sm" variant="outline">
                            Save
                          </Button>
                        </form>
                        <form action={deleteMilestone}>
                          <input type="hidden" name="id" value={milestone.id} />
                          <input type="hidden" name="projectId" value={project.id} />
                          <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                            Delete
                          </Button>
                        </form>
                      </div>
                    )}
                  </div>
                  {milestone.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{milestone.description}</p>
                  )}
                </div>
              ))}
              {project.milestones.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">No milestones yet.</p>
              )}

              {canEdit && (
                <form action={createMilestone} className="space-y-3 rounded-md border p-3">
                  <input type="hidden" name="projectId" value={project.id} />
                  <div className="space-y-2">
                    <Label htmlFor="milestoneName">Add milestone</Label>
                    <Input id="milestoneName" name="name" required maxLength={150} placeholder="Milestone name" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label htmlFor="msDue">Due date</Label>
                      <Input id="msDue" name="dueDate" type="date" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="msValue">Billing value (AED)</Label>
                      <Input id="msValue" name="billingValue" type="number" min="0" step="0.01" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="msStatus">Status</Label>
                      <NativeSelect id="msStatus" name="status" defaultValue="PENDING">
                        {MILESTONE_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                  </div>
                  <Button type="submit" size="sm">
                    Add milestone
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {project.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                  <div>
                    <span className="text-sm font-medium">{member.employee.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {member.employee.position ?? ""} · {PROJECT_MEMBER_ROLE_MAP[member.role]}
                    </span>
                  </div>
                  {canEdit && (
                    <form action={removeProjectMember}>
                      <input type="hidden" name="id" value={member.id} />
                      <input type="hidden" name="projectId" value={project.id} />
                      <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                        Remove
                      </Button>
                    </form>
                  )}
                </div>
              ))}
              {project.members.length === 0 && (
                <p className="py-2 text-center text-sm text-muted-foreground">No members yet.</p>
              )}

              {canEdit && (
                <form action={createProjectMember} className="flex flex-wrap items-end gap-3 rounded-md border p-3">
                  <input type="hidden" name="projectId" value={project.id} />
                  <div className="min-w-48 flex-1 space-y-1">
                    <Label htmlFor="employeeId">Add member</Label>
                    <NativeSelect id="employeeId" name="employeeId" required>
                      <option value="">Select employee…</option>
                      {employees
                        .filter((e) => !memberIds.includes(e.id))
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                            {e.position ? ` (${e.position})` : ""}
                          </option>
                        ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="memberRole">Role</Label>
                    <NativeSelect id="memberRole" name="role" defaultValue="TEAM_MEMBER">
                      {PROJECT_MEMBER_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
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
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {canEdit && (
                <form action={createTask} className="space-y-3 rounded-md border p-3">
                  <input type="hidden" name="projectId" value={project.id} />
                  <div className="space-y-1">
                    <Label htmlFor="taskName">Add task</Label>
                    <Input id="taskName" name="name" required maxLength={150} placeholder="Task name" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="taskMilestone">Milestone</Label>
                      <NativeSelect id="taskMilestone" name="milestoneId" defaultValue="">
                        <option value="">None</option>
                        {project.milestones.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="taskAssignee">Assignee</Label>
                      <NativeSelect id="taskAssignee" name="assigneeId" defaultValue="">
                        <option value="">Unassigned</option>
                        {employees.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="taskStatus">Status</Label>
                      <NativeSelect id="taskStatus" name="status" defaultValue="TODO">
                        {TASK_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="taskPriority">Priority</Label>
                      <NativeSelect id="taskPriority" name="priority" defaultValue="MEDIUM">
                        {PRIORITY_OPTIONS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="taskDue">Due date</Label>
                      <Input id="taskDue" name="dueDate" type="date" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="taskEstimate">Estimate (hours)</Label>
                      <Input id="taskEstimate" name="estimate" type="number" min="0" step="0.5" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="taskDesc">Description</Label>
                    <Textarea id="taskDesc" name="description" rows={2} />
                  </div>
                  <Button type="submit" size="sm">
                    Add task
                  </Button>
                </form>
              )}

              {milestoneGroups.map((group) =>
                group.tasks.length === 0 ? null : (
                  <div key={group.id}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.name}
                    </h3>
                    <div className="space-y-2">
                      {group.tasks.map((task) => (
                        <div key={task.id} className="rounded-md border p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium">{task.name}</span>
                              <Badge value={task.status} map={TASK_STATUS_MAP} />
                              <Badge value={task.priority} map={PRIORITY_MAP} />
                            </div>
                            <div className="flex items-center gap-1">
                              {canEdit && (
                                <form action={updateTaskStatus}>
                                  <input type="hidden" name="id" value={task.id} />
                                  <input type="hidden" name="projectId" value={project.id} />
                                  <NativeSelect name="status" defaultValue={task.status} aria-label="Task status">
                                    {TASK_STATUSES.map((s) => (
                                      <option key={s.value} value={s.value}>
                                        {s.label}
                                      </option>
                                    ))}
                                  </NativeSelect>
                                  <Button type="submit" size="sm" variant="outline">
                                    Save
                                  </Button>
                                </form>
                              )}
                              {canEdit && (
                                <form action={deleteTask}>
                                  <input type="hidden" name="id" value={task.id} />
                                  <input type="hidden" name="projectId" value={project.id} />
                                  <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                                    Delete
                                  </Button>
                                </form>
                              )}
                            </div>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            {task.assignee && <span>{task.assignee.name}</span>}
                            {task.dueDate && <span>Due {formatDate(task.dueDate)}</span>}
                            {task.estimate !== null && <span>{task.estimate.toString()}h</span>}
                            {task.description && <span className="w-full">{task.description}</span>}
                          </div>

                          {task.subtasks.length > 0 && (
                            <div className="mt-2 space-y-1 border-t pt-2">
                              {task.subtasks.map((subtask) => (
                                <div key={subtask.id} className="flex items-center justify-between gap-2">
                                  <SubtaskToggle
                                    id={subtask.id}
                                    projectId={project.id}
                                    done={subtask.done}
                                    label={subtask.name}
                                  />
                                  {subtask.dueDate && (
                                    <span className="text-xs text-muted-foreground">
                                      {formatDate(subtask.dueDate)}
                                    </span>
                                  )}
                                  {canEdit && (
                                    <form action={deleteSubtask}>
                                      <input type="hidden" name="id" value={subtask.id} />
                                      <input type="hidden" name="projectId" value={project.id} />
                                      <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                                        Remove
                                      </Button>
                                    </form>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {canEdit && (
                            <form action={createSubtask} className="mt-2 flex gap-2">
                              <input type="hidden" name="projectId" value={project.id} />
                              <input type="hidden" name="taskId" value={task.id} />
                              <Input name="name" placeholder="Add subtask…" required maxLength={150} className="h-8" />
                              <Button type="submit" size="sm" variant="outline">
                                Add
                              </Button>
                            </form>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              )}
              {project.tasks.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">No tasks yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.comments.map((comment) => (
              <div key={comment.id} className="space-y-1">
                <div className="flex items-baseline gap-2 text-sm">
                  <span className="font-medium">{comment.author.name}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(comment.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{comment.body}</p>
              </div>
            ))}
            {project.comments.length === 0 && (
              <p className="py-2 text-center text-sm text-muted-foreground">No comments yet.</p>
            )}
            {canEdit && (
              <form action={createComment} className="space-y-2 border-t pt-3">
                <input type="hidden" name="projectId" value={project.id} />
                <Textarea name="body" rows={2} required placeholder="Write a comment…" />
                <Button type="submit" size="sm">
                  Post comment
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Files</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {project.attachments.map((file) => (
                <div key={file.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                  <div className="min-w-0">
                    {file.url ? (
                      <a href={file.url} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline">
                        {file.name}
                      </a>
                    ) : (
                      <span className="text-sm font-medium">{file.name}</span>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(file.size)}
                      {file.folder ? ` · ${file.folder}` : ""}
                    </p>
                  </div>
                </div>
              ))}
              {project.attachments.length === 0 && (
                <p className="py-2 text-center text-sm text-muted-foreground">No files yet.</p>
              )}
              {canEdit && (
                <form action={createAttachment} className="space-y-3 rounded-md border p-3">
                  <input type="hidden" name="projectId" value={project.id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="fileName">File name *</Label>
                      <Input id="fileName" name="name" required maxLength={255} placeholder="e.g. contract.pdf" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="fileUrl">URL</Label>
                      <Input id="fileUrl" name="url" placeholder="https://…" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="fileFolder">Folder</Label>
                      <Input id="fileFolder" name="folder" maxLength={150} placeholder="e.g. Contracts" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="fileSize">Size (bytes)</Label>
                      <Input id="fileSize" name="size" type="number" min="0" step="1" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Actual upload is wired once file storage is configured; you can link a file by URL for now.
                  </p>
                  <Button type="submit" size="sm">
                    Add file
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activity.map((entry) => (
                <div key={entry.id} className="flex items-baseline gap-2 text-sm">
                  <span className="font-medium">{entry.actor?.name ?? "System"}</span>
                  <span className="text-muted-foreground">
                    {entry.action} · {entry.entityType}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>
              ))}
              {activity.length === 0 && (
                <p className="py-2 text-center text-sm text-muted-foreground">No activity yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
