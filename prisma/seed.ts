import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "hello.au.haq@gmail.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Haq@2026!";

const ROLES: {
  name: string;
  permissions: Record<string, "none" | "view" | "edit">;
}[] = [
  {
    name: "Admin",
    permissions: {
      dashboard: "edit",
      crm: "edit",
      projects: "edit",
      team: "edit",
      finance: "edit",
      settings: "edit",
    },
  },
  {
    name: "Manager",
    permissions: {
      dashboard: "view",
      crm: "edit",
      projects: "edit",
      team: "edit",
      finance: "edit",
      settings: "view",
    },
  },
  {
    name: "Employee",
    permissions: {
      dashboard: "view",
      crm: "view",
      projects: "view",
      team: "view",
      finance: "view",
      settings: "none",
    },
  },
  {
    name: "Sales",
    permissions: {
      dashboard: "view",
      crm: "edit",
      projects: "view",
      team: "view",
      finance: "view",
      settings: "none",
    },
  },
  {
    name: "Viewer",
    permissions: {
      dashboard: "view",
      crm: "view",
      projects: "view",
      team: "view",
      finance: "view",
      settings: "none",
    },
  },
];

const EXPENSE_CATEGORIES = [
  "Travel",
  "Software",
  "Office supplies",
  "Subcontractors",
  "Marketing",
  "Utilities",
  "Meals",
  "Transport",
  "Other",
];

const NOTIFICATION_TYPES = [
  "task_assigned",
  "task_overdue",
  "deal_won",
  "proposal_accepted",
  "invoice_overdue",
  "contract_expiring",
  "followup_due",
  "new_lead",
  "attendance",
];

async function main() {
  const roleIds = new Map<string, string>();

  for (const role of ROLES) {
    const saved = await prisma.role.upsert({
      where: { name: role.name },
      update: {
        isDefault: true,
        permissions: role.permissions as object,
      },
      create: {
        name: role.name,
        isDefault: true,
        permissions: role.permissions as object,
      },
    });
    roleIds.set(role.name, saved.id);
  }
  console.log(`✔ ${ROLES.length} roles ready`);

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      passwordHash,
      name: "Admin",
      roleId: roleIds.get("Admin")!,
      active: true,
    },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      name: "Admin",
      roleId: roleIds.get("Admin")!,
      active: true,
    },
  });
  console.log(`✔ admin user ready (${ADMIN_EMAIL})`);

  await prisma.companySettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      companyName: "My Company",
      currency: "AED",
      vatRate: 5,
      defaultPaymentTermsDays: 30,
      invoiceNumberPrefix: "INV-",
      invoiceNextNumber: 1,
      proposalNumberPrefix: "QUO-",
      proposalNextNumber: 1,
      contractNumberPrefix: "CTR-",
      contractNextNumber: 1,
      defaultWeeklyHours: 40,
    },
  });
  console.log("✔ company settings ready");

  for (const name of EXPENSE_CATEGORIES) {
    await prisma.expenseCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`✔ ${EXPENSE_CATEGORIES.length} expense categories ready`);

  for (const type of NOTIFICATION_TYPES) {
    await prisma.notificationSetting.upsert({
      where: { type },
      update: { enabled: true },
      create: { type, enabled: true, channels: ["IN_APP", "EMAIL", "WHATSAPP"] },
    });
  }
  console.log(`✔ ${NOTIFICATION_TYPES.length} notification settings ready`);
}

main()
  .then(() => console.log("Seed complete."))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
