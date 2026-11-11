import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getEffectiveStatus, invoiceBalance } from "@/lib/finance-helpers";
import { workloadSummary } from "@/lib/team-workload";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Dashboard" };

export const dynamic = "force-dynamic";

const ENTITY_LABELS: Record<string, string> = {
  LEAD: "Lead",
  COMPANY: "Company",
  CONTACT: "Contact",
  DEAL: "Deal",
  PROPOSAL: "Proposal",
  CONTRACT: "Contract",
  PROJECT: "Project",
  MILESTONE: "Milestone",
  TASK: "Task",
  SUBTASK: "Subtask",
  SPRINT: "Sprint",
  PROJECT_MEMBER: "Project member",
  COMMENT: "Comment",
  ATTACHMENT: "Attachment",
  PROJECT_TEMPLATE: "Template",
  EMPLOYEE: "Employee",
  EMPLOYEE_SKILL: "Skills",
  TIME_ENTRY: "Time entry",
  ATTENDANCE: "Attendance",
};

function activityHref(entityType: string, entityId: string | null): string | null {
  if (!entityId) return null;
  switch (entityType) {
    case "LEAD":
      return `/crm/leads/${entityId}`;
    case "COMPANY":
      return `/crm/companies/${entityId}`;
    case "DEAL":
      return `/crm/deals/${entityId}`;
    case "PROPOSAL":
      return `/crm/proposals/${entityId}`;
    case "CONTRACT":
      return `/crm/contracts/${entityId}`;
    case "PROJECT":
      return `/projects/${entityId}`;
    case "EMPLOYEE":
      return `/team/members/${entityId}`;
    default:
      return null;
  }
}

function humanize(action: string): string {
  return action.toLowerCase().replace(/_/g, " ");
}

export default async function DashboardPage() {
  const session = await auth();
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);
  in30Days.setHours(23, 59, 59, 999);

  const [
    activeProjects,
    tasks,
    leadsNew,
    invoices,
    payments,
    expenses,
    employees,
    activity,
    contracts,
    followUps,
    settings,
  ] = await Promise.all([
    db.project.count({
      where: { archived: false, status: { in: ["IN_PROGRESS", "ON_HOLD"] } },
    }),
    db.task.findMany({
      where: { status: { not: "DONE" } },
      select: {
        id: true,
        name: true,
        status: true,
        dueDate: true,
        project: { select: { id: true, name: true } },
      },
    }),
    db.lead.count({ where: { archived: false, createdAt: { gte: weekAgo } } }),
    db.invoice.findMany({
      where: { archived: false },
      include: {
        company: { select: { name: true } },
        project: { select: { name: true } },
        payments: true,
      },
    }),
    db.payment.findMany({
      where: { date: { gte: currentMonthStart } },
      select: { amount: true, date: true },
    }),
    db.expense.findMany({
      where: { date: { gte: currentMonthStart } },
      select: { amount: true },
    }),
    db.employee.findMany({
      where: { status: { not: "INACTIVE" } },
      include: {
        assignedTasks: { select: { status: true, estimate: true } },
        timeEntries: { select: { date: true, hours: true } },
      },
    }),
    db.activityLog.findMany({
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.contract.findMany({
      where: { archived: false, status: "ACTIVE", endDate: { not: null } },
      select: {
        id: true,
        number: true,
        endDate: true,
        company: { select: { name: true } },
      },
    }),
    db.followUp.findMany({
      where: { status: "PENDING" },
      select: { id: true, dueDate: true, type: true, company: { select: { name: true } } },
    }),
    db.companySettings.findUnique({ where: { id: 1 } }),
  ]);

  const capacity = settings?.defaultWeeklyHours ?? 40;

  // ── Tasks ──
  const tasksDueToday = tasks.filter(
    (t) => t.dueDate && t.dueDate >= todayStart && t.dueDate < tomorrow,
  );
  const tasksOverdue = tasks.filter((t) => t.dueDate && t.dueDate < todayStart);

  // ── Finance (cash basis) ──
  const revenueThisMonth = payments.reduce((s, p) => s + Number(p.amount), 0);
  const expensesThisMonth = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const pendingInvoices = invoices.filter((inv) => {
    const s = getEffectiveStatus(inv);
    return ["SENT", "PARTIAL", "OVERDUE"].includes(s);
  });
  const outstandingTotal = pendingInvoices.reduce((s, inv) => s + invoiceBalance(inv), 0);
  const sentCount = pendingInvoices.filter(
    (inv) => getEffectiveStatus(inv) === "SENT",
  ).length;
  const partialCount = pendingInvoices.filter(
    (inv) => getEffectiveStatus(inv) === "PARTIAL",
  ).length;
  const overdueCount = pendingInvoices.filter(
    (inv) => getEffectiveStatus(inv) === "OVERDUE",
  ).length;

  // ── Revenue chart: last 6 months ──
  const months: { label: string; start: Date; end: Date }[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const start = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const end = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    months.push({ label: start.toLocaleString("en-GB", { month: "short" }), start, end });
  }
  const chartData = months.map((m) => {
    let amount = 0;
    for (const invoice of invoices) {
      for (const payment of invoice.payments) {
        const d = new Date(payment.date);
        if (d >= m.start && d < m.end) amount += Number(payment.amount);
      }
    }
    return { label: m.label, amount };
  });
  const maxRevenue = Math.max(...chartData.map((c) => c.amount), 1);

  // ── Workload ──
  const workload = employees
    .map((employee) => ({
      employee,
      load: workloadSummary(employee, capacity),
    }))
    .sort((a, b) => b.load.committed - a.load.committed);
  const overloadedMembers = workload.filter((w) => w.load.overloaded).length;

  // ── Alerts ──
  const expiringContracts = contracts.filter((c) => c.endDate && new Date(c.endDate) <= in30Days);
  const followUpAlerts = followUps.filter((f) => f.dueDate <= in30Days);
  const overdueInvoices = pendingInvoices.filter(
    (inv) => getEffectiveStatus(inv) === "OVERDUE",
  );
  const overloadedList = workload.filter((w) => w.load.overloaded).slice(0, 5);

  const kpis = [
    {
      label: "Active projects",
      value: String(activeProjects),
      href: "/projects",
      hint: "In progress or on hold",
    },
    {
      label: "Tasks due today",
      value: String(tasksDueToday.length),
      href: "/projects",
      hint: `${tasksOverdue.length} overdue`,
      alert: tasksOverdue.length > 0,
    },
    {
      label: "Revenue this month",
      value: formatCurrency(revenueThisMonth),
      href: "/finance",
      hint: `${formatCurrency(expensesThisMonth)} expenses`,
    },
    {
      label: "Pending invoices",
      value: String(pendingInvoices.length),
      href: "/finance/invoices",
      hint: `${formatCurrency(outstandingTotal)} · ${sentCount} sent · ${partialCount} partial · ${overdueCount} overdue`,
      alert: overdueCount > 0,
    },
    {
      label: "New leads (7 days)",
      value: String(leadsNew),
      href: "/crm/leads",
      hint: "Last 7 days",
    },
    {
      label: "Overloaded members",
      value: String(overloadedMembers),
      href: "/team/workload",
      hint: `${workload.length} active members`,
      alert: overloadedMembers > 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{session?.user.name ? `, ${session.user.name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here is what is happening across your business.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href}>
            <div className="rounded-lg border bg-background p-4 transition-colors hover:bg-accent">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                {kpi.label}
                {kpi.alert && (
                  <span className="size-2 rounded-full bg-rose-500" title="Needs attention" />
                )}
              </p>
              <p className="mt-1 text-2xl font-semibold">{kpi.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Revenue — last 6 months</h2>
            <Link href="/finance" className="text-sm text-primary hover:underline">
              Finance
            </Link>
          </div>
          <div className="flex h-40 items-end gap-3">
            {chartData.map((c) => (
              <div key={c.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div
                  className="w-full rounded-t bg-primary"
                  style={{
                    height: `${Math.max(6, (c.amount / maxRevenue) * 100)}%`,
                    opacity: c.amount > 0 ? 1 : 0.15,
                  }}
                  title={formatCurrency(c.amount)}
                />
                <span className="text-xs text-muted-foreground">{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Team workload</h2>
            <Link href="/team/workload" className="text-sm text-primary hover:underline">
              Workload
            </Link>
          </div>
          {workload.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active team members.</p>
          ) : (
            <ul className="space-y-2">
              {workload.slice(0, 6).map(({ employee, load }) => (
                <li key={employee.id}>
                  <Link
                    href={`/team/members/${employee.id}`}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate pr-3">{employee.name}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {load.committed}h / {load.capacity}h
                    </span>
                  </Link>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${load.overloaded ? "bg-destructive" : "bg-primary"}`}
                      style={{ width: `${load.usedPercent}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-background p-4">
          <h2 className="mb-3 text-base font-semibold">Recent activity</h2>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((entry) => {
                const href = activityHref(entry.entityType, entry.entityId);
                const label =
                  ENTITY_LABELS[entry.entityType] ?? entry.entityType.toLowerCase();
                const detail = entry.detail as { name?: string; number?: string } | null;
                const text = `${humanize(entry.action)} ${label}`;
                const body = (
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm">
                      <span className="font-medium">{entry.actor?.name ?? "Someone"}</span>{" "}
                      {text}
                      {detail?.name ? ` — ${detail.name}` : detail?.number ? ` — ${detail.number}` : ""}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </span>
                  </div>
                );
                return (
                  <li key={entry.id}>
                    {href ? (
                      <Link href={href} className="block rounded-md px-2 py-1 hover:bg-accent">
                        {body}
                      </Link>
                    ) : (
                      <div className="px-2 py-1">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-lg border bg-background p-4">
          <h2 className="mb-3 text-base font-semibold">Attention</h2>
          <div className="space-y-4">
            {tasksOverdue.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Overdue tasks
                </p>
                <ul className="space-y-1">
                  {tasksOverdue.slice(0, 4).map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/projects/${t.project.id}`}
                        className="flex items-center justify-between gap-2 text-sm hover:underline"
                      >
                        <span className="truncate">{t.name}</span>
                        <span className="shrink-0 text-xs text-rose-600">
                          {t.dueDate ? t.dueDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : ""}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {overdueInvoices.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Overdue invoices
                </p>
                <ul className="space-y-1">
                  {overdueInvoices.slice(0, 4).map((inv) => (
                    <li key={inv.id}>
                      <Link
                        href={`/finance/invoices/${inv.id}`}
                        className="flex items-center justify-between gap-2 text-sm hover:underline"
                      >
                        <span className="truncate">
                          {inv.number} · {inv.company.name}
                        </span>
                        <span className="shrink-0 font-medium">{formatCurrency(invoiceBalance(inv))}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {expiringContracts.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Contracts expiring soon
                </p>
                <ul className="space-y-1">
                  {expiringContracts.slice(0, 4).map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/crm/contracts/${c.id}`}
                        className="flex items-center justify-between gap-2 text-sm hover:underline"
                      >
                        <span className="truncate">
                          {c.number} · {c.company.name}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {c.endDate ? c.endDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {followUpAlerts.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Follow-ups due
                </p>
                <ul className="space-y-1">
                  {followUpAlerts.slice(0, 4).map((f) => (
                    <li key={f.id}>
                      <Link
                        href="/crm/followups"
                        className="flex items-center justify-between gap-2 text-sm hover:underline"
                      >
                        <span className="truncate">{f.company?.name ?? "Follow-up"}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {f.dueDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {overloadedList.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Overloaded members
                </p>
                <ul className="space-y-1">
                  {overloadedList.map(({ employee, load }) => (
                    <li key={employee.id}>
                      <Link
                        href={`/team/members/${employee.id}`}
                        className="flex items-center justify-between gap-2 text-sm hover:underline"
                      >
                        <span className="truncate">{employee.name}</span>
                        <Badge
                          value="overloaded"
                          map={{ overloaded: { label: `${load.committed}h / ${load.capacity}h`, color: "bg-rose-100 text-rose-700" } }}
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {tasksOverdue.length === 0 &&
              overdueInvoices.length === 0 &&
              expiringContracts.length === 0 &&
              followUpAlerts.length === 0 &&
              overloadedList.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nothing needs attention right now.
                </p>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
