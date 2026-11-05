import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge, COMPANY_STATUS_MAP, COMPANY_STATUSES } from "@/lib/crm-labels";

export const dynamic = "force-dynamic";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  const canEdit = hasAccess(role, "crm", "edit");

  const statusFilter = COMPANY_STATUS_MAP[params.status ?? ""] ? params.status : undefined;

  const companies = await db.company.findMany({
    where: {
      archived: false,
      ...(statusFilter ? { status: statusFilter as never } : {}),
      ...(params.q
        ? {
            OR: [
              { name: { contains: params.q, mode: "insensitive" } },
              { email: { contains: params.q, mode: "insensitive" } },
              { phone: { contains: params.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      owner: { select: { name: true } },
      _count: { select: { contacts: true, deals: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Companies</h1>
        {canEdit && (
          <ButtonLink href="/crm/companies/new">
            <Plus className="size-4" /> New company
          </ButtonLink>
        )}
      </div>

      <form className="flex flex-wrap gap-2">
        <Input name="q" defaultValue={params.q} placeholder="Search companies…" className="max-w-sm" />
        <NativeSelect name="status" defaultValue={statusFilter ?? ""} className="max-w-44">
          <option value="">All statuses</option>
          {COMPANY_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="secondary">Filter</Button>
      </form>

      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Industry</th>
                <th className="px-4 py-2 font-medium">Contacts</th>
                <th className="px-4 py-2 font-medium">Deals</th>
                <th className="px-4 py-2 font-medium">Owner</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id} className="border-b last:border-0 hover:bg-accent/50">
                  <td className="px-4 py-2">
                    <Link href={`/crm/companies/${company.id}`} className="font-medium hover:underline">
                      {company.name}
                    </Link>
                    {company.email && (
                      <span className="block text-xs text-muted-foreground">{company.email}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{company.industry ?? "—"}</td>
                  <td className="px-4 py-2">{company._count.contacts}</td>
                  <td className="px-4 py-2">{company._count.deals}</td>
                  <td className="px-4 py-2">{company.owner?.name ?? "—"}</td>
                  <td className="px-4 py-2">
                    <Badge value={company.status} map={COMPANY_STATUS_MAP} />
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No companies found.
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
