import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import {
  updateInvoiceStatus,
  recordPayment,
  deletePayment,
} from "@/app/(app)/finance/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { getEffectiveStatus, invoiceBalance } from "@/lib/finance-helpers";
import { INVOICE_STATUS_MAP, PAYMENT_METHOD_MAP, PAYMENT_METHODS } from "@/lib/finance-labels";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  const canEdit = hasAccess(role, "finance", "edit");

  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true, address: true, vatId: true } },
      project: { select: { id: true, name: true } },
      contract: { select: { id: true, number: true } },
      milestone: { select: { id: true, name: true } },
      items: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { date: "desc" } },
    },
  });
  if (!invoice || invoice.archived) notFound();

  const effective = getEffectiveStatus(invoice);
  const balance = invoiceBalance(invoice);
  const canReceivePayment = !["PAID", "CANCELLED", "DRAFT"].includes(effective);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{invoice.number}</h1>
            <Badge value={effective} map={INVOICE_STATUS_MAP} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {invoice.company.name}
            {invoice.project ? (
              <>
                {" · "}
                <Link href={`/projects/${invoice.project.id}`} className="text-primary hover:underline">
                  {invoice.project.name}
                </Link>
              </>
            ) : null}
            {invoice.contract ? ` · ${invoice.contract.number}` : ""}
            {invoice.milestone ? ` · ${invoice.milestone.name}` : ""}
          </p>
        </div>
        {canEdit && (
          <form action={updateInvoiceStatus} className="flex items-end gap-2">
            <input type="hidden" name="id" value={invoice.id} />
            <div className="space-y-1">
              <Label htmlFor="status" className="text-xs">Status</Label>
              <NativeSelect id="status" name="status" defaultValue={invoice.status} className="w-40">
                {["DRAFT", "SENT", "CANCELLED"].map((s) => (
                  <option key={s} value={s}>
                    {INVOICE_STATUS_MAP[s]?.label ?? s}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <Button type="submit" variant="outline">Save</Button>
          </form>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Line items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Description</th>
                      <th className="px-4 py-2 text-right font-medium">Qty</th>
                      <th className="px-4 py-2 text-right font-medium">Unit price</th>
                      <th className="py-2 pl-4 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">{item.description}</td>
                        <td className="px-4 py-2 text-right">{Number(item.quantity)}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="py-2 pl-4 text-right font-medium">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT ({Number(invoice.taxRate)}%)</span>
                  <span>{formatCurrency(invoice.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {invoice.terms && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Terms</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{invoice.terms}</p>
              </CardContent>
            </Card>
          )}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issued</span>
                <span>{formatDate(invoice.issueDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due</span>
                <span>{formatDate(invoice.dueDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Balance</span>
                <span className="font-semibold">{formatCurrency(balance)}</span>
              </div>
              {invoice.company.vatId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client VAT</span>
                  <span>{invoice.company.vatId}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {invoice.payments.length === 0 && (
                <p className="text-sm text-muted-foreground">No payments recorded.</p>
              )}
              {invoice.payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <div>
                    <span className="font-medium">{formatCurrency(payment.amount)}</span>
                    <span className="ml-2 text-muted-foreground">
                      {formatDate(payment.date)} · {PAYMENT_METHOD_MAP[payment.method]?.label ?? payment.method}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                    </span>
                  </div>
                  {canEdit && (
                    <form action={deletePayment}>
                      <input type="hidden" name="id" value={payment.id} />
                      <input type="hidden" name="invoiceId" value={invoice.id} />
                      <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                        Delete
                      </Button>
                    </form>
                  )}
                </div>
              ))}
              {canEdit && canReceivePayment && (
                <form action={recordPayment} className="space-y-3 border-t pt-3">
                  <input type="hidden" name="invoiceId" value={invoice.id} />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="amount" className="text-xs">Amount *</Label>
                      <Input id="amount" name="amount" type="number" min="0.01" step="0.01" required />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="date" className="text-xs">Date</Label>
                      <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="method" className="text-xs">Method</Label>
                      <NativeSelect id="method" name="method" defaultValue="BANK_TRANSFER">
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="reference" className="text-xs">Reference</Label>
                      <Input id="reference" name="reference" maxLength={200} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="notes" className="text-xs">Notes</Label>
                    <Input id="notes" name="notes" maxLength={2000} />
                  </div>
                  <Button type="submit" className="w-full">Record payment</Button>
                </form>
              )}
              {canEdit && !canReceivePayment && (
                <p className="border-t pt-3 text-xs text-muted-foreground">
                  Payments are closed for {effective === "DRAFT" ? "draft" : effective.toLowerCase()} invoices.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
