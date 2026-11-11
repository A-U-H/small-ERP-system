"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasAccess, MODULES, type Access } from "@/lib/permissions";

async function requireSettingsEdit() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  if (!hasAccess(role, "settings", "edit")) redirect("/");
  return session;
}

// ─────────────────────────── Company Settings ───────────────────────────

const companySettingsSchema = z.object({
  companyName: z.string().min(1),
  logoUrl: z.string().url().optional().or(z.literal("")),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  vatNumber: z.string().optional(),
  currency: z.string().length(3),
  vatRate: z.coerce.number().min(0).max(100),
  defaultPaymentTermsDays: z.coerce.number().int().min(0).max(365),
  invoiceNumberPrefix: z.string().min(1),
  invoiceNextNumber: z.coerce.number().int().min(1),
  proposalNumberPrefix: z.string().min(1),
  proposalNextNumber: z.coerce.number().int().min(1),
  contractNumberPrefix: z.string().min(1),
  contractNextNumber: z.coerce.number().int().min(1),
  defaultWeeklyHours: z.coerce.number().int().min(1).max(168),
});

export async function updateCompanySettings(formData: FormData) {
  await requireSettingsEdit();

  const parsed = companySettingsSchema.safeParse({
    companyName: formData.get("companyName"),
    logoUrl: formData.get("logoUrl") || undefined,
    address: formData.get("address") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    vatNumber: formData.get("vatNumber") || undefined,
    currency: formData.get("currency"),
    vatRate: formData.get("vatRate"),
    defaultPaymentTermsDays: formData.get("defaultPaymentTermsDays"),
    invoiceNumberPrefix: formData.get("invoiceNumberPrefix"),
    invoiceNextNumber: formData.get("invoiceNextNumber"),
    proposalNumberPrefix: formData.get("proposalNumberPrefix"),
    proposalNextNumber: formData.get("proposalNextNumber"),
    contractNumberPrefix: formData.get("contractNumberPrefix"),
    contractNextNumber: formData.get("contractNextNumber"),
    defaultWeeklyHours: formData.get("defaultWeeklyHours"),
  });

  if (!parsed.success) redirect("/settings/company?error=validation");

  const data = parsed.data;

  await db.companySettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      ...data,
      logoUrl: data.logoUrl || null,
      email: data.email || null,
    },
    update: {
      ...data,
      logoUrl: data.logoUrl || null,
      email: data.email || null,
    },
  });

  revalidatePath("/settings/company");
  redirect("/settings/company?saved=1");
}

// ─────────────────────────── Roles ───────────────────────────

const roleSchema = z.object({
  name: z.string().min(1).max(50),
  permissions: z.record(z.enum(MODULES), z.enum(["none", "view", "edit"])),
});

export async function createRole(formData: FormData) {
  await requireSettingsEdit();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/settings/roles?error=name");

  await db.role.create({
    data: {
      name,
      permissions: Object.fromEntries(MODULES.map((m) => [m, "view"])),
    },
  });

  revalidatePath("/settings/roles");
  redirect("/settings/roles?created=1");
}

export async function updateRole(formData: FormData) {
  await requireSettingsEdit();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  const permissions = {} as Record<string, Access>;
  for (const moduleName of MODULES) {
    const value = formData.get(`perm_${moduleName}`);
    permissions[moduleName] = value === "edit" ? "edit" : value === "view" ? "view" : "none";
  }

  const parsed = roleSchema.safeParse({ name, permissions });
  if (!parsed.success || !id) redirect("/settings/roles?error=validation");

  await db.role.update({
    where: { id },
    data: { name: parsed.data.name, permissions: parsed.data.permissions },
  });

  revalidatePath("/settings/roles");
  redirect("/settings/roles?saved=1");
}

export async function deleteRole(formData: FormData) {
  await requireSettingsEdit();
  const id = String(formData.get("id") ?? "");

  const role = await db.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
  if (!role || role.isDefault || role._count.users > 0) {
    redirect("/settings/roles?error=delete");
  }

  await db.role.delete({ where: { id } });
  revalidatePath("/settings/roles");
  redirect("/settings/roles?deleted=1");
}

// ─────────────────────────── Departments ───────────────────────────

const departmentSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().min(3).max(7),
});

export async function createDepartment(formData: FormData) {
  await requireSettingsEdit();
  const parsed = departmentSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
  });
  if (!parsed.success) redirect("/settings/departments?error=validation");

  await db.department.create({
    data: {
      name: parsed.data.name,
      color: parsed.data.color,
      headId: String(formData.get("headId") ?? "") || null,
    },
  });

  revalidatePath("/settings/departments");
  redirect("/settings/departments?created=1");
}

export async function updateDepartment(formData: FormData) {
  await requireSettingsEdit();
  const id = String(formData.get("id") ?? "");
  const parsed = departmentSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
  });
  if (!parsed.success || !id) redirect("/settings/departments?error=validation");

  await db.department.update({
    where: { id },
    data: {
      name: parsed.data.name,
      color: parsed.data.color,
      headId: String(formData.get("headId") ?? "") || null,
    },
  });

  revalidatePath("/settings/departments");
  redirect("/settings/departments?saved=1");
}

export async function deleteDepartment(formData: FormData) {
  await requireSettingsEdit();
  const id = String(formData.get("id") ?? "");
  await db.department.deleteMany({ where: { id, employees: { none: {} } } });
  revalidatePath("/settings/departments");
  redirect("/settings/departments?deleted=1");
}

// ─────────────────────────── Technologies ───────────────────────────

const technologySchema = z.object({
  name: z.string().min(1).max(50),
  category: z.string().optional(),
  color: z.string().min(3).max(7),
});

export async function createTechnology(formData: FormData) {
  await requireSettingsEdit();
  const parsed = technologySchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category") || undefined,
    color: formData.get("color"),
  });
  if (!parsed.success) redirect("/settings/technologies?error=validation");

  await db.technology.create({
    data: {
      name: parsed.data.name,
      category: parsed.data.category || null,
      color: parsed.data.color,
    },
  });

  revalidatePath("/settings/technologies");
  redirect("/settings/technologies?created=1");
}

export async function updateTechnology(formData: FormData) {
  await requireSettingsEdit();
  const id = String(formData.get("id") ?? "");
  const parsed = technologySchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category") || undefined,
    color: formData.get("color"),
  });
  if (!parsed.success || !id) redirect("/settings/technologies?error=validation");

  await db.technology.update({
    where: { id },
    data: {
      name: parsed.data.name,
      category: parsed.data.category || null,
      color: parsed.data.color,
    },
  });

  revalidatePath("/settings/technologies");
  redirect("/settings/technologies?saved=1");
}

export async function deleteTechnology(formData: FormData) {
  await requireSettingsEdit();
  const id = String(formData.get("id") ?? "");
  await db.technology.deleteMany({
    where: { id, skills: { none: {} }, tags: { none: {} } },
  });
  revalidatePath("/settings/technologies");
  redirect("/settings/technologies?deleted=1");
}

// ─────────────────────────── Tags ───────────────────────────

const TAG_TYPES = ["LEAD_SOURCE", "LEAD_STATUS", "DEAL_STAGE", "PROJECT_TYPE", "PROJECT_STATUS", "GENERAL"] as const;

const tagSchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(TAG_TYPES),
  color: z.string().min(3).max(7),
});

export async function createTag(formData: FormData) {
  await requireSettingsEdit();
  const parsed = tagSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    color: formData.get("color"),
  });
  if (!parsed.success) redirect("/settings/tags?error=validation");

  await db.tag.create({ data: parsed.data });
  revalidatePath("/settings/tags");
  redirect("/settings/tags?created=1");
}

export async function updateTag(formData: FormData) {
  await requireSettingsEdit();
  const id = String(formData.get("id") ?? "");
  const parsed = tagSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    color: formData.get("color"),
  });
  if (!parsed.success || !id) redirect("/settings/tags?error=validation");

  await db.tag.update({ where: { id }, data: parsed.data });
  revalidatePath("/settings/tags");
  redirect("/settings/tags?saved=1");
}

export async function deleteTag(formData: FormData) {
  await requireSettingsEdit();
  const id = String(formData.get("id") ?? "");
  await db.tag.deleteMany({
    where: { id, companies: { none: {} }, projects: { none: {} } },
  });
  revalidatePath("/settings/tags");
  redirect("/settings/tags?deleted=1");
}
