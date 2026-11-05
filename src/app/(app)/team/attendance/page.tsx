import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import {
  createAttendance,
  updateAttendance,
  deleteAttendance,
  checkIn,
  checkOut,
} from "@/app/(app)/team/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { formatDate, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TeamAttendancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  const canEdit = hasAccess(role, "team", "edit");

  const [employees, entries, myEntry] = await Promise.all([
    db.employee.findMany({
      where: { status: { not: "INACTIVE" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.attendance.findMany({
      include: { employee: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 50,
    }),
    session.user.employeeId
      ? db.attendance.findUnique({
          where: {
            employeeId_date: {
              employeeId: session.user.employeeId,
              date: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        })
      : null,
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Attendance</h1>
        <p className="text-sm text-muted-foreground">
          Simple daily check-in / check-out. Members mark their own; admins can edit.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My day</CardTitle>
        </CardHeader>
        <CardContent>
          {myEntry ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <p className="font-medium">Today</p>
                <p className="text-muted-foreground">
                  In: {myEntry.checkInAt ? formatDateTime(myEntry.checkInAt) : "—"} · Out:{" "}
                  {myEntry.checkOutAt ? formatDateTime(myEntry.checkOutAt) : "—"} ·{" "}
                  {myEntry.hours !== null ? `${Number(myEntry.hours)}h` : "hours not set"}
                </p>
              </div>
              {canEdit && myEntry.checkInAt && !myEntry.checkOutAt && (
                <form action={checkOut}>
                  <input type="hidden" name="id" value={myEntry.id} />
                  <Button type="submit" variant="outline">
                    Check out
                  </Button>
                </form>
              )}
            </div>
          ) : canEdit ? (
            <form action={checkIn} className="flex items-center gap-3">
              <input
                type="hidden"
                name="employeeId"
                value={session.user.employeeId ?? ""}
              />
              <Button type="submit" variant="outline" disabled={!session.user.employeeId}>
                Check in
              </Button>
              {!session.user.employeeId && (
                <span className="text-xs text-muted-foreground">
                  Your login is not linked to an employee profile yet — ask an admin to link it in
                  the member profile.
                </span>
              )}
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              No check-in for today yet. Ask an admin to log it.
            </p>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Log attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAttendance} className="grid gap-4 sm:grid-cols-6">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="employeeId">Member *</Label>
                <NativeSelect id="employeeId" name="employeeId" required>
                  <option value="">Select member…</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label htmlFor="date">Date *</Label>
                <Input id="date" name="date" type="date" defaultValue={today} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hours">Hours</Label>
                <Input id="hours" name="hours" type="number" min="0" max="24" step="0.5" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" maxLength={2000} />
              </div>
              <div className="sm:col-span-6">
                <Button type="submit">Save</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm">
                  <span className="font-medium">{entry.employee.name}</span>
                  <span className="ml-2 text-muted-foreground">{formatDate(entry.date)}</span>
                  {entry.checkInAt && (
                    <span className="ml-2 text-muted-foreground">
                      In {formatDateTime(entry.checkInAt)}
                    </span>
                  )}
                  {entry.checkOutAt && (
                    <span className="ml-2 text-muted-foreground">
                      Out {formatDateTime(entry.checkOutAt)}
                    </span>
                  )}
                  {entry.hours !== null && (
                    <span className="ml-2 font-medium">{Number(entry.hours)}h</span>
                  )}
                </div>
                <form action={deleteAttendance}>
                  <input type="hidden" name="id" value={entry.id} />
                  <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                    Delete
                  </Button>
                </form>
              </div>
              {canEdit && (
                <form action={updateAttendance} className="mt-2 flex flex-wrap items-end gap-2 border-t pt-2">
                  <input type="hidden" name="id" value={entry.id} />
                  <div className="space-y-1">
                    <Label htmlFor={`hours-${entry.id}`} className="text-xs">
                      Hours
                    </Label>
                    <Input
                      id={`hours-${entry.id}`}
                      name="hours"
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      defaultValue={entry.hours?.toString() ?? ""}
                      className="h-8 w-24"
                    />
                  </div>
                  <div className="min-w-40 flex-1 space-y-1">
                    <Label htmlFor={`notes-${entry.id}`} className="text-xs">
                      Notes
                    </Label>
                    <Input
                      id={`notes-${entry.id}`}
                      name="notes"
                      maxLength={2000}
                      defaultValue={entry.notes ?? ""}
                      className="h-8"
                    />
                  </div>
                  <Button type="submit" size="sm" variant="outline">
                    Save
                  </Button>
                </form>
              )}
            </div>
          ))}
          {entries.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No attendance records yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
