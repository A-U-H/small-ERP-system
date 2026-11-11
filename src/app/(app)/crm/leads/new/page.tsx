import { db } from "@/lib/db";
import { createLead } from "@/app/(app)/crm/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_SOURCES } from "@/lib/crm-labels";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  const users = await db.user.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">New lead</h1>
      <form action={createLead} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company name</Label>
              <Input id="companyName" name="companyName" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <NativeSelect id="source" name="source" defaultValue="">
                <option value="">Select…</option>
                {LEAD_SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sourceText">Source (if Other)</Label>
              <Input id="sourceText" name="sourceText" placeholder="e.g. Trade show" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedValue">Expected value (AED)</Label>
              <Input id="expectedValue" name="expectedValue" type="number" min="0" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerId">Owner</Label>
              <NativeSelect id="ownerId" name="ownerId" defaultValue="">
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} />
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Button type="submit">Create lead</Button>
          <ButtonLink href="/crm/leads" variant="secondary">
            Cancel
          </ButtonLink>
        </div>
      </form>
    </div>
  );
}
