import { db } from "@/lib/db";
import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "@/app/(app)/settings/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default async function DepartmentsPage() {
  const [departments, employees] = await Promise.all([
    db.department.findMany({
      orderBy: { name: "asc" },
      include: { head: { select: { id: true, name: true } } },
    }),
    db.employee.findMany({
      where: { status: { not: "INACTIVE" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New department</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createDepartment} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="e.g. Development" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="headId">Department head</Label>
              <select
                id="headId"
                name="headId"
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">None</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input id="color" name="color" type="color" defaultValue="#3b82f6" />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit">Create department</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {departments.map((dept) => (
        <Card key={dept.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <span
                className="inline-block size-3 rounded-full"
                style={{ backgroundColor: dept.color }}
              />
              {dept.name}
            </CardTitle>
            <form action={deleteDepartment}>
              <input type="hidden" name="id" value={dept.id} />
              <Button type="submit" variant="destructive" size="sm">
                Delete
              </Button>
            </form>
          </CardHeader>
          <CardContent>
            <form action={updateDepartment} className="grid gap-4 sm:grid-cols-3">
              <input type="hidden" name="id" value={dept.id} />
              <div className="space-y-2">
                <Label htmlFor={`name-${dept.id}`}>Name</Label>
                <Input id={`name-${dept.id}`} name="name" defaultValue={dept.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`headId-${dept.id}`}>Department head</Label>
                <select
                  id={`headId-${dept.id}`}
                  name="headId"
                  defaultValue={dept.headId ?? ""}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">None</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`color-${dept.id}`}>Color</Label>
                <Input id={`color-${dept.id}`} name="color" type="color" defaultValue={dept.color} />
              </div>
              <div className="sm:col-span-3">
                <Button type="submit" size="sm">
                  Save
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ))}

      {departments.length === 0 && (
        <p className="text-sm text-muted-foreground">No departments yet.</p>
      )}
    </div>
  );
}
