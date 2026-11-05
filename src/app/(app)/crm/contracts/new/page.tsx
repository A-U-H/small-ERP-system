import { db } from "@/lib/db";
import { createContract } from "@/app/(app)/crm/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { BILLING_TYPES, CONTRACT_STATUSES } from "@/lib/crm-labels";

export const dynamic = "force-dynamic";

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  const params = await searchParams;
  const companies = await db.company.findMany({
    where: { archived: false },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">New contract</h1>
      <form action={createContract} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contract details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyId">Company *</Label>
              <NativeSelect id="companyId" name="companyId" defaultValue={params.company ?? ""} required>
                <option value="">Select company…</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingType">Billing type</Label>
              <NativeSelect id="billingType" name="billingType" defaultValue="FIXED">
                {BILLING_TYPES.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Value (AED) *</Label>
              <Input id="value" name="value" type="number" min="0" step="0.01" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <NativeSelect id="status" name="status" defaultValue="DRAFT">
                {CONTRACT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start date *</Label>
              <Input id="startDate" name="startDate" type="date" defaultValue={today} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End date</Label>
              <Input id="endDate" name="endDate" type="date" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="terms">Terms &amp; notes</Label>
              <Textarea id="terms" name="terms" rows={3} />
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Button type="submit">Create contract</Button>
          <ButtonLink href="/crm/contracts" variant="secondary">
            Cancel
          </ButtonLink>
        </div>
      </form>
    </div>
  );
}
