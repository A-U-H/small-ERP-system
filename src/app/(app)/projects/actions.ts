"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

async function requireProjects(level: "view" | "edit" = "view") {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  if (!hasAccess(role, "projects", level)) redirect("/");
  return session;
}

async function recordActivity(
  actorId: string,
  entityType: string,
  entityId: string | null,
  action: string,
  detail?: Prisma.InputJsonValue,
) {
  await db.activityLog.create({
    data: { actorId, entityType, entityId, action, detail: detail ?? undefined },
  });
}

const emptyToNull = (v: unknown): string | null => {
  const s = String(v ?? "");
  return s.trim() === "" ? null : s.trim();
};

const optionalNumber = (v: unknown): number | null => {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const stringArray = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  const s = String(v ?? "");
  return s === "" ? [] : [s];
};

// ─────────────────────────── Projects ───────────────────────────

const projectSchema = z.object({
  name: z.string().min(1).max(150),
  companyId: z.string().min(1),
  contractId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"]),
  budget: z.coerce.number().min(0).optional(),
  description: z.string().max(4000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

export async function createProject(formData: FormData) {
  const session = await requireProjects("edit");
  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    companyId: formData.get("companyId"),
    contractId: emptyToNull(formData.get("contractId")) ?? undefined,
    startDate: emptyToNull(formData.get("startDate")) ?? undefined,
    endDate: emptyToNull(formData.get("endDate")) ?? undefined,
    status: formData.get("status") || "PLANNED",
    budget: optionalNumber(formData.get("budget")) ?? undefined,
    description: formData.get("description") || undefined,
    priority: formData.get("priority") || "MEDIUM",
  });
  if (!parsed.success) redirect("/projects/new?error=validation");

  const tagIds = stringArray(formData.getAll("tagIds"));
  const templateId = emptyToNull(formData.get("templateId"));

  const data = {
    name: parsed.data.name,
    companyId: parsed.data.companyId,
    contractId: parsed.data.contractId ?? null,
    startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
    endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
    status: parsed.data.status,
    budget: parsed.data.budget ?? null,
    description: parsed.data.description || null,
    priority: parsed.data.priority,
    tags: { create: tagIds.map((tagId) => ({ tagId })) },
  };

  const project = await db.project.create({ data });

  if (templateId) {
    const template = await db.projectTemplate.findUnique({
      where: { id: templateId },
      include: {
        milestones: {
          orderBy: { order: "asc" },
          include: { tasks: { orderBy: { order: "asc" } } },
        },
      },
    });
    if (template) {
      for (const m of template.milestones) {
        const milestone = await db.milestone.create({
          data: { projectId: project.id, name: m.name, order: m.order },
        });
        if (m.tasks.length > 0) {
          await db.task.createMany({
            data: m.tasks.map((t) => ({
              projectId: project.id,
              milestoneId: milestone.id,
              name: t.name,
            })),
          });
        }
      }
    }
  }

  await recordActivity(session.user.id, "PROJECT", project.id, "CREATED", { name: project.name });
  revalidatePath("/projects");
  redirect(`/projects/${project.id}?created=1`);
}

export async function updateProject(formData: FormData) {
  const session = await requireProjects("edit");
  const id = String(formData.get("id") ?? "");
  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    companyId: formData.get("companyId"),
    contractId: emptyToNull(formData.get("contractId")) ?? undefined,
    startDate: emptyToNull(formData.get("startDate")) ?? undefined,
    endDate: emptyToNull(formData.get("endDate")) ?? undefined,
    status: formData.get("status") || "PLANNED",
    budget: optionalNumber(formData.get("budget")) ?? undefined,
    description: formData.get("description") || undefined,
    priority: formData.get("priority") || "MEDIUM",
  });
  if (!parsed.success || !id) redirect(`/projects/${id}?error=validation`);

  const tagIds = stringArray(formData.getAll("tagIds"));

  await db.project.update({
    where: { id },
    data: {
      name: parsed.data.name,
      companyId: parsed.data.companyId,
      contractId: parsed.data.contractId ?? null,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      status: parsed.data.status,
      budget: parsed.data.budget ?? null,
      description: parsed.data.description || null,
      priority: parsed.data.priority,
      tags: { deleteMany: {}, create: tagIds.map((tagId) => ({ tagId })) },
    },
  });

  await recordActivity(session.user.id, "PROJECT", id, "UPDATED");
  revalidatePath(`/projects/${id}`);
  redirect(`/projects/${id}?saved=1`);
}

export async function updateProjectStatus(formData: FormData) {
  const session = await requireProjects("edit");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  const statuses = ["PLANNED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"];
  if (!id || !statuses.includes(status)) redirect(`/projects/${id}?error=status`);

  await db.project.update({ where: { id }, data: { status: status as never } });
  await recordActivity(session.user.id, "PROJECT", id, "STATUS_CHANGED", { status });
  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
  redirect(`/projects/${id}?status=1`);
}

export async function archiveProject(formData: FormData) {
  const session = await requireProjects("edit");
  const id = String(formData.get("id") ?? "");
  await db.project.updateMany({ where: { id }, data: { archived: true } });
  await recordActivity(session.user.id, "PROJECT", id, "ARCHIVED");
  revalidatePath("/projects");
  redirect("/projects?archived=1");
}

// ─────────────────────────── Milestones ───────────────────────────

const milestoneSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(150),
  dueDate: z.string().optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "DONE"]),
  description: z.string().max(2000).optional(),
  billingValue: z.coerce.number().min(0).optional(),
  order: z.coerce.number().optional(),
});

export async function createMilestone(formData: FormData) {
  const session = await requireProjects("edit");
  const parsed = milestoneSchema.safeParse({
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    dueDate: emptyToNull(formData.get("dueDate")) ?? undefined,
    status: formData.get("status") || "PENDING",
    description: formData.get("description") || undefined,
    billingValue: optionalNumber(formData.get("billingValue")) ?? undefined,
    order: optionalNumber(formData.get("order")) ?? 0,
  });
  if (!parsed.success) redirect(`/projects/${String(formData.get("projectId") ?? "")}?error=validation`);

  const milestone = await db.milestone.create({
    data: {
      projectId: parsed.data.projectId,
      name: parsed.data.name,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      status: parsed.data.status,
      description: parsed.data.description || null,
      billingValue: parsed.data.billingValue ?? null,
      order: parsed.data.order ?? 0,
    },
  });

  await recordActivity(session.user.id, "MILESTONE", milestone.id, "CREATED", { name: milestone.name });
  revalidatePath(`/projects/${parsed.data.projectId}`);
  redirect(`/projects/${parsed.data.projectId}?milestone=1`);
}

export async function updateMilestoneStatus(formData: FormData) {
  const session = await requireProjects("edit");
  const id = String(formData.get("id") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const status = String(formData.get("status") ?? "");

  const statuses = ["PENDING", "IN_PROGRESS", "DONE"];
  if (!id || !statuses.includes(status)) redirect(`/projects/${projectId}?error=status`);

  await db.milestone.update({ where: { id }, data: { status: status as never } });
  await recordActivity(session.user.id, "MILESTONE", id, "STATUS_CHANGED", { status });
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?milestone=1`);
}

export async function deleteMilestone(formData: FormData) {
  await requireProjects("edit");
  const id = String(formData.get("id") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  await db.milestone.deleteMany({ where: { id } });
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?milestone=1`);
}

// ─────────────────────────── Tasks & subtasks ───────────────────────────

const taskSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(150),
  milestoneId: z.string().optional(),
  sprintId: z.string().optional(),
  description: z.string().max(3000).optional(),
  assigneeId: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"]),
  dueDate: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  estimate: z.coerce.number().min(0).optional(),
});

export async function createTask(formData: FormData) {
  const session = await requireProjects("edit");
  const projectId = String(formData.get("projectId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? `/projects/${projectId}`);
  const parsed = taskSchema.safeParse({
    projectId,
    name: formData.get("name"),
    milestoneId: emptyToNull(formData.get("milestoneId")) ?? undefined,
    sprintId: emptyToNull(formData.get("sprintId")) ?? undefined,
    description: formData.get("description") || undefined,
    assigneeId: emptyToNull(formData.get("assigneeId")) ?? undefined,
    status: formData.get("status") || "TODO",
    dueDate: emptyToNull(formData.get("dueDate")) ?? undefined,
    priority: formData.get("priority") || "MEDIUM",
    estimate: optionalNumber(formData.get("estimate")) ?? undefined,
  });
  if (!parsed.success) redirect(`${returnTo}?error=validation`);

  const task = await db.task.create({
    data: {
      projectId,
      name: parsed.data.name,
      milestoneId: parsed.data.milestoneId ?? null,
      sprintId: parsed.data.sprintId ?? null,
      description: parsed.data.description || null,
      assigneeId: parsed.data.assigneeId ?? null,
      status: parsed.data.status,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      priority: parsed.data.priority,
      estimate: parsed.data.estimate ?? null,
    },
  });

  await recordActivity(session.user.id, "TASK", task.id, "CREATED", { name: task.name });
  revalidatePath(returnTo);
  redirect(`${returnTo}?task=1`);
}

export async function updateTaskStatus(formData: FormData) {
  const session = await requireProjects("edit");
  const id = String(formData.get("id") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const status = String(formData.get("status") ?? "");
  const returnTo = String(formData.get("returnTo") ?? `/projects/${projectId}`);

  const statuses = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"];
  if (!id || !statuses.includes(status)) redirect(returnTo);

  await db.task.update({ where: { id }, data: { status: status as never } });
  await recordActivity(session.user.id, "TASK", id, "STATUS_CHANGED", { status });
  revalidatePath(returnTo);
  redirect(`${returnTo}?moved=1`);
}

export async function deleteTask(formData: FormData) {
  await requireProjects("edit");
  const id = String(formData.get("id") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? `/projects/${projectId}`);
  await db.task.deleteMany({ where: { id } });
  revalidatePath(returnTo);
  redirect(`${returnTo}?task=1`);
}

const subtaskSchema = z.object({
  taskId: z.string().min(1),
  name: z.string().min(1).max(150),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
});

export async function createSubtask(formData: FormData) {
  await requireProjects("edit");
  const projectId = String(formData.get("projectId") ?? "");
  const parsed = subtaskSchema.safeParse({
    taskId: formData.get("taskId"),
    name: formData.get("name"),
    dueDate: emptyToNull(formData.get("dueDate")) ?? undefined,
    assigneeId: emptyToNull(formData.get("assigneeId")) ?? undefined,
  });
  if (!parsed.success) redirect(`/projects/${projectId}?error=validation`);

  await db.subtask.create({
    data: {
      taskId: parsed.data.taskId,
      name: parsed.data.name,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      assigneeId: parsed.data.assigneeId ?? null,
    },
  });
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?task=1`);
}

export async function toggleSubtask(formData: FormData) {
  await requireProjects("edit");
  const id = String(formData.get("id") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const done = formData.has("done");

  const subtask = await db.subtask.update({ where: { id }, data: { done } });
  const siblings = await db.subtask.findMany({ where: { taskId: subtask.taskId } });
  const allDone = siblings.length > 0 && siblings.every((s) => s.done);
  if (allDone) {
    await db.task.updateMany({
      where: { id: subtask.taskId, status: { not: "DONE" } },
      data: { status: "DONE" as never },
    });
  } else {
    await db.task.updateMany({
      where: { id: subtask.taskId, status: "DONE" },
      data: { status: "IN_PROGRESS" as never },
    });
  }
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?task=1`);
}

export async function deleteSubtask(formData: FormData) {
  await requireProjects("edit");
  const id = String(formData.get("id") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  await db.subtask.deleteMany({ where: { id } });
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?task=1`);
}

// ─────────────────────────── Sprints ───────────────────────────

const sprintSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(150),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  goal: z.string().max(2000).optional(),
  status: z.enum(["PLANNED", "ACTIVE", "CLOSED"]),
});

export async function createSprint(formData: FormData) {
  const session = await requireProjects("edit");
  const projectId = String(formData.get("projectId") ?? "");
  const parsed = sprintSchema.safeParse({
    projectId,
    name: formData.get("name"),
    startDate: emptyToNull(formData.get("startDate")) ?? undefined,
    endDate: emptyToNull(formData.get("endDate")) ?? undefined,
    goal: formData.get("goal") || undefined,
    status: formData.get("status") || "PLANNED",
  });
  if (!parsed.success) redirect(`/projects/${projectId}?error=validation`);

  const sprint = await db.sprint.create({
    data: {
      projectId,
      name: parsed.data.name,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      goal: parsed.data.goal || null,
      status: parsed.data.status,
    },
  });

  await recordActivity(session.user.id, "SPRINT", sprint.id, "CREATED", { name: sprint.name });
  revalidatePath(`/projects/${projectId}/sprints`);
  redirect(`/projects/${projectId}/sprints?created=1`);
}

export async function updateSprintStatus(formData: FormData) {
  const session = await requireProjects("edit");
  const id = String(formData.get("id") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const status = String(formData.get("status") ?? "");

  const statuses = ["PLANNED", "ACTIVE", "CLOSED"];
  if (!id || !statuses.includes(status)) redirect(`/projects/${projectId}/sprints?error=status`);

  await db.sprint.update({ where: { id }, data: { status: status as never } });
  await recordActivity(session.user.id, "SPRINT", id, "STATUS_CHANGED", { status });
  revalidatePath(`/projects/${projectId}/sprints`);
  redirect(`/projects/${projectId}/sprints?status=1`);
}

export async function deleteSprint(formData: FormData) {
  await requireProjects("edit");
  const id = String(formData.get("id") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  await db.sprint.deleteMany({ where: { id } });
  revalidatePath(`/projects/${projectId}/sprints`);
  redirect(`/projects/${projectId}/sprints?deleted=1`);
}

// ─────────────────────────── Members ───────────────────────────

const memberSchema = z.object({
  projectId: z.string().min(1),
  employeeId: z.string().min(1),
  role: z.enum(["PROJECT_MANAGER", "TEAM_MEMBER", "REVIEWER", "VIEWER"]),
});

export async function createProjectMember(formData: FormData) {
  const session = await requireProjects("edit");
  const parsed = memberSchema.safeParse({
    projectId: formData.get("projectId"),
    employeeId: formData.get("employeeId"),
    role: formData.get("role") || "TEAM_MEMBER",
  });
  if (!parsed.success) redirect(`/projects/${String(formData.get("projectId") ?? "")}?error=validation`);

  await db.projectMember.upsert({
    where: { projectId_employeeId: { projectId: parsed.data.projectId, employeeId: parsed.data.employeeId } },
    create: parsed.data,
    update: { role: parsed.data.role },
  });

  await recordActivity(session.user.id, "PROJECT_MEMBER", parsed.data.projectId, "MEMBER_ADDED", {
    employeeId: parsed.data.employeeId,
    role: parsed.data.role,
  });
  revalidatePath(`/projects/${parsed.data.projectId}`);
  redirect(`/projects/${parsed.data.projectId}?member=1`);
}

export async function removeProjectMember(formData: FormData) {
  await requireProjects("edit");
  const id = String(formData.get("id") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  await db.projectMember.deleteMany({ where: { id } });
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?member=1`);
}

// ─────────────────────────── Comments ───────────────────────────

const commentSchema = z.object({
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  body: z.string().min(1).max(5000),
});

export async function createComment(formData: FormData) {
  const session = await requireProjects("edit");
  const returnTo = String(formData.get("returnTo") ?? `/projects/${String(formData.get("projectId") ?? "")}`);
  const parsed = commentSchema.safeParse({
    projectId: emptyToNull(formData.get("projectId")) ?? undefined,
    taskId: emptyToNull(formData.get("taskId")) ?? undefined,
    body: formData.get("body"),
  });
  if (!parsed.success) redirect(`${returnTo}?error=comment`);

  const comment = await db.comment.create({
    data: {
      projectId: parsed.data.projectId ?? null,
      taskId: parsed.data.taskId ?? null,
      authorId: session.user.id,
      body: parsed.data.body,
    },
  });

  await recordActivity(session.user.id, "COMMENT", comment.id, "CREATED");
  revalidatePath(returnTo);
  redirect(`${returnTo}?comment=1`);
}

// ─────────────────────────── Attachments ───────────────────────────

const attachmentSchema = z.object({
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  name: z.string().min(1).max(255),
  url: z.string().max(1000).optional(),
  folder: z.string().max(150).optional(),
  mimeType: z.string().max(100).optional(),
  size: z.coerce.number().int().min(0).optional(),
});

export async function createAttachment(formData: FormData) {
  const session = await requireProjects("edit");
  const parsed = attachmentSchema.safeParse({
    projectId: emptyToNull(formData.get("projectId")) ?? undefined,
    taskId: emptyToNull(formData.get("taskId")) ?? undefined,
    name: formData.get("name"),
    url: formData.get("url") || undefined,
    folder: formData.get("folder") || undefined,
    mimeType: formData.get("mimeType") || undefined,
    size: optionalNumber(formData.get("size")) ?? undefined,
  });
  if (!parsed.success) redirect(`/projects/${String(formData.get("projectId") ?? "")}?error=file`);

  const attachment = await db.attachment.create({
    data: {
      projectId: parsed.data.projectId ?? null,
      taskId: parsed.data.taskId ?? null,
      name: parsed.data.name,
      url: parsed.data.url || "",
      folder: parsed.data.folder || null,
      mimeType: parsed.data.mimeType || null,
      size: parsed.data.size ?? null,
      uploadedById: session.user.employeeId,
    },
  });

  await recordActivity(session.user.id, "ATTACHMENT", attachment.id, "UPLOADED", { name: attachment.name });
  revalidatePath(`/projects/${String(formData.get("projectId") ?? "")}`);
  redirect(`/projects/${String(formData.get("projectId") ?? "")}?file=1`);
}

// ─────────────────────────── Templates ───────────────────────────

const templateSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(2000).optional(),
  milestones: z.array(
    z.object({
      name: z.string().min(1).max(150),
      tasks: z.array(z.object({ name: z.string().min(1).max(150) })),
    }),
  ),
});

export async function createTemplate(formData: FormData) {
  const session = await requireProjects("edit");

  const milestonesRaw = formData.get("milestones");
  let milestones: unknown = [];
  if (typeof milestonesRaw === "string" && milestonesRaw.trim() !== "") {
    try {
      milestones = JSON.parse(milestonesRaw);
    } catch {
      redirect("/projects/templates/new?error=milestones");
    }
  }

  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    milestones,
  });
  if (!parsed.success) redirect("/projects/templates/new?error=validation");

  const template = await db.projectTemplate.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
    },
  });

  for (const [i, m] of parsed.data.milestones.entries()) {
    const milestone = await db.projectTemplateMilestone.create({
      data: { templateId: template.id, name: m.name, order: i },
    });
    if (m.tasks.length > 0) {
      await db.projectTemplateTask.createMany({
        data: m.tasks.map((t, j) => ({
          templateId: template.id,
          milestoneId: milestone.id,
          name: t.name,
          order: j,
        })),
      });
    }
  }

  await recordActivity(session.user.id, "PROJECT_TEMPLATE", template.id, "CREATED", { name: template.name });
  revalidatePath("/projects/templates");
  redirect("/projects/templates?created=1");
}

export async function deleteTemplate(formData: FormData) {
  await requireProjects("edit");
  const id = String(formData.get("id") ?? "");
  await db.projectTemplate.deleteMany({ where: { id } });
  revalidatePath("/projects/templates");
  redirect("/projects/templates?deleted=1");
}
