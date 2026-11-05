import Link from "next/link";
import { db } from "@/lib/db";
import {
  updateProposalStatus,
  archiveProposal,
  createContractFromProposal,
} from "@/app/(app)/crm/actions";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, PROPOSAL_STATUS_MAP, PROPOSAL_STATUSES } from "@/lib/crm-labels";
import { formatCurrency, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  const canEdit = hasAccess(role, "crm", "edit");

  const proposal = await db.proposal.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } },
      contact: { select: { name: true } },
      deal: { select: { id: true, name: true } },
      items: { orderBy: { createdAt: "asc" } },
      contracts: { where: { archived: false } },
    },
  });

  if (!proposal) {
    return <p className="text-sm text-muted-foreground">Proposal not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{proposal.number}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge value={proposal.status} map={PROPOSAL_STATUS_MAP} />
            <Link href={`/crm/companies/${proposal.companyId}`} className="hover:underline">
              {proposal.company.name}
            </Link>
            {proposal.contact && <span>· {proposal.contact.name}</span>}
            {proposal.deal && (
              <Link href={`/crm/deals/${proposal.dealId}`} className="hover:underline">
                · {proposal.deal.name}
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/crm/proposals">
            <Button variant="secondary">Back</Button>
          </Link>
          {canEdit && (
            <form action={archiveProposal}>
              <input type="hidden" name="id" value={proposal.id} />
              <Button type="submit" variant="destructive">Archive</Button>
            </form>
          )}
        </div>
      </div>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form action={updateProposalStatus} className="flex flex-wrap gap-2">
              <input type="hidden" name="id" value={proposal.id} />
              {PROPOSAL_STATUSES.map((s) => (
                <Button
                  key={s.value}
                  type="submit"
                  name="status"
                  value={s.value}
                  variant={proposal.status === s.value ? "default" : "outline"}
                  size="sm"
                >
                  {s.label}
                </Button>
              ))}
            </form>
            {proposal.status === "ACCEPTED" && (
              <form action={createContractFromProposal}>
                <input type="hidden" name="proposalId" value={proposal.id} />
                <Button type="submit">Create contract from proposal</Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Line items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium">Qty</th>
                    <th className="px-3 py-2 font-medium">Unit price</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="px-3 py-2">{item.description}</td>
                      <td className="px-3 py-2">{item.quantity.toString()}</td>
                      <td className="px-3 py-2">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right font-medium">Total</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatCurrency(proposal.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Issued:</span> {formatDate(proposal.issueDate)}</p>
            <p><span className="text-muted-foreground">Valid until:</span> {formatDate(proposal.validUntil)}</p>
            <p><span className="text-muted-foreground">Recipient:</span> {proposal.recipientEmail ?? "—"}</p>
            {proposal.terms && (
              <p className="whitespace-pre-wrap"><span className="text-muted-foreground">Terms:</span> {proposal.terms}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {proposal.contracts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contracts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {proposal.contracts.map((contract) => (
              <Link key={contract.id} href={`/crm/contracts/${contract.id}`} className="block rounded-md px-3 py-2 hover:bg-accent">
                {contract.number} · {formatCurrency(contract.value)}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
