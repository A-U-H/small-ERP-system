import { db } from "@/lib/db";
import {
  createRole,
  updateRole,
  deleteRole,
} from "@/app/(app)/settings/actions";
import { MODULES, type Permissions } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  crm: "CRM",
  projects: "Projects",
  team: "Team",
  finance: "Finance",
  settings: "Settings",
};

export default async function RolesPage() {
  const roles = await db.role.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: { _count: { select: { users: true } } },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New role</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createRole} className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="name">Role name</Label>
              <Input id="name" name="name" placeholder="e.g. Accountant" required />
            </div>
            <Button type="submit">Create role</Button>
          </form>
        </CardContent>
      </Card>

      {roles.map((role) => {
        const permissions = (role.permissions ?? {}) as Permissions;
        return (
          <Card key={role.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                {role.name}
                {role.isDefault && (
                  <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                    Default
                  </span>
                )}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {role._count.users} user{role._count.users === 1 ? "" : "s"}
                </span>
              </CardTitle>
              {!role.isDefault && role._count.users === 0 && (
                <form action={deleteRole}>
                  <input type="hidden" name="id" value={role.id} />
                  <Button type="submit" variant="destructive" size="sm">
                    Delete
                  </Button>
                </form>
              )}
            </CardHeader>
            <CardContent>
              <form action={updateRole} className="space-y-4">
                <input type="hidden" name="id" value={role.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`name-${role.id}`}>Role name</Label>
                    <Input
                      id={`name-${role.id}`}
                      name="name"
                      defaultValue={role.name}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {MODULES.map((module) => (
                    <div key={module} className="space-y-1.5">
                      <Label htmlFor={`perm-${role.id}-${module}`}>
                        {MODULE_LABELS[module]}
                      </Label>
                      <Select name={`perm_${module}`} defaultValue={permissions[module] ?? "none"}>
                        <SelectTrigger id={`perm-${role.id}-${module}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No access</SelectItem>
                          <SelectItem value="view">View</SelectItem>
                          <SelectItem value="edit">Edit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <Button type="submit" size="sm">
                  Save role
                </Button>
              </form>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
