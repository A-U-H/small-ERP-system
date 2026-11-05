"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import { computeInvoiceTotals, invoiceBalance } from "@/lib/finance-helpers";

const now = new Date();

async function requireFinance(access: "view" | "edit") {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  if (!hasAccess(role, "finance", access)) redirect("/finance?error=no-access");
  return session;
}

async function nextInvoiceNumber() {
  const settings = await db.companySettings.findUnique({ where: { id: 1 } });
  const prefix = settings?.invoiceNumberPrefix ?? "INV-";
  const next = settings?.invoiceNextNumber ?? 1;
  const number = `${prefix}${String(next).padStart(4, "0")}`;
  await db.companySettings.update({
    where: { id: 1 },
    data: { invoiceNextNumber: { increment: 1 } },
  });
  return number;
}

async function defaultDueDate() {
  const settings = await db.companySettings.findUnique({ where: { id: 1 } });
  const days = settings?.defaultPaymentTermsDays ?? 30;
  const due = new Date();
  due.setDate(due.getDate() + days);
  return due;
}

function dateFromString(value: unknown, fallback: Date): Date {
  const s = String(value ?? "");
  if (!s) return fallback;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

const invoiceMetaSchema = z.object({
  companyId: z.string().min(1),
  projectId: z.string().optional(),
  contractId: z.string().optional(),
  milestoneId: z.string().optional(),
  terms: z.string().max(4000).optional(),
  notes: z.string().max(4000).optional(),
});

async function createInvoiceWithItems(
  meta: {
    companyId: string;
    projectId?: string;
    contractId?: string;
    milestoneId?: string;
    terms?: string;
    notes?: string;
  },
  items: { description: string; quantity: number; unitPrice: number }[],
  issueDate: Date,
  dueDate: Date,
) {
  const number = await nextInvoiceNumber();
  const settings = await db.companySettings.findUnique({ where: { id: 1 } });
  const taxRate = Number(settings?.vatRate ?? 0);
  const totals = computeInvoiceTotals(items, taxRate);

  const invoice = await db.invoice.create({
    data: {
      number,
      companyId: meta.companyId,
      projectId: meta.projectId ?? null,
      contractId: meta.contractId ?? null,
      milestoneId: meta.milestoneId ?? null,
      issueDate,
      dueDate,
      status: "DRAFT",
      subtotal: totals.subtotal,
      taxRate,
      taxAmount: totals.taxAmount,
      total: totals.total,
      terms: meta.terms || null,
      notes: meta.notes || null,
      items: {
        create: items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          amount: i.quantity * i.unitPrice,
        })),
      },
    },
  });

  revalidatePath("/finance/invoices");
  revalidatePath("/finance");
  return invoice;
}

// ─────────────────────────── Invoices ───────────────────────────

export async function createManualInvoice(formData: FormData) {
  await requireFinance("edit");
  const parsed = invoiceMetaSchema.safeParse({
    companyId: formData.get("companyId"),
    projectId: String(formData.get("projectId") ?? "") || undefined,
    contractId: String(formData.get("contractId") ?? "") || undefined,
    milestoneId: String(formData.get("milestoneId") ?? "") || undefined,
    terms: String(formData.get("terms") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
  });
  if (!parsed.success) redirect("/finance/invoices/new?error=validation");

  const itemsRaw = formData.get("items");
  let items: unknown = [];
  if (typeof itemsRaw === "string" && itemsRaw.trim() !== "") {
    try {
      items = JSON.parse(itemsRaw);
    } catch {
      redirect("/finance/invoices/new?error=items");
    }
  }
  const itemSchema = z.array(
    z.object({
      description: z.string().min(1),
      quantity: z.coerce.number().min(0),
      unitPrice: z.coerce.number().min(0),
    }),
  );
  const parsedItems = itemSchema.safeParse(items);
  if (!parsedItems.success || parsedItems.data.length === 0) {
    redirect("/finance/invoices/new?error=validation");
  }

  const invoice = await createInvoiceWithItems(
    parsed.data,
    parsedItems.data,
    dateFromString(formData.get("issueDate"), now),
    dateFromString(formData.get("dueDate"), await defaultDueDate()),
  );
  redirect(`/finance/invoices/${invoice.id}?created=1`);
}

export async function createMilestoneInvoice(formData: FormData) {
  await requireFinance("edit");
  const milestoneId = String(formData.get("milestoneId") ?? "");
  if (!milestoneId) redirect("/finance/invoices/new?error=validation");

  const milestone = await db.milestone.findUnique({
    where: { id: milestoneId },
    include: { project: { select: { id: true, companyId: true } } },
  });
  if (!milestone?.project || milestone.billingValue === null) {
    redirect("/finance/invoices/new?error=milestone");
  }

  const invoice = await createInvoiceWithItems(
    {
      companyId: milestone.project.companyId,
      projectId: milestone.project.id,
      milestoneId: milestone.id,
      terms: String(formData.get("terms") ?? "") || undefined,
      notes: String(formData.get("notes") ?? "") || undefined,
    },
    [{ description: milestone.name, quantity: 1, unitPrice: Number(milestone.billingValue) }],
    dateFromString(formData.get("issueDate"), now),
    dateFromString(formData.get("dueDate"), await defaultDueDate()),
  );
  redirect(`/finance/invoices/${invoice.id}?created=1`);
}

export async function createHoursInvoice(formData: FormData) {
  await requireFinance("edit");
  const projectId = String(formData.get("projectId") ?? "");
  const fromDate = String(formData.get("fromDate") ?? "");
  const toDate = String(formData.get("toDate") ?? "");
  const hourlyRate = Number(formData.get("hourlyRate") ?? 0);
  if (!projectId || !fromDate || !toDate || !(hourlyRate > 0)) {
    redirect("/finance/invoices/new?error=validation");
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, companyId: true },
  });
  if (!project) redirect("/finance/invoices/new?error=project");

  const start = new Date(fromDate);
  const end = new Date(toDate);
  end.setHours(23, 59, 59, 999);

  const entries = await db.timeEntry.findMany({
    where: {
      projectId,
      billable: true,
      date: { gte: start, lte: end },
    },
    select: { hours: true },
  });
  const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);
  if (totalHours <= 0) redirect("/finance/invoices/new?error=no-hours");

  const invoice = await createInvoiceWithItems(
    {
      companyId: project.companyId,
      projectId: project.id,
      terms: String(formData.get("terms") ?? "") || undefined,
      notes: String(formData.get("notes") ?? "") || undefined,
    },
    [
      {
        description: `Billable hours ${fromDate} to ${toDate}`,
        quantity: totalHours,
        unitPrice: hourlyRate,
      },
    ],
    dateFromString(formData.get("issueDate"), now),
    dateFromString(formData.get("dueDate"), await defaultDueDate()),
  );
  redirect(`/finance/invoices/${invoice.id}?created=1`);
}

export async function generateRetainerInvoices() {
  await requireFinance("edit");
  const settings = await db.companySettings.findUnique({ where: { id: 1 } });
  const days = settings?.defaultPaymentTermsDays ?? 30;
  const nowStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const contracts = await db.contract.findMany({
    where: { status: "ACTIVE", billingType: "RETAINER", archived: false },
    include: {
      invoices: { select: { id: true, issueDate: true } },
    },
  });

  let created = 0;
  for (const contract of contracts) {
    const alreadyBilledThisMonth = contract.invoices.some(
      (inv) => new Date(inv.issueDate) >= nowStart,
    );
    if (alreadyBilledThisMonth) continue;

    const number = await nextInvoiceNumber();
    const due = new Date();
    due.setDate(due.getDate() + days);
    const month = new Date().toLocaleString("en-GB", { month: "long", year: "numeric" });

    await db.invoice.create({
      data: {
        number,
        companyId: contract.companyId,
        contractId: contract.id,
        issueDate: now,
        dueDate: due,
        status: "DRAFT",
        subtotal: Number(contract.value),
        taxRate: Number(settings?.vatRate ?? 0),
        taxAmount: (Number(contract.value) * Number(settings?.vatRate ?? 0)) / 100,
        total: Number(contract.value) * (1 + Number(settings?.vatRate ?? 0) / 100),
        items: {
          create: [
            {
              description: `Monthly retainer — ${month}`,
              quantity: 1,
              unitPrice: Number(contract.value),
              amount: Number(contract.value),
            },
          ],
        },
      },
    });
    created += 1;
  }

  revalidatePath("/finance/invoices");
  revalidatePath("/finance");
  redirect(`/finance/invoices?retainer=${created}`);
}

export async function updateInvoiceStatus(formData: FormData) {
  await requireFinance("edit");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const statuses = ["DRAFT", "SENT", "CANCELLED"];
  if (!id || !statuses.includes(status)) redirect(`/finance/invoices/${id}?error=status`);

  await db.invoice.update({ where: { id }, data: { status: status as never } });
  revalidatePath(`/finance/invoices/${id}`);
  revalidatePath("/finance/invoices");
  revalidatePath("/finance");
  redirect(`/finance/invoices/${id}?status=1`);
}

export async function archiveInvoice(formData: FormData) {
  await requireFinance("edit");
  const id = String(formData.get("id") ?? "");
  await db.invoice.updateMany({ where: { id }, data: { archived: true } });
  revalidatePath("/finance/invoices");
  redirect("/finance/invoices?archived=1");
}

// ─────────────────────────── Payments ───────────────────────────

async function refreshInvoiceStatus(invoiceId: string) {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  if (!invoice) return;
  const balance = invoiceBalance(invoice);
  const nextStatus =
    balance <= 0 ? "PAID" : invoice.payments.length > 0 ? "PARTIAL" : "SENT";
  if (invoice.status !== "DRAFT" && invoice.status !== "CANCELLED") {
    await db.invoice.update({ where: { id: invoiceId }, data: { status: nextStatus as never } });
  }
}

const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.coerce.number().positive(),
  date: z.string().optional(),
  method: z.enum(["BANK_TRANSFER", "CASH", "CARD", "CHEQUE"]),
  reference: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export async function recordPayment(formData: FormData) {
  await requireFinance("edit");
  const parsed = paymentSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    amount: formData.get("amount"),
    date: String(formData.get("date") ?? "") || undefined,
    method: formData.get("method") || "BANK_TRANSFER",
    reference: String(formData.get("reference") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
  });
  const invoiceIdRaw = String(formData.get("invoiceId") ?? "");
  if (!parsed.success) redirect(`/finance/invoices/${invoiceIdRaw}?error=payment`);

  await db.payment.create({
    data: {
      invoiceId: parsed.data.invoiceId,
      amount: parsed.data.amount,
      date: dateFromString(parsed.data.date, now),
      method: parsed.data.method,
      reference: parsed.data.reference || null,
      notes: parsed.data.notes || null,
    },
  });
  await refreshInvoiceStatus(parsed.data.invoiceId);

  revalidatePath(`/finance/invoices/${parsed.data.invoiceId}`);
  revalidatePath("/finance/invoices");
  revalidatePath("/finance");
  redirect(`/finance/invoices/${parsed.data.invoiceId}?paid=1`);
}

export async function deletePayment(formData: FormData) {
  await requireFinance("edit");
  const id = String(formData.get("id") ?? "");
  const invoiceId = String(formData.get("invoiceId") ?? "");
  await db.payment.delete({ where: { id } });
  if (invoiceId) await refreshInvoiceStatus(invoiceId);
  revalidatePath(`/finance/invoices/${invoiceId}`);
  revalidatePath("/finance");
  redirect(`/finance/invoices/${invoiceId}?payment-deleted=1`);
}

// ─────────────────────────── Expenses ───────────────────────────

const expenseSchema = z.object({
  description: z.string().min(1).max(2000),
  categoryId: z.string().min(1),
  amount: z.coerce.number().positive(),
  date: z.string().optional(),
  paidBy: z.enum(["COMPANY", "EMPLOYEE"]),
  reimbursable: z.boolean().optional(),
  projectId: z.string().optional(),
  companyId: z.string().optional(),
});

export async function createExpense(formData: FormData) {
  await requireFinance("edit");
  const parsed = expenseSchema.safeParse({
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    date: String(formData.get("date") ?? "") || undefined,
    paidBy: formData.get("paidBy") || "COMPANY",
    reimbursable: formData.get("reimbursable") === "on",
    projectId: String(formData.get("projectId") ?? "") || undefined,
    companyId: String(formData.get("companyId") ?? "") || undefined,
  });
  if (!parsed.success) redirect("/finance/expenses?error=validation");

  await db.expense.create({
    data: {
      description: parsed.data.description,
      categoryId: parsed.data.categoryId,
      amount: parsed.data.amount,
      date: dateFromString(parsed.data.date, now),
      paidBy: parsed.data.paidBy,
      reimbursable: parsed.data.reimbursable ?? false,
      projectId: parsed.data.projectId ?? null,
      companyId: parsed.data.companyId ?? null,
    },
  });
  revalidatePath("/finance/expenses");
  revalidatePath("/finance");
  redirect("/finance/expenses?created=1");
}

export async function updateExpense(formData: FormData) {
  await requireFinance("edit");
  const id = String(formData.get("id") ?? "");
  const parsed = expenseSchema.safeParse({
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    date: String(formData.get("date") ?? "") || undefined,
    paidBy: formData.get("paidBy") || "COMPANY",
    reimbursable: formData.get("reimbursable") === "on",
    projectId: String(formData.get("projectId") ?? "") || undefined,
    companyId: String(formData.get("companyId") ?? "") || undefined,
  });
  if (!parsed.success) redirect(`/finance/expenses?error=validation`);

  await db.expense.update({
    where: { id },
    data: {
      description: parsed.data.description,
      categoryId: parsed.data.categoryId,
      amount: parsed.data.amount,
      date: dateFromString(parsed.data.date, now),
      paidBy: parsed.data.paidBy,
      reimbursable: parsed.data.reimbursable ?? false,
      projectId: parsed.data.projectId ?? null,
      companyId: parsed.data.companyId ?? null,
    },
  });
  revalidatePath("/finance/expenses");
  revalidatePath("/finance");
  redirect("/finance/expenses?updated=1");
}

export async function deleteExpense(formData: FormData) {
  await requireFinance("edit");
  const id = String(formData.get("id") ?? "");
  await db.expense.delete({ where: { id } });
  revalidatePath("/finance/expenses");
  revalidatePath("/finance");
  redirect("/finance/expenses?deleted=1");
}
