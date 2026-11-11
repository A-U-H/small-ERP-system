import { db } from "@/lib/db";
import { updateCompanySettings } from "@/app/(app)/settings/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default async function CompanySettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const settings =
    (await db.companySettings.findUnique({ where: { id: 1 } })) ?? null;

  const v = (key: keyof NonNullable<typeof settings>) =>
    settings?.[key]?.toString() ?? "";

  return (
    <div className="space-y-4">
      {params.saved && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Settings saved.
        </div>
      )}
      <form action={updateCompanySettings} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company name</Label>
              <Input id="companyName" name="companyName" defaultValue={v("companyName")} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={v("email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={v("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" defaultValue={v("address")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatNumber">VAT / Tax number</Label>
              <Input id="vatNumber" name="vatNumber" defaultValue={v("vatNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input id="logoUrl" name="logoUrl" defaultValue={v("logoUrl")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Money & numbers</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" name="currency" maxLength={3} defaultValue={v("currency")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatRate">VAT rate (%)</Label>
              <Input id="vatRate" name="vatRate" type="number" step="0.01" defaultValue={v("vatRate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultPaymentTermsDays">Default payment terms (days)</Label>
              <Input id="defaultPaymentTermsDays" name="defaultPaymentTermsDays" type="number" defaultValue={v("defaultPaymentTermsDays")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceNumberPrefix">Invoice prefix</Label>
              <Input id="invoiceNumberPrefix" name="invoiceNumberPrefix" defaultValue={v("invoiceNumberPrefix")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceNextNumber">Invoice next number</Label>
              <Input id="invoiceNextNumber" name="invoiceNextNumber" type="number" defaultValue={v("invoiceNextNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proposalNumberPrefix">Proposal prefix</Label>
              <Input id="proposalNumberPrefix" name="proposalNumberPrefix" defaultValue={v("proposalNumberPrefix")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proposalNextNumber">Proposal next number</Label>
              <Input id="proposalNextNumber" name="proposalNextNumber" type="number" defaultValue={v("proposalNextNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractNumberPrefix">Contract prefix</Label>
              <Input id="contractNumberPrefix" name="contractNumberPrefix" defaultValue={v("contractNumberPrefix")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractNextNumber">Contract next number</Label>
              <Input id="contractNextNumber" name="contractNextNumber" type="number" defaultValue={v("contractNextNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultWeeklyHours">Default working hours / week</Label>
              <Input id="defaultWeeklyHours" name="defaultWeeklyHours" type="number" defaultValue={v("defaultWeeklyHours")} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit">Save settings</Button>
      </form>
    </div>
  );
}
