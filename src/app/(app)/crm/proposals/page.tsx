import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { Badge, PROPOSAL_STATUS_MAP, PROPOSAL_STATUSES } from "@/lib/crm-labels";
import { formatCurrency, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  const canEdit = hasAccess(role, "crm", "edit");

  const statusFilter = PROPOSAL_STATUS_MAP[params.status ?? ""] ? params.status : undefined;

  const proposals = await db.proposal.findMany({
    where: {
      archived: false,
      ...(statusFilter ? { status: statusFilter as never } : {}),
    },
    include: { company: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Proposals</h1>
        {canEdit && (
          <ButtonLink href="/crm/proposals/new">
            <Plus className="size-4" /> New proposal
          </ButtonLink>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        <Link
          href="/crm/proposals"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${!statusFilter ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
        >
          All
        </Link>
        {PROPOSAL_STATUSES.map((s) => (
          <Link
            key={s.value}
            href={`/crm/proposals?status=${s.value}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${statusFilter === s.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Number</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Issued</th>
                <th className="px-4 py-2 font-medium">Valid until</th>
                <th className="px-4 py-2 font-medium">Total</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((proposal) => (
                <tr key={proposal.id} className="border-b last:border-0 hover:bg-accent/50">
                  <td className="px-4 py-2">
                    <Link href={`/crm/proposals/${proposal.id}`} className="font-medium hover:underline">
                      {proposal.number}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{proposal.company.name}</td>
                  <td className="px-4 py-2">{formatDate(proposal.issueDate)}</td>
                  <td className="px-4 py-2">{formatDate(proposal.validUntil)}</td>
                  <td className="px-4 py-2">{formatCurrency(proposal.total)}</td>
                  <td className="px-4 py-2">
                    <Badge value={proposal.status} map={PROPOSAL_STATUS_MAP} />
                  </td>
                </tr>
              ))}
              {proposals.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No proposals found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
