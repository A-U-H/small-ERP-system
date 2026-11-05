import { db } from "@/lib/db";
import { createFollowUp, completeFollowUp } from "@/app/(app)/crm/actions";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FOLLOW_UP_TYPES } from "@/lib/crm-labels";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  const canEdit = hasAccess(role, "crm", "edit");

  const showOnlyOverdue = params.filter === "overdue";
  const showOnlyDone = params.filter === "done";

  const [followUps, companies, contacts, deals, users] = await Promise.all([
    db.followUp.findMany({
      where: showOnlyDone ? { status: "DONE" as never } : {},
      include: {
        company: { select: { name: true } },
        contact: { select: { name: true } },
        deal: { select: { name: true } },
        owner: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
    db.company.findMany({ where: { archived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.contact.findMany({ where: { archived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.deal.findMany({ where: { archived: false }, select: { id: true, name: true }, orderBy: { updatedAt: "desc" } }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const now = new Date();
  const visible = followUps.filter((f) => {
    if (showOnlyOverdue) return f.status === "PENDING" && f.dueDate < now;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Follow-ups</h1>
        <div className="flex gap-1">
          {[
            { href: "/crm/followups", label: "All", active: !showOnlyDone && !showOnlyOverdue },
            { href: "/crm/followups?filter=overdue", label: "Overdue", active: showOnlyOverdue },
            { href: "/crm/followups?filter=done", label: "Done", active: showOnlyDone },
          ].map((tab) => (
            <a
              key={tab.href}
              href={tab.href}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab.active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
            >
              {tab.label}
            </a>
          ))}
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Due</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Contact</th>
                <th className="px-4 py-2 font-medium">Deal</th>
                <th className="px-4 py-2 font-medium">Owner</th>
                <th className="px-4 py-2 font-medium">Status</th>
                {canEdit && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody>
              {visible.map((fu) => {
                const overdue = fu.status === "PENDING" && fu.dueDate < now;
                return (
                  <tr key={fu.id} className="border-b last:border-0">
                    <td className={`px-4 py-2 ${overdue ? "font-medium text-destructive" : ""}`}>
                      {formatDate(fu.dueDate)}
                      {overdue && " (overdue)"}
                    </td>
                    <td className="px-4 py-2">
                      {FOLLOW_UP_TYPES.find((t) => t.value === fu.type)?.label ?? fu.type}
                    </td>
                    <td className="px-4 py-2">{fu.company?.name ?? "—"}</td>
                    <td className="px-4 py-2">{fu.contact?.name ?? "—"}</td>
                    <td className="px-4 py-2">{fu.deal?.name ?? "—"}</td>
                    <td className="px-4 py-2">{fu.owner?.name ?? "—"}</td>
                    <td className="px-4 py-2">{fu.status === "DONE" ? "Done" : "Pending"}</td>
                    {canEdit && fu.status === "PENDING" && (
                      <td className="px-4 py-2 text-right">
                        <form action={completeFollowUp}>
                          <input type="hidden" name="id" value={fu.id} />
                          <Button type="submit" size="sm" variant="secondary">
                            Mark done
                          </Button>
                        </form>
                      </td>
                    )}
                    {canEdit && fu.status !== "PENDING" && <td />}
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No follow-ups found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New follow-up</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createFollowUp} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due date *</Label>
                <Input id="dueDate" name="dueDate" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <NativeSelect id="type" name="type" defaultValue="CALL">
                  {FOLLOW_UP_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyId">Company</Label>
                <NativeSelect id="companyId" name="companyId" defaultValue="">
                  <option value="">None</option>
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
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dealId">Deal</Label>
                <NativeSelect id="dealId" name="dealId" defaultValue="">
                  <option value="">None</option>
                  {deals.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerId">Owner</Label>
                <NativeSelect id="ownerId" name="ownerId" defaultValue="">
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
                <Textarea id="notes" name="notes" rows={2} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Create follow-up</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
