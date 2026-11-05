import Link from "next/link";
import { db } from "@/lib/db";
import {
  updateLead,
  updateLeadStatus,
  archiveLead,
  convertLead,
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
import { Badge, LEAD_SOURCES, LEAD_STATUS_MAP, LEAD_STATUSES } from "@/lib/crm-labels";
import { formatCurrency, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  const canEdit = hasAccess(role, "crm", "edit");

  const [lead, users, companies] = await Promise.all([
    db.lead.findUnique({ where: { id }, include: { owner: { select: { name: true } } } }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.company.findMany({ where: { archived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  if (!lead) {
    return <p className="text-sm text-muted-foreground">Lead not found.</p>;
  }

  const sourceOptions = LEAD_SOURCES.some((s) => s.value === lead.source)
    ? LEAD_SOURCES
    : [...LEAD_SOURCES.filter((s) => s.value !== "OTHER"), { value: lead.source ?? "", label: lead.source ?? "Other" }, { value: "OTHER", label: "Other" }];

  const convertible = !["CONVERTED", "LOST", "UNQUALIFIED"].includes(lead.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{lead.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge value={lead.status} map={LEAD_STATUS_MAP} />
            <span>Created {formatDate(lead.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/crm/leads">
            <Button variant="secondary">Back</Button>
          </Link>
          {canEdit && (
            <form action={archiveLead}>
              <input type="hidden" name="id" value={lead.id} />
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
          <CardContent>
            <form action={updateLeadStatus} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={lead.id} />
              {LEAD_STATUSES.filter((s) => !["CONVERTED"].includes(s.value)).map((s) => (
                <Button
                  key={s.value}
                  type="submit"
                  name="status"
                  value={s.value}
                  variant={lead.status === s.value ? "default" : "outline"}
                  size="sm"
                >
                  {s.label}
                </Button>
              ))}
            </form>
          </CardContent>
        </Card>
      )}

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit lead</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateLead} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={lead.id} />
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" defaultValue={lead.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company name</Label>
                <Input id="companyName" name="companyName" defaultValue={lead.companyName ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={lead.email ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={lead.phone ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <NativeSelect id="source" name="source" defaultValue={lead.source ?? ""}>
                  <option value="">Select…</option>
                  {sourceOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sourceText">Source (if Other)</Label>
                <Input id="sourceText" name="sourceText" defaultValue={lead.source && !sourceOptions.some((s) => s.value === lead.source) ? lead.source : ""} placeholder="e.g. Trade show" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedValue">Expected value (AED)</Label>
                <Input id="expectedValue" name="expectedValue" type="number" min="0" step="0.01" defaultValue={lead.expectedValue?.toString() ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerId">Owner</Label>
                <NativeSelect id="ownerId" name="ownerId" defaultValue={lead.ownerId ?? ""}>
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
                <Textarea id="notes" name="notes" rows={3} defaultValue={lead.notes ?? ""} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {canEdit && convertible && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Convert to client</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={convertLead} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={lead.id} />
              <div className="space-y-2">
                <Label htmlFor="mode">Company</Label>
                <NativeSelect id="mode" name="mode" defaultValue="new">
                  <option value="new">Create a new company</option>
                  <option value="existing">Attach to existing company</option>
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">New company name</Label>
                <Input id="companyName" name="companyName" defaultValue={lead.companyName ?? ""} placeholder={lead.companyName ?? "Company name"} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="companyId">Or choose existing company</Label>
                <NativeSelect id="companyId" name="companyId" defaultValue="">
                  <option value="">—</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">
                  Converts this lead into a primary contact under the chosen company and marks the lead as converted.
                  Estimated value: {formatCurrency(lead.expectedValue)}
                </p>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Convert lead</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
