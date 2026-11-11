import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { getEffectiveStatus, invoiceBalance } from "@/lib/finance-helpers";
import { INVOICE_STATUS_MAP, INVOICE_STATUSES } from "@/lib/finance-labels";
import { generateRetainerInvoices } from "@/app/(app)/finance/actions";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  const canEdit = hasAccess(role, "finance", "edit");

  const params = await searchParams;
  const q = params.q ?? "";
  const status = params.status ?? "";

  const invoices = await db.invoice.findMany({
    where: {
      archived: false,
      ...(q
        ? {
            OR: [
              { number: { contains: q, mode: "insensitive" } },
              { company: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      company: { select: { name: true } },
      project: { select: { name: true } },
      payments: true,
    },
    orderBy: { issueDate: "desc" },
  });

  const rows = invoices
    .map((inv) => {
      const effective = getEffectiveStatus(inv);
      return { inv, effective, balance: invoiceBalance(inv) };
    })
    .filter((r) => !status || r.effective === status)
    .sort((a, b) => a.inv.dueDate.getTime() - b.inv.dueDate.getTime());

  const outstandingTotal = rows
    .filter((r) => ["SENT", "PARTIAL", "OVERDUE"].includes(r.effective))
    .reduce((s, r) => s + r.balance, 0);
  const overdueCount = rows.filter((r) => r.effective === "OVERDUE").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(outstandingTotal)} outstanding · {overdueCount} overdue
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <form action={generateRetainerInvoices}>
              <Button type="submit" variant="outline">
                Generate retainer invoices
              </Button>
            </form>
            <ButtonLink href="/finance/invoices/new">New invoice</ButtonLink>
          </div>
        )}
      </div>

      <form className="flex flex-wrap gap-2" method="get">
        <Input name="q" defaultValue={q} placeholder="Search number or client…" className="max-w-64" />
        <NativeSelect name="status" defaultValue={status} className="w-44">
          <option value="">All statuses</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Number</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Issued</th>
              <th className="px-4 py-3 font-medium">Due</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ inv, effective, balance }) => (
              <tr key={inv.id} className="border-b last:border-0 hover:bg-accent/50">
                <td className="px-4 py-3">
                  <Link href={`/finance/invoices/${inv.id}`} className="font-medium text-primary hover:underline">
                    {inv.number}
                  </Link>
                </td>
                <td className="px-4 py-3">{inv.company.name}</td>
                <td className="px-4 py-3">{inv.project?.name ?? "—"}</td>
                <td className="px-4 py-3">{formatDate(inv.issueDate)}</td>
                <td className="px-4 py-3">{formatDate(inv.dueDate)}</td>
                <td className="px-4 py-3">
                  <Badge value={effective} map={INVOICE_STATUS_MAP} />
                </td>
                <td className="px-4 py-3 text-right">{formatCurrency(inv.total)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">No invoices found.</p>
        )}
      </div>
    </div>
  );
}
