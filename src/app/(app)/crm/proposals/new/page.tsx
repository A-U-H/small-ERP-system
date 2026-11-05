import { db } from "@/lib/db";
import { createProposal } from "@/app/(app)/crm/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ProposalItemsField } from "@/components/crm/proposal-items-field";
import { PROPOSAL_STATUSES } from "@/lib/crm-labels";

export const dynamic = "force-dynamic";

export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; deal?: string }>;
}) {
  const params = await searchParams;
  const [companies, contacts, deals] = await Promise.all([
    db.company.findMany({ where: { archived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.contact.findMany({
      where: { archived: false },
      include: { company: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    db.deal.findMany({
      where: { archived: false },
      include: { company: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">New proposal</h1>
      <form action={createProposal} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proposal details</CardTitle>
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
              <Label htmlFor="contactId">Contact</Label>
              <NativeSelect id="contactId" name="contactId" defaultValue="">
                <option value="">None</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.company.name})
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dealId">Deal</Label>
              <NativeSelect id="dealId" name="dealId" defaultValue={params.deal ?? ""}>
                <option value="">None</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.company.name})
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="validUntil">Valid until</Label>
              <Input id="validUntil" name="validUntil" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Recipient email</Label>
              <Input id="recipientEmail" name="recipientEmail" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <NativeSelect id="status" name="status" defaultValue="DRAFT">
                {PROPOSAL_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="terms">Terms &amp; notes</Label>
              <Textarea id="terms" name="terms" rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Line items</CardTitle>
          </CardHeader>
          <CardContent>
            <ProposalItemsField />
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit">Create proposal</Button>
          <ButtonLink href="/crm/proposals" variant="secondary">
            Cancel
          </ButtonLink>
        </div>
      </form>
    </div>
  );
}
