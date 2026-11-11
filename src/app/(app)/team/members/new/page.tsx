import { db } from "@/lib/db";
import { createEmployee } from "@/app/(app)/team/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { NativeSelect } from "@/components/ui/native-select";
import { EMPLOYEE_STATUSES } from "@/lib/team-labels";

export const dynamic = "force-dynamic";

export default async function NewMemberPage() {
  const [departments, users] = await Promise.all([
    db.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.user.findMany({
      where: { employeeId: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">New member</h1>
      <form action={createEmployee} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employee details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required maxLength={150} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input id="position" name="position" maxLength={100} placeholder="e.g. Frontend Developer" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="departmentId">Department</Label>
              <NativeSelect id="departmentId" name="departmentId" defaultValue="">
                <option value="">None</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" maxLength={30} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hireDate">Hire date</Label>
              <Input id="hireDate" name="hireDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly rate (AED)</Label>
              <Input id="hourlyRate" name="hourlyRate" type="number" min="0" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <NativeSelect id="status" name="status" defaultValue="ACTIVE">
                {EMPLOYEE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            {users.length > 0 && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="userId">Link to login account</Label>
                <NativeSelect id="userId" name="userId" defaultValue="">
                  <option value="">None</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </NativeSelect>
                <p className="text-xs text-muted-foreground">
                  Links this employee to an existing login so they can use the system.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Button type="submit">Create member</Button>
          <ButtonLink href="/team/members" variant="secondary">
            Cancel
          </ButtonLink>
        </div>
      </form>
    </div>
  );
}
