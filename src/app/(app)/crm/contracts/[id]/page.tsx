import Link from "next/link";
import { db } from "@/lib/db";
import {
  updateContract,
  archiveContract,
  createProjectFromContract,
} from "@/app/(app)/crm/actions";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Badge, BILLING_TYPES, CONTRACT_STATUS_MAP, CONTRACT_STATUSES } from "@/lib/crm-labels";

export const dynamic = "force-dynamic";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  const canEdit = hasAccess(role, "crm", "edit");

  const [contract, companies] = await Promise.all([
    db.contract.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        proposal: { select: { id: true, number: true } },
        projects: { where: { archived: false } },
      },
    }),
    db.company.findMany({ where: { archived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  if (!contract) {
    return <p className="text-sm text-muted-foreground">Contract not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{contract.number}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge value={contract.status} map={CONTRACT_STATUS_MAP} />
            <Link href={`/crm/companies/${contract.companyId}`} className="hover:underline">
              {contract.company.name}
            </Link>
            {contract.proposal && (
              <Link href={`/crm/proposals/${contract.proposalId}`} className="hover:underline">
                · from {contract.proposal.number}
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/crm/contracts">
            <Button variant="secondary">Back</Button>
          </Link>
          {canEdit && (
            <form action={archiveContract}>
              <input type="hidden" name="id" value={contract.id} />
              <Button type="submit" variant="destructive">Archive</Button>
            </form>
          )}
        </div>
      </div>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit contract</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateContract} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={contract.id} />
              <div className="space-y-2">
                <Label htmlFor="companyId">Company *</Label>
                <NativeSelect id="companyId" name="companyId" defaultValue={contract.companyId} required>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingType">Billing type</Label>
                <NativeSelect id="billingType" name="billingType" defaultValue={contract.billingType}>
                  {BILLING_TYPES.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Value (AED) *</Label>
                <Input id="value" name="value" type="number" min="0" step="0.01" defaultValue={contract.value.toString()} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <NativeSelect id="status" name="status" defaultValue={contract.status}>
                  {CONTRACT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start date *</Label>
                <Input id="startDate" name="startDate" type="date" defaultValue={new Date(contract.startDate).toISOString().slice(0, 10)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End date</Label>
                <Input id="endDate" name="endDate" type="date" defaultValue={contract.endDate ? new Date(contract.endDate).toISOString().slice(0, 10) : ""} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="terms">Terms</Label>
                <Textarea id="terms" name="terms" rows={3} defaultValue={contract.terms ?? ""} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={2} defaultValue={contract.notes ?? ""} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project</CardTitle>
          </CardHeader>
          <CardContent>
            {contract.projects.length > 0 ? (
              <div className="space-y-1 text-sm">
                {contract.projects.map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}`} className="block rounded-md px-3 py-2 hover:bg-accent">
                    {project.name}
                  </Link>
                ))}
              </div>
            ) : (
              <form action={createProjectFromContract}>
                <input type="hidden" name="contractId" value={contract.id} />
                <Button type="submit">Create project from contract</Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
