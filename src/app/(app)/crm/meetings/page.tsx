import { db } from "@/lib/db";
import { createMeetingNote } from "@/app/(app)/crm/actions";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  const canEdit = hasAccess(role, "crm", "edit");

  const [meetings, companies, deals] = await Promise.all([
    db.meetingNote.findMany({
      include: { company: { select: { name: true } }, deal: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 50,
    }),
    db.company.findMany({ where: { archived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.deal.findMany({ where: { archived: false }, select: { id: true, name: true }, orderBy: { updatedAt: "desc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Meeting notes</h1>

      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Deal</th>
                <th className="px-4 py-2 font-medium">Summary</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((meeting) => (
                <tr key={meeting.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium">{meeting.title}</td>
                  <td className="px-4 py-2">{formatDate(meeting.date)}</td>
                  <td className="px-4 py-2">{meeting.company?.name ?? "—"}</td>
                  <td className="px-4 py-2">{meeting.deal?.name ?? "—"}</td>
                  <td className="max-w-md truncate px-4 py-2 text-muted-foreground">
                    {meeting.summary ?? "—"}
                  </td>
                </tr>
              ))}
              {meetings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No meetings yet.
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
            <CardTitle className="text-base">New meeting note</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createMeetingNote} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
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
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="summary">Summary</Label>
                <Textarea id="summary" name="summary" rows={2} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={4} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Create meeting note</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
