"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

async function requireCrm(level: "view" | "edit" = "view") {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  if (!hasAccess(role, "crm", level)) redirect("/");
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

// ─────────────────────────── Leads ───────────────────────────

const leadSchema = z.object({
  name: z.string().min(1).max(150),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  source: z.string().max(100).optional(),
  companyName: z.string().max(150).optional(),
  expectedValue: z.coerce.number().min(0).optional(),
  ownerId: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export async function createLead(formData: FormData) {
  const session = await requireCrm("edit");
  const sourceRaw = String(formData.get("source") ?? "");
  const source =
    sourceRaw === "OTHER" ? String(formData.get("sourceText") ?? "").trim() : sourceRaw;
  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    source: source || undefined,
    companyName: formData.get("companyName") || undefined,
    expectedValue: optionalNumber(formData.get("expectedValue")) ?? undefined,
    ownerId: emptyToNull(formData.get("ownerId")) ?? undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) redirect("/crm/leads/new?error=validation");

  const lead = await db.lead.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      source: parsed.data.source || null,
      companyName: parsed.data.companyName || null,
      expectedValue: parsed.data.expectedValue ?? null,
      ownerId: parsed.data.ownerId ?? null,
      notes: parsed.data.notes || null,
    },
  });

  await recordActivity(session.user.id, "LEAD", lead.id, "CREATED", { name: lead.name });
  revalidatePath("/crm/leads");
  redirect(`/crm/leads/${lead.id}?created=1`);
}

export async function updateLead(formData: FormData) {
  const session = await requireCrm("edit");
  const id = String(formData.get("id") ?? "");
  const sourceRaw = String(formData.get("source") ?? "");
  const source =
    sourceRaw === "OTHER" ? String(formData.get("sourceText") ?? "").trim() : sourceRaw;
  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    source: source || undefined,
    companyName: formData.get("companyName") || undefined,
    expectedValue: optionalNumber(formData.get("expectedValue")) ?? undefined,
    ownerId: emptyToNull(formData.get("ownerId")) ?? undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success || !id) redirect(`/crm/leads/${id}?error=validation`);

  await db.lead.update({
    where: { id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      source: parsed.data.source || null,
      companyName: parsed.data.companyName || null,
      expectedValue: parsed.data.expectedValue ?? null,
      ownerId: parsed.data.ownerId ?? null,
      notes: parsed.data.notes || null,
    },
  });

  await recordActivity(session.user.id, "LEAD", id, "UPDATED");
  revalidatePath(`/crm/leads/${id}`);
  redirect(`/crm/leads/${id}?saved=1`);
}

export async function updateLeadStatus(formData: FormData) {
  const session = await requireCrm("edit");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  const statuses = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "CONVERTED", "LOST", "UNQUALIFIED"];
  if (!id || !statuses.includes(status)) redirect("/crm/leads?error=status");

  await db.lead.update({ where: { id }, data: { status: status as never } });
  await recordActivity(session.user.id, "LEAD", id, "STATUS_CHANGED", { status });
  revalidatePath(`/crm/leads/${id}`);
  revalidatePath("/crm/leads");
  redirect(`/crm/leads/${id}?status=1`);
}

export async function archiveLead(formData: FormData) {
  await requireCrm("edit");
  const id = String(formData.get("id") ?? "");
  await db.lead.updateMany({ where: { id }, data: { archived: true } });
  revalidatePath("/crm/leads");
  redirect("/crm/leads?archived=1");
}

export async function convertLead(formData: FormData) {
  const session = await requireCrm("edit");
  const id = String(formData.get("id") ?? "");
  const mode = String(formData.get("mode") ?? "new");
  const existingCompanyId = String(formData.get("companyId") ?? "");

  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) redirect("/crm/leads?error=lead");

  let companyId = existingCompanyId;
  if (mode === "new" || !companyId) {
    const companyName = String(formData.get("companyName") ?? "").trim() || lead.companyName || `${lead.name}'s company`;
    const company = await db.company.create({
      data: { name: companyName, email: lead.email, phone: lead.phone, ownerId: lead.ownerId },
    });
    companyId = company.id;
  }

  const contact = await db.contact.create({
    data: {
      companyId,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      ownerId: lead.ownerId,
      isPrimary: true,
    },
  });

  await db.lead.update({ where: { id }, data: { status: "CONVERTED" as never } });
  await recordActivity(session.user.id, "LEAD", id, "CONVERTED", { companyId, contactId: contact.id });
  revalidatePath("/crm/leads");
  redirect(`/crm/companies/${companyId}?converted=1`);
}

// ─────────────────────────── Companies ───────────────────────────

const companySchema = z.object({
  name: z.string().min(1).max(150),
  industry: z.string().max(100).optional(),
  size: z.string().max(50).optional(),
  website: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  vatId: z.string().max(50).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "LEAD", "POTENTIAL"]),
  ownerId: z.string().optional(),
  notes: z.string().max(3000).optional(),
});

export async function createCompany(formData: FormData) {
  const session = await requireCrm("edit");
  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    industry: formData.get("industry") || undefined,
    size: formData.get("size") || undefined,
    website: formData.get("website") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    address: formData.get("address") || undefined,
    vatId: formData.get("vatId") || undefined,
    status: formData.get("status") || "ACTIVE",
    ownerId: emptyToNull(formData.get("ownerId")) ?? undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) redirect("/crm/companies/new?error=validation");

  const company = await db.company.create({
    data: {
      ...parsed.data,
      ownerId: parsed.data.ownerId ?? null,
      email: parsed.data.email || null,
    },
  });

  await recordActivity(session.user.id, "COMPANY", company.id, "CREATED", { name: company.name });
  revalidatePath("/crm/companies");
  redirect(`/crm/companies/${company.id}?created=1`);
}

export async function updateCompany(formData: FormData) {
  const session = await requireCrm("edit");
  const id = String(formData.get("id") ?? "");
  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    industry: formData.get("industry") || undefined,
    size: formData.get("size") || undefined,
    website: formData.get("website") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    address: formData.get("address") || undefined,
    vatId: formData.get("vatId") || undefined,
    status: formData.get("status") || "ACTIVE",
    ownerId: emptyToNull(formData.get("ownerId")) ?? undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success || !id) redirect(`/crm/companies/${id}?error=validation`);

  await db.company.update({
    where: { id },
    data: { ...parsed.data, ownerId: parsed.data.ownerId ?? null, email: parsed.data.email || null },
  });

  await recordActivity(session.user.id, "COMPANY", id, "UPDATED");
  revalidatePath(`/crm/companies/${id}`);
  redirect(`/crm/companies/${id}?saved=1`);
}

export async function archiveCompany(formData: FormData) {
  const session = await requireCrm("edit");
  const id = String(formData.get("id") ?? "");
  await db.company.updateMany({ where: { id }, data: { archived: true } });
  await recordActivity(session.user.id, "COMPANY", id, "ARCHIVED");
  revalidatePath("/crm/companies");
  redirect("/crm/companies?archived=1");
}

// ─────────────────────────── Contacts ───────────────────────────

const contactSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1).max(150),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  position: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  isPrimary: z.string().optional(),
  ownerId: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export async function createContact(formData: FormData) {
  const session = await requireCrm("edit");
  const parsed = contactSchema.safeParse({
    companyId: formData.get("companyId"),
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    position: formData.get("position") || undefined,
    department: formData.get("department") || undefined,
    isPrimary: formData.get("isPrimary"),
    ownerId: emptyToNull(formData.get("ownerId")) ?? undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) redirect("/crm/contacts/new?error=validation");

  const data = parsed.data;
  const isPrimary = data.isPrimary === "on";

  if (isPrimary) {
    await db.contact.updateMany({ where: { companyId: data.companyId }, data: { isPrimary: false } });
  }

  const contact = await db.contact.create({
    data: {
      companyId: data.companyId,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      position: data.position || null,
      department: data.department || null,
      isPrimary,
      ownerId: data.ownerId ?? null,
      notes: data.notes || null,
    },
  });

  await recordActivity(session.user.id, "CONTACT", contact.id, "CREATED", { name: contact.name });
  revalidatePath("/crm/contacts");
  redirect(`/crm/companies/${data.companyId}?created=1`);
}

export async function updateContact(formData: FormData) {
  const session = await requireCrm("edit");
  const id = String(formData.get("id") ?? "");
  const parsed = contactSchema.safeParse({
    companyId: formData.get("companyId"),
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    position: formData.get("position") || undefined,
    department: formData.get("department") || undefined,
    isPrimary: formData.get("isPrimary"),
    ownerId: emptyToNull(formData.get("ownerId")) ?? undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success || !id) redirect(`/crm/companies/${parsed.data?.companyId ?? ""}?error=validation`);

  const data = parsed.data;
  const isPrimary = data.isPrimary === "on";

  if (isPrimary) {
    await db.contact.updateMany({ where: { companyId: data.companyId }, data: { isPrimary: false } });
  }

  await db.contact.update({
    where: { id },
    data: {
      companyId: data.companyId,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      position: data.position || null,
      department: data.department || null,
      isPrimary,
      ownerId: data.ownerId ?? null,
      notes: data.notes || null,
    },
  });

  await recordActivity(session.user.id, "CONTACT", id, "UPDATED");
  revalidatePath(`/crm/companies/${data.companyId}`);
  redirect(`/crm/companies/${data.companyId}?saved=1`);
}

export async function archiveContact(formData: FormData) {
  await requireCrm("edit");
  const id = String(formData.get("id") ?? "");
  await db.contact.updateMany({ where: { id }, data: { archived: true } });
  revalidatePath("/crm/contacts");
  redirect("/crm/contacts?archived=1");
}

// ─────────────────────────── Deals ───────────────────────────

const dealSchema = z.object({
  name: z.string().min(1).max(150),
  companyId: z.string().min(1),
  contactId: z.string().optional(),
  value: z.coerce.number().min(0).optional(),
  expectedCloseDate: z.string().optional(),
  probability: z.coerce.number().int().min(0).max(100),
  stage: z.enum(["LEAD", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"]),
  ownerId: z.string().optional(),
  notes: z.string().max(3000).optional(),
});

export async function createDeal(formData: FormData) {
  const session = await requireCrm("edit");
  const parsed = dealSchema.safeParse({
    name: formData.get("name"),
    companyId: formData.get("companyId"),
    contactId: emptyToNull(formData.get("contactId")) ?? undefined,
    value: optionalNumber(formData.get("value")) ?? undefined,
    expectedCloseDate: emptyToNull(formData.get("expectedCloseDate")) ?? undefined,
    probability: formData.get("probability") || "50",
    stage: formData.get("stage") || "LEAD",
    ownerId: emptyToNull(formData.get("ownerId")) ?? undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) redirect("/crm/deals/new?error=validation");

  const deal = await db.deal.create({
    data: {
      name: parsed.data.name,
      companyId: parsed.data.companyId,
      contactId: parsed.data.contactId ?? null,
      value: parsed.data.value ?? null,
      expectedCloseDate: parsed.data.expectedCloseDate ? new Date(parsed.data.expectedCloseDate) : null,
      probability: parsed.data.probability,
      stage: parsed.data.stage,
      ownerId: parsed.data.ownerId ?? null,
      notes: parsed.data.notes || null,
    },
  });

  await recordActivity(session.user.id, "DEAL", deal.id, "CREATED", { name: deal.name });
  revalidatePath("/crm/deals");
  redirect(`/crm/deals/${deal.id}?created=1`);
}

export async function updateDeal(formData: FormData) {
  const session = await requireCrm("edit");
  const id = String(formData.get("id") ?? "");
  const parsed = dealSchema.safeParse({
    name: formData.get("name"),
    companyId: formData.get("companyId"),
    contactId: emptyToNull(formData.get("contactId")) ?? undefined,
    value: optionalNumber(formData.get("value")) ?? undefined,
    expectedCloseDate: emptyToNull(formData.get("expectedCloseDate")) ?? undefined,
    probability: formData.get("probability") || "50",
    stage: formData.get("stage") || "LEAD",
    ownerId: emptyToNull(formData.get("ownerId")) ?? undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success || !id) redirect(`/crm/deals/${id}?error=validation`);

  await db.deal.update({
    where: { id },
    data: {
      name: parsed.data.name,
      companyId: parsed.data.companyId,
      contactId: parsed.data.contactId ?? null,
      value: parsed.data.value ?? null,
      expectedCloseDate: parsed.data.expectedCloseDate ? new Date(parsed.data.expectedCloseDate) : null,
      probability: parsed.data.probability,
      stage: parsed.data.stage,
      ownerId: parsed.data.ownerId ?? null,
      notes: parsed.data.notes || null,
    },
  });

  await recordActivity(session.user.id, "DEAL", id, "UPDATED");
  revalidatePath(`/crm/deals/${id}`);
  revalidatePath("/crm/deals");
  redirect(`/crm/deals/${id}?saved=1`);
}

export async function updateDealStage(formData: FormData) {
  const session = await requireCrm("edit");
  const id = String(formData.get("id") ?? "");
  const stage = String(formData.get("stage") ?? "");

  const stages = ["LEAD", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"];
  if (!id || !stages.includes(stage)) redirect("/crm/deals?error=stage");

  await db.deal.update({ where: { id }, data: { stage: stage as never } });
  await recordActivity(session.user.id, "DEAL", id, "STAGE_CHANGED", { stage });
  revalidatePath("/crm/deals");
  redirect("/crm/deals?moved=1");
}

export async function archiveDeal(formData: FormData) {
  await requireCrm("edit");
  const id = String(formData.get("id") ?? "");
  await db.deal.updateMany({ where: { id }, data: { archived: true } });
  revalidatePath("/crm/deals");
  redirect("/crm/deals?archived=1");
}

// ─────────────────────────── Proposals ───────────────────────────

const proposalSchema = z.object({
  companyId: z.string().min(1),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  validUntil: z.string().optional(),
  terms: z.string().max(4000).optional(),
  recipientEmail: z.string().email().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"]),
  items: z.array(
    z.object({
      description: z.string().min(1),
      quantity: z.coerce.number().min(0),
      unitPrice: z.coerce.number().min(0),
    }),
  ),
});

async function nextNumber(kind: "proposal" | "contract") {
  const settings = await db.companySettings.findUnique({ where: { id: 1 } });
  const prefix =
    kind === "proposal"
      ? settings?.proposalNumberPrefix ?? "QUO-"
      : settings?.contractNumberPrefix ?? "CTR-";
  const next =
    kind === "proposal"
      ? settings?.proposalNextNumber ?? 1
      : settings?.contractNextNumber ?? 1;
  const number = `${prefix}${String(next).padStart(4, "0")}`;
  await db.companySettings.update({
    where: { id: 1 },
    data:
      kind === "proposal"
        ? { proposalNextNumber: { increment: 1 } }
        : { contractNextNumber: { increment: 1 } },
  });
  return number;
}

export async function createProposal(formData: FormData) {
  const session = await requireCrm("edit");

  const itemsRaw = formData.get("items");
  let items: unknown = [];
  if (typeof itemsRaw === "string" && itemsRaw.trim() !== "") {
    try {
      items = JSON.parse(itemsRaw);
    } catch {
      redirect("/crm/proposals/new?error=items");
    }
  }

  const parsed = proposalSchema.safeParse({
    companyId: formData.get("companyId"),
    contactId: emptyToNull(formData.get("contactId")) ?? undefined,
    dealId: emptyToNull(formData.get("dealId")) ?? undefined,
    validUntil: emptyToNull(formData.get("validUntil")) ?? undefined,
    terms: formData.get("terms") || undefined,
    recipientEmail: formData.get("recipientEmail") || undefined,
    status: formData.get("status") || "DRAFT",
    items,
  });
  if (!parsed.success || parsed.data.items.length === 0) {
    redirect("/crm/proposals/new?error=validation");
  }

  const number = await nextNumber("proposal");
  const total = parsed.data.items.reduce(
    (sum, i) => sum + i.quantity * i.unitPrice,
    0,
  );

  const proposal = await db.proposal.create({
    data: {
      number,
      companyId: parsed.data.companyId,
      contactId: parsed.data.contactId ?? null,
      dealId: parsed.data.dealId ?? null,
      status: parsed.data.status,
      validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
      terms: parsed.data.terms || null,
      recipientEmail: parsed.data.recipientEmail || null,
      total,
      items: {
        create: parsed.data.items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          amount: i.quantity * i.unitPrice,
        })),
      },
    },
  });

  await recordActivity(session.user.id, "PROPOSAL", proposal.id, "CREATED", { number });
  revalidatePath("/crm/proposals");
  redirect(`/crm/proposals/${proposal.id}?created=1`);
}

export async function updateProposalStatus(formData: FormData) {
  const session = await requireCrm("edit");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  const statuses = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"];
  if (!id || !statuses.includes(status)) redirect(`/crm/proposals/${id}?error=status`);

  await db.proposal.update({ where: { id }, data: { status: status as never } });
  await recordActivity(session.user.id, "PROPOSAL", id, "STATUS_CHANGED", { status });
  revalidatePath(`/crm/proposals/${id}`);
  revalidatePath("/crm/proposals");
  redirect(`/crm/proposals/${id}?status=1`);
}

export async function archiveProposal(formData: FormData) {
  await requireCrm("edit");
  const id = String(formData.get("id") ?? "");
  await db.proposal.updateMany({ where: { id }, data: { archived: true } });
  revalidatePath("/crm/proposals");
  redirect("/crm/proposals?archived=1");
}

export async function createContractFromProposal(formData: FormData) {
  const session = await requireCrm("edit");
  const proposalId = String(formData.get("proposalId") ?? "");

  const proposal = await db.proposal.findUnique({
    where: { id: proposalId },
    include: { company: true },
  });
  if (!proposal) redirect("/crm/proposals?error=proposal");
  if (proposal.status !== "ACCEPTED") redirect(`/crm/proposals/${proposalId}?error=not-accepted`);

  const number = await nextNumber("contract");
  const contract = await db.contract.create({
    data: {
      number,
      proposalId: proposal.id,
      companyId: proposal.companyId,
      startDate: new Date(),
      endDate: proposal.validUntil ?? null,
      value: proposal.total,
      status: "DRAFT",
      billingType: "FIXED",
      terms: proposal.terms,
    },
  });

  await recordActivity(session.user.id, "CONTRACT", contract.id, "CREATED", { number, fromProposal: proposal.number });
  revalidatePath("/crm/contracts");
  redirect(`/crm/contracts/${contract.id}?created=1`);
}

// ─────────────────────────── Contracts ───────────────────────────

const contractSchema = z.object({
  companyId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  value: z.coerce.number().min(0),
  billingType: z.enum(["FIXED", "HOURLY", "RETAINER"]),
  status: z.enum(["DRAFT", "SENT", "SIGNED", "ACTIVE", "COMPLETED", "TERMINATED"]),
  terms: z.string().max(4000).optional(),
  notes: z.string().max(3000).optional(),
});

export async function createContract(formData: FormData) {
  const session = await requireCrm("edit");
  const parsed = contractSchema.safeParse({
    companyId: formData.get("companyId"),
    startDate: formData.get("startDate"),
    endDate: emptyToNull(formData.get("endDate")) ?? undefined,
    value: optionalNumber(formData.get("value")) ?? 0,
    billingType: formData.get("billingType") || "FIXED",
    status: formData.get("status") || "DRAFT",
    terms: formData.get("terms") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) redirect("/crm/contracts/new?error=validation");

  const number = await nextNumber("contract");
  const contract = await db.contract.create({
    data: {
      number,
      companyId: parsed.data.companyId,
      startDate: new Date(parsed.data.startDate),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      value: parsed.data.value,
      billingType: parsed.data.billingType,
      status: parsed.data.status,
      terms: parsed.data.terms || null,
      notes: parsed.data.notes || null,
    },
  });

  await recordActivity(session.user.id, "CONTRACT", contract.id, "CREATED", { number });
  revalidatePath("/crm/contracts");
  redirect(`/crm/contracts/${contract.id}?created=1`);
}

export async function updateContract(formData: FormData) {
  const session = await requireCrm("edit");
  const id = String(formData.get("id") ?? "");
  const parsed = contractSchema.safeParse({
    companyId: formData.get("companyId"),
    startDate: formData.get("startDate"),
    endDate: emptyToNull(formData.get("endDate")) ?? undefined,
    value: optionalNumber(formData.get("value")) ?? 0,
    billingType: formData.get("billingType") || "FIXED",
    status: formData.get("status") || "DRAFT",
    terms: formData.get("terms") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success || !id) redirect(`/crm/contracts/${id}?error=validation`);

  await db.contract.update({
    where: { id },
    data: {
      companyId: parsed.data.companyId,
      startDate: new Date(parsed.data.startDate),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      value: parsed.data.value,
      billingType: parsed.data.billingType,
      status: parsed.data.status,
      terms: parsed.data.terms || null,
      notes: parsed.data.notes || null,
    },
  });

  await recordActivity(session.user.id, "CONTRACT", id, "UPDATED");
  revalidatePath(`/crm/contracts/${id}`);
  redirect(`/crm/contracts/${id}?saved=1`);
}

export async function archiveContract(formData: FormData) {
  await requireCrm("edit");
  const id = String(formData.get("id") ?? "");
  await db.contract.updateMany({ where: { id }, data: { archived: true } });
  revalidatePath("/crm/contracts");
  redirect("/crm/contracts?archived=1");
}

export async function createProjectFromContract(formData: FormData) {
  const session = await requireCrm("edit");
  const contractId = String(formData.get("contractId") ?? "");

  const contract = await db.contract.findUnique({
    where: { id: contractId },
    include: { company: true },
  });
  if (!contract) redirect("/crm/contracts?error=contract");

  const project = await db.project.create({
    data: {
      name: `${contract.company.name} — ${contract.number}`,
      companyId: contract.companyId,
      contractId: contract.id,
      startDate: contract.startDate,
      endDate: contract.endDate,
      budget: contract.value,
      status: "PLANNED",
    },
  });

  await recordActivity(session.user.id, "PROJECT", project.id, "CREATED", { fromContract: contract.number });
  revalidatePath("/projects");
  redirect(`/projects/${project.id}?created=1`);
}

// ─────────────────────────── Follow-ups ───────────────────────────

const followUpSchema = z.object({
  companyId: z.string().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  dueDate: z.string().min(1),
  type: z.enum(["CALL", "EMAIL", "WHATSAPP", "MEETING"]),
  notes: z.string().max(2000).optional(),
  ownerId: z.string().optional(),
});

export async function createFollowUp(formData: FormData) {
  const session = await requireCrm("edit");
  const parsed = followUpSchema.safeParse({
    companyId: emptyToNull(formData.get("companyId")) ?? undefined,
    contactId: emptyToNull(formData.get("contactId")) ?? undefined,
    dealId: emptyToNull(formData.get("dealId")) ?? undefined,
    dueDate: formData.get("dueDate"),
    type: formData.get("type") || "CALL",
    notes: formData.get("notes") || undefined,
    ownerId: emptyToNull(formData.get("ownerId")) ?? undefined,
  });
  if (!parsed.success) redirect("/crm/followups?error=validation");

  const followUp = await db.followUp.create({
    data: {
      companyId: parsed.data.companyId ?? null,
      contactId: parsed.data.contactId ?? null,
      dealId: parsed.data.dealId ?? null,
      dueDate: new Date(parsed.data.dueDate),
      type: parsed.data.type,
      notes: parsed.data.notes || null,
      ownerId: parsed.data.ownerId ?? null,
    },
  });

  await recordActivity(session.user.id, "FOLLOW_UP", followUp.id, "CREATED");
  revalidatePath("/crm/followups");
  redirect("/crm/followups?created=1");
}

export async function completeFollowUp(formData: FormData) {
  const session = await requireCrm("edit");
  const id = String(formData.get("id") ?? "");
  await db.followUp.update({ where: { id }, data: { status: "DONE" as never } });
  await recordActivity(session.user.id, "FOLLOW_UP", id, "COMPLETED");
  revalidatePath("/crm/followups");
  redirect("/crm/followups?done=1");
}

// ─────────────────────────── Meeting Notes ───────────────────────────

const meetingSchema = z.object({
  title: z.string().min(1).max(150),
  date: z.string().min(1),
  companyId: z.string().optional(),
  dealId: z.string().optional(),
  notes: z.string().max(4000).optional(),
  summary: z.string().max(4000).optional(),
});

export async function createMeetingNote(formData: FormData) {
  const session = await requireCrm("edit");
  const parsed = meetingSchema.safeParse({
    title: formData.get("title"),
    date: formData.get("date"),
    companyId: emptyToNull(formData.get("companyId")) ?? undefined,
    dealId: emptyToNull(formData.get("dealId")) ?? undefined,
    notes: formData.get("notes") || undefined,
    summary: formData.get("summary") || undefined,
  });
  if (!parsed.success) redirect("/crm/meetings?error=validation");

  const meeting = await db.meetingNote.create({
    data: {
      title: parsed.data.title,
      date: new Date(parsed.data.date),
      companyId: parsed.data.companyId ?? null,
      dealId: parsed.data.dealId ?? null,
      notes: parsed.data.notes || null,
      summary: parsed.data.summary || null,
    },
  });

  await recordActivity(session.user.id, "MEETING", meeting.id, "CREATED", { title: meeting.title });
  revalidatePath("/crm/meetings");
  redirect("/crm/meetings?created=1");
}
