import Link from "next/link";
import { db } from "@/lib/db";
import { updateDeal, archiveDeal } from "@/app/(app)/crm/actions";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Badge, DEAL_STAGE_MAP, DEAL_STAGES, PROPOSAL_STATUS_MAP } from "@/lib/crm-labels";
import { formatCurrency, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  const canEdit = hasAccess(role, "crm", "edit");

  const [deal, users, companies, contacts] = await Promise.all([
    db.deal.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true } },
        owner: { select: { name: true } },
        proposals: { where: { archived: false } },
        followUps: { orderBy: { dueDate: "desc" }, take: 10 },
      },
    }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.company.findMany({ where: { archived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.contact.findMany({
      where: { archived: false },
      include: { company: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!deal) {
    return <p className="text-sm text-muted-foreground">Deal not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{deal.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge value={deal.stage} map={DEAL_STAGE_MAP} />
            <Link href={`/crm/companies/${deal.companyId}`} className="hover:underline">
              {deal.company.name}
            </Link>
            {deal.contact && <span>· {deal.contact.name}</span>}
            <span>· {formatCurrency(deal.value)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/crm/deals">
            <Button variant="secondary">Back</Button>
          </Link>
          {canEdit && (
            <form action={archiveDeal}>
              <input type="hidden" name="id" value={deal.id} />
              <Button type="submit" variant="destructive">Archive</Button>
            </form>
          )}
        </div>
      </div>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit deal</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateDeal} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={deal.id} />
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" defaultValue={deal.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyId">Company *</Label>
                <NativeSelect id="companyId" name="companyId" defaultValue={deal.companyId} required>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactId">Contact</Label>
                <NativeSelect id="contactId" name="contactId" defaultValue={deal.contactId ?? ""}>
                  <option value="">None</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.company.name})
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Value (AED)</Label>
                <Input id="value" name="value" type="number" min="0" step="0.01" defaultValue={deal.value?.toString() ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedCloseDate">Expected close date</Label>
                <Input id="expectedCloseDate" name="expectedCloseDate" type="date" defaultValue={deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toISOString().slice(0, 10) : ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="probability">Probability (%)</Label>
                <Input id="probability" name="probability" type="number" min="0" max="100" defaultValue={deal.probability} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage">Stage</Label>
                <NativeSelect id="stage" name="stage" defaultValue={deal.stage}>
                  {DEAL_STAGES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerId">Owner</Label>
                <NativeSelect id="ownerId" name="ownerId" defaultValue={deal.ownerId ?? ""}>
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
                <Textarea id="notes" name="notes" rows={3} defaultValue={deal.notes ?? ""} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Proposals</CardTitle>
            {canEdit && (
              <ButtonLink href="/crm/proposals/new" size="sm" variant="secondary">
                New proposal
              </ButtonLink>
            )}
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {deal.proposals.length === 0 && <p className="text-muted-foreground">No proposals yet.</p>}
          {deal.proposals.map((proposal) => (
            <Link
              key={proposal.id}
              href={`/crm/proposals/${proposal.id}`}
              className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-accent"
            >
              <span className="font-medium">{proposal.number}</span>
              <span className="flex items-center gap-2">
                {formatCurrency(proposal.total)}
                <Badge value={proposal.status} map={PROPOSAL_STATUS_MAP} />
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Follow-ups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {deal.followUps.length === 0 && <p className="text-muted-foreground">No follow-ups yet.</p>}
          {deal.followUps.map((fu) => (
            <div key={fu.id} className="flex items-center justify-between rounded-md px-3 py-2">
              <span>
                {fu.type}
                {fu.status === "DONE" ? " (done)" : ""}
              </span>
              <span className="text-muted-foreground">{formatDate(fu.dueDate)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
