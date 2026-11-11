import Link from "next/link";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { getEffectiveStatus, invoiceBalance } from "@/lib/finance-helpers";
import { Badge } from "@/components/ui/badge";
import { INVOICE_STATUS_MAP } from "@/lib/finance-labels";

export const dynamic = "force-dynamic";

export default async function FinanceOverviewPage() {
  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const yearStart = new Date(today.getFullYear(), 0, 1);

  const [invoices, expenses] = await Promise.all([
    db.invoice.findMany({
      where: { archived: false },
      include: {
        company: { select: { name: true } },
        project: { select: { name: true } },
        payments: true,
      },
      orderBy: { issueDate: "desc" },
    }),
    db.expense.findMany({
      where: { date: { gte: yearStart } },
      select: { amount: true, date: true },
    }),
  ]);

  const isInRange = (date: Date, start: Date, end: Date) => date >= start && date < end;

  let revenueThisMonth = 0;
  let revenueLastMonth = 0;
  let revenueThisYear = 0;
  const byProject = new Map<string, number>();
  const byClient = new Map<string, number>();

  for (const invoice of invoices) {
    for (const payment of invoice.payments) {
      const d = new Date(payment.date);
      const amount = Number(payment.amount);
      if (d >= yearStart) {
        revenueThisYear += amount;
        if (isInRange(d, currentMonthStart, new Date(today.getFullYear(), today.getMonth() + 1, 1))) {
          revenueThisMonth += amount;
        }
        if (isInRange(d, lastMonthStart, currentMonthStart)) {
          revenueLastMonth += amount;
        }
        const pKey = invoice.project?.name ?? "Unlinked";
        byProject.set(pKey, (byProject.get(pKey) ?? 0) + amount);
        const cKey = invoice.company.name;
        byClient.set(cKey, (byClient.get(cKey) ?? 0) + amount);
      }
    }
  }

  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const expensesThisMonth = expenses
    .filter((e) => isInRange(new Date(e.date), currentMonthStart, nextMonthStart))
    .reduce((s, e) => s + Number(e.amount), 0);
  const expensesLastMonth = expenses
    .filter((e) => isInRange(new Date(e.date), lastMonthStart, currentMonthStart))
    .reduce((s, e) => s + Number(e.amount), 0);
  const expensesThisYear = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const profitThisMonth = revenueThisMonth - expensesThisMonth;
  const profitLastMonth = revenueLastMonth - expensesLastMonth;
  const profitThisYear = revenueThisYear - expensesThisYear;

  const activeInvoices = invoices.filter((inv) => {
    const s = getEffectiveStatus(inv);
    return s !== "PAID" && s !== "CANCELLED" && s !== "DRAFT";
  });
  const outstanding = activeInvoices.reduce((s, inv) => s + invoiceBalance(inv), 0);

  const inSevenDays = new Date();
  inSevenDays.setDate(inSevenDays.getDate() + 7);
  inSevenDays.setHours(23, 59, 59, 999);
  const attention = activeInvoices
    .filter((inv) => {
      const status = getEffectiveStatus(inv);
      if (status === "OVERDUE") return true;
      return new Date(inv.dueDate) <= inSevenDays;
    })
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 8);

  const pct = (cur: number, prev: number) =>
    prev === 0 ? null : Math.round(((cur - prev) / prev) * 100);

  const topProjects = Array.from(byProject.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const topClients = Array.from(byClient.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const kpis = [
    {
      label: "Revenue this month",
      value: formatCurrency(revenueThisMonth),
      delta: pct(revenueThisMonth, revenueLastMonth),
      deltaLabel: `vs ${formatCurrency(revenueLastMonth)} last month`,
    },
    {
      label: "Outstanding (AR)",
      value: formatCurrency(outstanding),
      delta: null,
      deltaLabel: `${activeInvoices.length} open invoices`,
    },
    {
      label: "Expenses this month",
      value: formatCurrency(expensesThisMonth),
      delta: pct(expensesThisMonth, expensesLastMonth),
      deltaLabel: `vs ${formatCurrency(expensesLastMonth)} last month`,
    },
    {
      label: "Profit this month",
      value: formatCurrency(profitThisMonth),
      delta: pct(profitThisMonth, profitLastMonth),
      deltaLabel: `vs ${formatCurrency(profitLastMonth)} last month`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Revenue overview</h1>
        <p className="text-sm text-muted-foreground">
          Cash basis — revenue counts when received. Year to date:{" "}
          {formatCurrency(revenueThisYear)} received, {formatCurrency(expensesThisYear)} spent,{" "}
          {formatCurrency(profitThisYear)} net.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-lg border bg-background p-4">
            <p className="text-sm text-muted-foreground">{kpi.label}</p>
            <p className="mt-1 text-2xl font-semibold">{kpi.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {kpi.delta !== null && (
                <span className={kpi.delta >= 0 ? "text-emerald-600" : "text-rose-600"}>
                  {kpi.delta >= 0 ? "▲" : "▼"} {Math.abs(kpi.delta)}%
                </span>
              )}{" "}
              {kpi.deltaLabel}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Revenue by project</h2>
            <Link href="/finance/invoices" className="text-sm text-primary hover:underline">
              Invoices
            </Link>
          </div>
          {topProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments received yet this year.</p>
          ) : (
            <ul className="space-y-2">
              {topProjects.map(([name, amount]) => (
                <li key={name} className="flex items-center justify-between text-sm">
                  <span className="truncate pr-4">{name}</span>
                  <span className="font-medium">{formatCurrency(amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Revenue by client</h2>
            <Link href="/crm/companies" className="text-sm text-primary hover:underline">
              Companies
            </Link>
          </div>
          {topClients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments received yet this year.</p>
          ) : (
            <ul className="space-y-2">
              {topClients.map(([name, amount]) => (
                <li key={name} className="flex items-center justify-between text-sm">
                  <span className="truncate pr-4">{name}</span>
                  <span className="font-medium">{formatCurrency(amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-background p-4">
        <h2 className="mb-3 text-base font-semibold">Needs attention</h2>
        {attention.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No overdue invoices or invoices due within 7 days. All good.
          </p>
        ) : (
          <ul className="space-y-2">
            {attention.map((inv) => {
              const status = getEffectiveStatus(inv);
              return (
                <li key={inv.id}>
                  <Link
                    href={`/finance/invoices/${inv.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
                  >
                    <span className="text-sm font-medium">
                      {inv.number} · {inv.company.name}
                      {inv.project ? ` · ${inv.project.name}` : ""}
                    </span>
                    <span className="flex items-center gap-3">
                      <Badge value={status} map={INVOICE_STATUS_MAP} />
                      <span className="text-sm text-muted-foreground">
                        Due {inv.dueDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                      </span>
                      <span className="text-sm font-medium">{formatCurrency(invoiceBalance(inv))}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
