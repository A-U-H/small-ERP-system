import Link from "next/link";
import { db } from "@/lib/db";
import { hasAccess } from "@/lib/permissions";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Badge, LEAD_STATUSES, LEAD_STATUS_MAP } from "@/lib/crm-labels";
import { formatCurrency, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  const canEdit = hasAccess(role, "crm", "edit");

  const statusFilter = LEAD_STATUS_MAP[params.status ?? ""] ? params.status : undefined;

  const leads = await db.lead.findMany({
    where: {
      archived: false,
      ...(statusFilter ? { status: statusFilter as never } : {}),
      ...(params.q
        ? {
            OR: [
              { name: { contains: params.q, mode: "insensitive" } },
              { email: { contains: params.q, mode: "insensitive" } },
              { companyName: { contains: params.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { owner: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Leads</h1>
        {canEdit && (
          <ButtonLink href="/crm/leads/new">
            <Plus className="size-4" /> New lead
          </ButtonLink>
        )}
      </div>

      <form className="flex gap-2">
        <Input name="q" defaultValue={params.q} placeholder="Search leads…" className="max-w-sm" />
        <Button type="submit" variant="secondary">Search</Button>
      </form>

      <div className="flex flex-wrap gap-1">
        <Link
          href="/crm/leads"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${!statusFilter ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
        >
          All
        </Link>
        {LEAD_STATUSES.map((s) => (
          <Link
            key={s.value}
            href={`/crm/leads?status=${s.value}`}
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
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Source</th>
                <th className="px-4 py-2 font-medium">Value</th>
                <th className="px-4 py-2 font-medium">Owner</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b last:border-0 hover:bg-accent/50">
                  <td className="px-4 py-2">
                    <Link href={`/crm/leads/${lead.id}`} className="font-medium hover:underline">
                      {lead.name}
                    </Link>
                    {lead.email && (
                      <span className="block text-xs text-muted-foreground">{lead.email}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{lead.companyName ?? "—"}</td>
                  <td className="px-4 py-2">{lead.source ?? "—"}</td>
                  <td className="px-4 py-2">{formatCurrency(lead.expectedValue)}</td>
                  <td className="px-4 py-2">{lead.owner?.name ?? "—"}</td>
                  <td className="px-4 py-2">
                    <Badge value={lead.status} map={LEAD_STATUS_MAP} />
                  </td>
                  <td className="px-4 py-2">{formatDate(lead.createdAt)}</td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No leads found.
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
