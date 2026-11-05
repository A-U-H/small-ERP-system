import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import {
  createExpense,
  updateExpense,
  deleteExpense,
} from "@/app/(app)/finance/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { EXPENSE_PAID_BY_MAP } from "@/lib/finance-labels";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  const canEdit = hasAccess(role, "finance", "edit");

  const params = await searchParams;
  const q = params.q ?? "";
  const category = params.category ?? "";

  const [categories, projects, companies, expenses] = await Promise.all([
    db.expenseCategory.findMany({ orderBy: { name: "asc" } }),
    db.project.findMany({
      where: { archived: false },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.company.findMany({
      where: { archived: false },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.expense.findMany({
      where: {
        ...(q ? { description: { contains: q, mode: "insensitive" } } : {}),
        ...(category ? { categoryId: category } : {}),
      },
      include: {
        category: { select: { name: true } },
        project: { select: { name: true } },
        company: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    }),
  ]);

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const thisMonth = expenses
    .filter((e) => new Date(e.date) >= monthStart)
    .reduce((s, e) => s + Number(e.amount), 0);
  const reimbursablePending = expenses
    .filter((e) => e.reimbursable && e.paidBy === "EMPLOYEE")
    .reduce((s, e) => s + Number(e.amount), 0);

  const today = new Date().toISOString().slice(0, 10);
  const paidByValues = ["COMPANY", "EMPLOYEE"];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Expenses</h1>
        <p className="text-sm text-muted-foreground">
          {formatCurrency(thisMonth)} this month · {formatCurrency(reimbursablePending)} employee
          reimbursables pending
        </p>
      </div>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add expense</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createExpense} className="grid gap-4 sm:grid-cols-6">
              <div className="space-y-1 sm:col-span-3">
                <Label htmlFor="description">Description *</Label>
                <Input id="description" name="description" maxLength={2000} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="categoryId">Category *</Label>
                <NativeSelect id="categoryId" name="categoryId" required>
                  <option value="">Select…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label htmlFor="amount">Amount (AED) *</Label>
                <Input id="amount" name="amount" type="number" min="0.01" step="0.01" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" defaultValue={today} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="paidBy">Paid by</Label>
                <NativeSelect id="paidBy" name="paidBy" defaultValue="COMPANY">
                  {paidByValues.map((v) => (
                    <option key={v} value={v}>
                      {EXPENSE_PAID_BY_MAP[v]?.label ?? v}
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
                <Label htmlFor="companyId">Client</Label>
                <NativeSelect id="companyId" name="companyId" defaultValue="">
                  <option value="">No client</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="flex items-end sm:col-span-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="reimbursable" className="size-4" />
                  Reimbursable
                </label>
                <Button type="submit" className="ml-4">
                  Add expense
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <form className="flex flex-wrap gap-2" method="get">
        <Input name="q" defaultValue={q} placeholder="Search description…" className="max-w-64" />
        <NativeSelect name="category" defaultValue={category} className="w-44">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      <div className="space-y-3">
        {expenses.map((expense) => (
          <div key={expense.id} className="rounded-lg border bg-background p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{expense.description}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(expense.date)} · {expense.category.name} ·{" "}
                  {EXPENSE_PAID_BY_MAP[expense.paidBy]?.label ?? expense.paidBy}
                  {expense.project ? ` · ${expense.project.name}` : ""}
                  {expense.company ? ` · ${expense.company.name}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {expense.reimbursable && (
                  <Badge value="reimbursable" map={{ reimbursable: { label: "Reimbursable", color: "bg-violet-100 text-violet-700" } }} />
                )}
                <span className="font-medium">{formatCurrency(expense.amount)}</span>
                {canEdit && (
                  <form action={deleteExpense}>
                    <input type="hidden" name="id" value={expense.id} />
                    <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                      Delete
                    </Button>
                  </form>
                )}
              </div>
            </div>
            {canEdit && (
              <details className="mt-2 border-t pt-2">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                  Edit
                </summary>
                <form action={updateExpense} className="mt-3 grid gap-3 sm:grid-cols-6">
                  <input type="hidden" name="id" value={expense.id} />
                  <div className="space-y-1 sm:col-span-3">
                    <Label htmlFor={`desc-${expense.id}`} className="text-xs">Description</Label>
                    <Input id={`desc-${expense.id}`} name="description" maxLength={2000} defaultValue={expense.description} className="h-8" required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`cat-${expense.id}`} className="text-xs">Category</Label>
                    <NativeSelect id={`cat-${expense.id}`} name="categoryId" defaultValue={expense.categoryId} className="h-8">
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`amount-${expense.id}`} className="text-xs">Amount</Label>
                    <Input id={`amount-${expense.id}`} name="amount" type="number" min="0.01" step="0.01" defaultValue={expense.amount.toString()} className="h-8" required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`date-${expense.id}`} className="text-xs">Date</Label>
                    <Input id={`date-${expense.id}`} name="date" type="date" defaultValue={expense.date.toISOString().slice(0, 10)} className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`paidBy-${expense.id}`} className="text-xs">Paid by</Label>
                    <NativeSelect id={`paidBy-${expense.id}`} name="paidBy" defaultValue={expense.paidBy} className="h-8">
                      {paidByValues.map((v) => (
                        <option key={v} value={v}>
                          {EXPENSE_PAID_BY_MAP[v]?.label ?? v}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`project-${expense.id}`} className="text-xs">Project</Label>
                    <NativeSelect id={`project-${expense.id}`} name="projectId" defaultValue={expense.projectId ?? ""} className="h-8">
                      <option value="">None</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`company-${expense.id}`} className="text-xs">Client</Label>
                    <NativeSelect id={`company-${expense.id}`} name="companyId" defaultValue={expense.companyId ?? ""} className="h-8">
                      <option value="">None</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="flex items-end gap-3 sm:col-span-2">
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" name="reimbursable" defaultChecked={expense.reimbursable} className="size-4" />
                      Reimbursable
                    </label>
                    <Button type="submit" size="sm" variant="outline">
                      Save
                    </Button>
                  </div>
                </form>
              </details>
            )}
          </div>
        ))}
        {expenses.length === 0 && (
          <p className="rounded-lg border py-12 text-center text-sm text-muted-foreground">
            No expenses found.
          </p>
        )}
      </div>
    </div>
  );
}
