"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

async function requireTeam(level: "view" | "edit" = "view") {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  if (!hasAccess(role, "team", level)) redirect("/");
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

const employeePath = (id: string | null | undefined, fallback = "/team/members") =>
  id ? `/team/members/${id}` : fallback;

// ─────────────────────────── Employees ───────────────────────────

const employeeSchema = z.object({
  name: z.string().min(1).max(150),
  email: z.string().email().max(200),
  phone: z.string().max(30).optional(),
  position: z.string().max(100).optional(),
  departmentId: z.string().optional(),
  hireDate: z.string().optional(),
  hourlyRate: z.coerce.number().min(0).optional(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "INACTIVE"]),
});

async function relinkUser(employeeId: string, newUserId: string | null, oldUserId: string | null) {
  if (oldUserId && oldUserId !== newUserId) {
    await db.user.updateMany({ where: { id: oldUserId }, data: { employeeId: null } });
  }
  if (newUserId) {
    await db.user.update({ where: { id: newUserId }, data: { employeeId } });
  }
}

export async function createEmployee(formData: FormData) {
  const session = await requireTeam("edit");
  const parsed = employeeSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    position: formData.get("position") || undefined,
    departmentId: emptyToNull(formData.get("departmentId")) ?? undefined,
    hireDate: emptyToNull(formData.get("hireDate")) ?? undefined,
    hourlyRate: optionalNumber(formData.get("hourlyRate")) ?? undefined,
    status: formData.get("status") || "ACTIVE",
  });
  if (!parsed.success) redirect("/team/members/new?error=validation");

  const userId = emptyToNull(formData.get("userId"));

  const employee = await db.employee.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      position: parsed.data.position || null,
      departmentId: parsed.data.departmentId ?? null,
      hireDate: parsed.data.hireDate ? new Date(parsed.data.hireDate) : null,
      hourlyRate: parsed.data.hourlyRate ?? null,
      status: parsed.data.status,
      userId,
    },
  });

  if (userId) await db.user.update({ where: { id: userId }, data: { employeeId: employee.id } });

  await recordActivity(session.user.id, "EMPLOYEE", employee.id, "CREATED", { name: employee.name });
  revalidatePath("/team/members");
  redirect(`/team/members/${employee.id}?created=1`);
}

export async function updateEmployee(formData: FormData) {
  const session = await requireTeam("edit");
  const id = String(formData.get("id") ?? "");
  const parsed = employeeSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    position: formData.get("position") || undefined,
    departmentId: emptyToNull(formData.get("departmentId")) ?? undefined,
    hireDate: emptyToNull(formData.get("hireDate")) ?? undefined,
    hourlyRate: optionalNumber(formData.get("hourlyRate")) ?? undefined,
    status: formData.get("status") || "ACTIVE",
  });
  if (!parsed.success || !id) redirect(employeePath(id, "/team/members/new"));

  const userId = emptyToNull(formData.get("userId"));
  const current = await db.employee.findUnique({ where: { id }, select: { userId: true } });
  if (!current) redirect("/team/members?error=employee");

  await relinkUser(id, userId, current.userId);

  await db.employee.update({
    where: { id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      position: parsed.data.position || null,
      departmentId: parsed.data.departmentId ?? null,
      hireDate: parsed.data.hireDate ? new Date(parsed.data.hireDate) : null,
      hourlyRate: parsed.data.hourlyRate ?? null,
      status: parsed.data.status,
      userId,
    },
  });

  await recordActivity(session.user.id, "EMPLOYEE", id, "UPDATED");
  revalidatePath(`/team/members/${id}`);
  redirect(`/team/members/${id}?saved=1`);
}

// ─────────────────────────── Skills ───────────────────────────

const skillSchema = z.object({
  employeeId: z.string().min(1),
  technologyId: z.string().min(1),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "EXPERT"]),
});

export async function addEmployeeSkill(formData: FormData) {
  const session = await requireTeam("edit");
  const parsed = skillSchema.safeParse({
    employeeId: formData.get("employeeId"),
    technologyId: formData.get("technologyId"),
    level: formData.get("level") || "INTERMEDIATE",
  });
  if (!parsed.success) redirect(employeePath(String(formData.get("employeeId") ?? "")));

  await db.employeeSkill.upsert({
    where: {
      employeeId_technologyId: {
        employeeId: parsed.data.employeeId,
        technologyId: parsed.data.technologyId,
      },
    },
    create: parsed.data,
    update: { level: parsed.data.level },
  });

  await recordActivity(session.user.id, "EMPLOYEE_SKILL", parsed.data.employeeId, "SKILL_UPDATED", {
    technologyId: parsed.data.technologyId,
    level: parsed.data.level,
  });
  revalidatePath(`/team/members/${parsed.data.employeeId}`);
  redirect(`/team/members/${parsed.data.employeeId}?skill=1`);
}

export async function removeEmployeeSkill(formData: FormData) {
  await requireTeam("edit");
  const id = String(formData.get("id") ?? "");
  const employeeId = String(formData.get("employeeId") ?? "");
  await db.employeeSkill.deleteMany({ where: { id } });
  revalidatePath(`/team/members/${employeeId}`);
  redirect(`/team/members/${employeeId}?skill=1`);
}

// ─────────────────────────── Time entries ───────────────────────────

const timeEntrySchema = z.object({
  employeeId: z.string().min(1),
  projectId: z.string().min(1),
  taskId: z.string().optional(),
  date: z.string().min(1),
  hours: z.coerce.number().min(0.25).max(24),
  notes: z.string().max(2000).optional(),
});

export async function createTimeEntry(formData: FormData) {
  const session = await requireTeam("edit");
  const parsed = timeEntrySchema.safeParse({
    employeeId: formData.get("employeeId"),
    projectId: formData.get("projectId"),
    taskId: emptyToNull(formData.get("taskId")) ?? undefined,
    date: formData.get("date"),
    hours: formData.get("hours"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) redirect("/team/time?error=validation");

  await db.timeEntry.create({
    data: {
      employeeId: parsed.data.employeeId,
      projectId: parsed.data.projectId,
      taskId: parsed.data.taskId ?? null,
      date: new Date(parsed.data.date),
      hours: parsed.data.hours,
      notes: parsed.data.notes || null,
      billable: formData.has("billable"),
      loggedById: session.user.id,
    },
  });

  await recordActivity(session.user.id, "TIME_ENTRY", null, "CREATED", {
    employeeId: parsed.data.employeeId,
    hours: parsed.data.hours,
  });
  revalidatePath("/team/time");
  redirect("/team/time?created=1");
}

export async function updateTimeEntry(formData: FormData) {
  await requireTeam("edit");
  const id = String(formData.get("id") ?? "");
  const parsed = timeEntrySchema.safeParse({
    employeeId: formData.get("employeeId"),
    projectId: formData.get("projectId"),
    taskId: emptyToNull(formData.get("taskId")) ?? undefined,
    date: formData.get("date"),
    hours: formData.get("hours"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success || !id) redirect("/team/time?error=validation");

  await db.timeEntry.update({
    where: { id },
    data: {
      employeeId: parsed.data.employeeId,
      projectId: parsed.data.projectId,
      taskId: parsed.data.taskId ?? null,
      date: new Date(parsed.data.date),
      hours: parsed.data.hours,
      notes: parsed.data.notes || null,
      billable: formData.has("billable"),
    },
  });
  revalidatePath("/team/time");
  redirect("/team/time?saved=1");
}

export async function deleteTimeEntry(formData: FormData) {
  await requireTeam("edit");
  const id = String(formData.get("id") ?? "");
  await db.timeEntry.deleteMany({ where: { id } });
  revalidatePath("/team/time");
  redirect("/team/time?deleted=1");
}

// ─────────────────────────── Attendance ───────────────────────────

const attendanceSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().min(1),
  hours: z.coerce.number().min(0).max(24).optional(),
  notes: z.string().max(2000).optional(),
});

export async function createAttendance(formData: FormData) {
  const session = await requireTeam("edit");
  const parsed = attendanceSchema.safeParse({
    employeeId: formData.get("employeeId"),
    date: formData.get("date"),
    hours: optionalNumber(formData.get("hours")) ?? undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) redirect("/team/attendance?error=validation");

  await db.attendance.upsert({
    where: {
      employeeId_date: {
        employeeId: parsed.data.employeeId,
        date: new Date(parsed.data.date),
      },
    },
    create: {
      employeeId: parsed.data.employeeId,
      date: new Date(parsed.data.date),
      hours: parsed.data.hours ?? null,
      notes: parsed.data.notes || null,
      createdById: session.user.id,
    },
    update: {
      hours: parsed.data.hours ?? null,
      notes: parsed.data.notes || null,
    },
  });

  await recordActivity(session.user.id, "ATTENDANCE", null, "CREATED", {
    employeeId: parsed.data.employeeId,
    date: parsed.data.date,
  });
  revalidatePath("/team/attendance");
  redirect("/team/attendance?created=1");
}

export async function updateAttendance(formData: FormData) {
  await requireTeam("edit");
  const id = String(formData.get("id") ?? "");
  const hours = optionalNumber(formData.get("hours"));
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!id) redirect("/team/attendance?error=validation");

  await db.attendance.update({
    where: { id },
    data: { hours, notes },
  });
  revalidatePath("/team/attendance");
  redirect("/team/attendance?saved=1");
}

export async function deleteAttendance(formData: FormData) {
  await requireTeam("edit");
  const id = String(formData.get("id") ?? "");
  await db.attendance.deleteMany({ where: { id } });
  revalidatePath("/team/attendance");
  redirect("/team/attendance?deleted=1");
}

export async function checkIn(formData: FormData) {
  const session = await requireTeam("edit");
  const employeeId = String(formData.get("employeeId") ?? "");
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const existing = await db.attendance.findUnique({
    where: { employeeId_date: { employeeId, date: dayStart } },
  });
  if (existing?.checkInAt) {
    redirect(`/team/attendance?error=already-checked-in`);
  }

  await db.attendance.upsert({
    where: { employeeId_date: { employeeId, date: dayStart } },
    create: { employeeId, date: dayStart, checkInAt: now, createdById: session.user.id },
    update: { checkInAt: now },
  });
  revalidatePath("/team/attendance");
  redirect("/team/attendance?checked-in=1");
}

export async function checkOut(formData: FormData) {
  const session = await requireTeam("edit");
  const id = String(formData.get("id") ?? "");
  const now = new Date();

  const entry = await db.attendance.findUnique({ where: { id } });
  if (!entry) redirect("/team/attendance?error=entry");

  const hours = entry.checkInAt
    ? Math.round(((now.getTime() - entry.checkInAt.getTime()) / 3600000) * 100) / 100
    : null;

  await db.attendance.update({
    where: { id },
    data: { checkOutAt: now, hours: hours ?? entry.hours },
  });
  await recordActivity(session.user.id, "ATTENDANCE", id, "CHECKED_OUT", { employeeId: entry.employeeId });
  revalidatePath("/team/attendance");
  redirect("/team/attendance?checked-out=1");
}
