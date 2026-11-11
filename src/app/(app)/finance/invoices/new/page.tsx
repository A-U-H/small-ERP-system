import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import {
  createManualInvoice,
  createMilestoneInvoice,
  createHoursInvoice,
} from "@/app/(app)/finance/actions";
import { InvoiceItemsField } from "@/components/finance/invoice-items-field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  if (!hasAccess(role, "finance", "edit")) redirect("/finance?error=no-access");

  const [settings, companies, projects, contracts, milestones] = await Promise.all([
    db.companySettings.findUnique({ where: { id: 1 } }),
    db.company.findMany({
      where: { archived: false },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.project.findMany({
      where: { archived: false },
      select: { id: true, name: true, companyId: true },
      orderBy: { name: "asc" },
    }),
    db.contract.findMany({
      where: { archived: false, status: { in: ["SIGNED", "ACTIVE"] } },
      select: { id: true, number: true, company: { select: { name: true } } },
      orderBy: { number: "asc" },
    }),
    db.milestone.findMany({
      where: { billingValue: { not: null }, project: { archived: false } },
      select: {
        id: true,
        name: true,
        billingValue: true,
        project: { select: { name: true } },
      },
      orderBy: { project: { name: "asc" } },
    }),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const defaultDue = new Date();
  defaultDue.setDate(defaultDue.getDate() + (settings?.defaultPaymentTermsDays ?? 30));
  const defaultDueString = defaultDue.toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">New invoice</h1>
        <p className="text-sm text-muted-foreground">
          Pick a source: line items, a billable milestone, or logged billable hours.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manual — line items</CardTitle>
          <CardDescription>Add items, quantity and unit price. VAT ({Number(settings?.vatRate ?? 0)}%) is applied automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createManualInvoice} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="companyId">Client company *</Label>
                <NativeSelect id="companyId" name="companyId" required>
                  <option value="">Select company…</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label htmlFor="projectId">Project</Label>
                <NativeSelect id="projectId" name="projectId" defaultValue="">
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label htmlFor="contractId">Contract</Label>
                <NativeSelect id="contractId" name="contractId" defaultValue="">
                  <option value="">No contract</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.number} · {c.company.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="issueDate">Issue date</Label>
                  <Input id="issueDate" name="issueDate" type="date" defaultValue={today} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dueDate">Due date *</Label>
                  <Input id="dueDate" name="dueDate" type="date" defaultValue={defaultDueString} required />
                </div>
              </div>
            </div>
            <InvoiceItemsField />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="terms">Terms</Label>
                <Textarea id="terms" name="terms" rows={2} placeholder="Payment terms, late fees…" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={2} />
              </div>
            </div>
            <Button type="submit">Create invoice</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">From billable milestone</CardTitle>
          <CardDescription>Bills the milestone&apos;s fixed value as a single line item.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createMilestoneInvoice} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="milestoneId">Milestone *</Label>
              <NativeSelect id="milestoneId" name="milestoneId" required>
                <option value="">Select milestone…</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.project.name} / {m.name} ({formatCurrency(m.billingValue)})
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="milestoneIssueDate">Issue date</Label>
                <Input id="milestoneIssueDate" name="issueDate" type="date" defaultValue={today} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="milestoneDueDate">Due date *</Label>
                <Input id="milestoneDueDate" name="dueDate" type="date" defaultValue={defaultDueString} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="milestoneTerms">Terms</Label>
                <Textarea id="milestoneTerms" name="terms" rows={2} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="milestoneNotes">Notes</Label>
                <Textarea id="milestoneNotes" name="notes" rows={2} />
              </div>
            </div>
            <Button type="submit">Create invoice</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">From billable hours</CardTitle>
          <CardDescription>Sums billable time logged on a project in a date range, billed at your hourly rate.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createHoursInvoice} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="hoursProjectId">Project *</Label>
                <NativeSelect id="hoursProjectId" name="projectId" required>
                  <option value="">Select project…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label htmlFor="fromDate">From *</Label>
                <Input id="fromDate" name="fromDate" type="date" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="toDate">To *</Label>
                <Input id="toDate" name="toDate" type="date" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hourlyRate">Hourly rate (AED) *</Label>
                <Input id="hourlyRate" name="hourlyRate" type="number" min="0" step="0.01" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hoursIssueDate">Issue date</Label>
                <Input id="hoursIssueDate" name="issueDate" type="date" defaultValue={today} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hoursDueDate">Due date *</Label>
                <Input id="hoursDueDate" name="dueDate" type="date" defaultValue={defaultDueString} required />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="hoursTerms">Terms</Label>
                <Textarea id="hoursTerms" name="terms" rows={2} />
              </div>
            </div>
            <Button type="submit">Create invoice</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
