import Link from "next/link";
import { db } from "@/lib/db";
import { updateCompany, archiveCompany } from "@/app/(app)/crm/actions";
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
import {
  Badge,
  COMPANY_STATUS_MAP,
  COMPANY_STATUSES,
  CONTRACT_STATUS_MAP,
  DEAL_STAGE_MAP,
  FOLLOW_UP_TYPE_MAP,
  PROPOSAL_STATUS_MAP,
} from "@/lib/crm-labels";
import { formatCurrency, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  const canEdit = hasAccess(role, "crm", "edit");

  const [company, users] = await Promise.all([
    db.company.findUnique({
      where: { id },
      include: {
        owner: { select: { name: true } },
        contacts: {
          where: { archived: false },
          orderBy: { isPrimary: "desc" },
        },
        deals: { where: { archived: false }, include: { owner: { select: { name: true } } } },
        proposals: { where: { archived: false } },
        contracts: { where: { archived: false } },
        projects: { where: { archived: false } },
        invoices: { where: { archived: false } },
        followUps: { orderBy: { dueDate: "desc" }, take: 10 },
        meetingNotes: { orderBy: { date: "desc" }, take: 10 },
      },
    }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  if (!company) {
    return <p className="text-sm text-muted-foreground">Company not found.</p>;
  }

  const primaryContact = company.contacts.find((c) => c.isPrimary);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{company.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge value={company.status} map={COMPANY_STATUS_MAP} />
            {company.industry && <span>{company.industry}</span>}
            <span>Owner: {company.owner?.name ?? "—"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/crm/companies">
            <Button variant="secondary">Back</Button>
          </Link>
          {canEdit && (
            <form action={archiveCompany}>
              <input type="hidden" name="id" value={company.id} />
              <Button type="submit" variant="destructive">Archive</Button>
            </form>
          )}
        </div>
      </div>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit company</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateCompany} className="grid gap-4 sm:grid-cols-3">
              <input type="hidden" name="id" value={company.id} />
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" defaultValue={company.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input id="industry" name="industry" defaultValue={company.industry ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Company size</Label>
                <Input id="size" name="size" defaultValue={company.size ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" defaultValue={company.website ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={company.phone ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={company.email ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vatId">VAT / Tax ID</Label>
                <Input id="vatId" name="vatId" defaultValue={company.vatId ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <NativeSelect id="status" name="status" defaultValue={company.status}>
                  {COMPANY_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerId">Owner</Label>
                <NativeSelect id="ownerId" name="ownerId" defaultValue={company.ownerId ?? ""}>
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2 sm:col-span-3">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" defaultValue={company.address ?? ""} />
              </div>
              <div className="space-y-2 sm:col-span-3">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={3} defaultValue={company.notes ?? ""} />
              </div>
              <div className="sm:col-span-3">
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Contacts</CardTitle>
            {canEdit && (
              <ButtonLink href="/crm/contacts/new" size="sm" variant="secondary">
                Add contact
              </ButtonLink>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {company.contacts.length === 0 && (
              <p className="text-sm text-muted-foreground">No contacts yet.</p>
            )}
            {company.contacts.map((contact) => (
              <div key={contact.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">
                    {contact.name}
                    {contact.isPrimary && (
                      <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                        Primary
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[contact.position, contact.department].filter(Boolean).join(" · ") || contact.email || "—"}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Primary contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {primaryContact ? (
              <>
                <p className="font-medium">{primaryContact.name}</p>
                <p>{primaryContact.email ?? "—"}</p>
                <p>{primaryContact.phone ?? "—"}</p>
              </>
            ) : (
              <p className="text-muted-foreground">No primary contact set.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Deals</CardTitle>
            {canEdit && (
              <ButtonLink href="/crm/deals/new" size="sm" variant="secondary">
                Add deal
              </ButtonLink>
            )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Deal</th>
                  <th className="px-3 py-2 font-medium">Value</th>
                  <th className="px-3 py-2 font-medium">Stage</th>
                  <th className="px-3 py-2 font-medium">Owner</th>
                  <th className="px-3 py-2 font-medium">Close</th>
                </tr>
              </thead>
              <tbody>
                {company.deals.map((deal) => (
                  <tr key={deal.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <Link href={`/crm/deals/${deal.id}`} className="font-medium hover:underline">
                        {deal.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{formatCurrency(deal.value)}</td>
                    <td className="px-3 py-2">
                      <Badge value={deal.stage} map={DEAL_STAGE_MAP} />
                    </td>
                    <td className="px-3 py-2">{deal.owner?.name ?? "—"}</td>
                    <td className="px-3 py-2">{formatDate(deal.expectedCloseDate)}</td>
                  </tr>
                ))}
                {company.deals.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                      No deals yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
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
            {company.proposals.length === 0 && (
              <p className="text-muted-foreground">No proposals yet.</p>
            )}
            {company.proposals.map((proposal) => (
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Contracts</CardTitle>
            {canEdit && (
              <ButtonLink href="/crm/contracts/new" size="sm" variant="secondary">
                New contract
              </ButtonLink>
            )}
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {company.contracts.length === 0 && (
              <p className="text-muted-foreground">No contracts yet.</p>
            )}
            {company.contracts.map((contract) => (
              <Link
                key={contract.id}
                href={`/crm/contracts/${contract.id}`}
                className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-accent"
              >
                <span className="font-medium">{contract.number}</span>
                <span className="flex items-center gap-2">
                  {formatCurrency(contract.value)}
                  <Badge value={contract.status} map={CONTRACT_STATUS_MAP} />
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {company.projects.length === 0 && (
              <p className="text-muted-foreground">No projects yet.</p>
            )}
            {company.projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="block rounded-md px-3 py-2 hover:bg-accent">
                {project.name}
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {company.invoices.length === 0 && (
              <p className="text-muted-foreground">No invoices yet.</p>
            )}
            {company.invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between rounded-md px-3 py-2">
                <span className="font-medium">{invoice.number}</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Follow-ups</CardTitle>
            {canEdit && (
              <ButtonLink href="/crm/followups" size="sm" variant="secondary">
                New follow-up
              </ButtonLink>
            )}
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {company.followUps.length === 0 && (
              <p className="text-muted-foreground">No follow-ups yet.</p>
            )}
              {company.followUps.map((fu) => (
                <div key={fu.id} className="flex items-center justify-between rounded-md px-3 py-2">
                  <span>
                    {FOLLOW_UP_TYPE_MAP[fu.type] ?? fu.type}
                    {fu.status === "DONE" ? " (done)" : ""}
                  </span>
                  <span className="text-muted-foreground">{formatDate(fu.dueDate)}</span>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Meeting notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {company.meetingNotes.length === 0 && (
              <p className="text-muted-foreground">No meetings yet.</p>
            )}
            {company.meetingNotes.map((meeting) => (
              <div key={meeting.id} className="flex items-center justify-between rounded-md px-3 py-2">
                <span className="font-medium">{meeting.title}</span>
                <span className="text-muted-foreground">{formatDate(meeting.date)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
