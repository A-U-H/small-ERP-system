import { db } from "@/lib/db";
import {
  createTechnology,
  updateTechnology,
  deleteTechnology,
} from "@/app/(app)/settings/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default async function TechnologiesPage() {
  const technologies = await db.technology.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: { _count: { select: { skills: true } } },
  });

  const grouped = technologies.reduce<Record<string, typeof technologies>>(
    (acc, t) => {
      const key = t.category ?? "Uncategorized";
      acc[key] = [...(acc[key] ?? []), t];
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New technology</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTechnology} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="e.g. React" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" placeholder="e.g. Frontend" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input id="color" name="color" type="color" defaultValue="#8b5cf6" />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit">Create technology</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">{category}</h3>
          {items.map((tech) => (
            <Card key={tech.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span
                    className="inline-block size-3 rounded-full"
                    style={{ backgroundColor: tech.color }}
                  />
                  {tech.name}
                  <span className="text-xs font-normal text-muted-foreground">
                    {tech._count.skills} skill{tech._count.skills === 1 ? "" : "s"}
                  </span>
                </CardTitle>
                <form action={deleteTechnology}>
                  <input type="hidden" name="id" value={tech.id} />
                  <Button type="submit" variant="destructive" size="sm">
                    Delete
                  </Button>
                </form>
              </CardHeader>
              <CardContent>
                <form action={updateTechnology} className="grid gap-4 sm:grid-cols-3">
                  <input type="hidden" name="id" value={tech.id} />
                  <div className="space-y-2">
                    <Label htmlFor={`name-${tech.id}`}>Name</Label>
                    <Input id={`name-${tech.id}`} name="name" defaultValue={tech.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`category-${tech.id}`}>Category</Label>
                    <Input id={`category-${tech.id}`} name="category" defaultValue={tech.category ?? ""} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`color-${tech.id}`}>Color</Label>
                    <Input id={`color-${tech.id}`} name="color" type="color" defaultValue={tech.color} />
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
        </div>
      ))}

      {technologies.length === 0 && (
        <p className="text-sm text-muted-foreground">No technologies yet.</p>
      )}
    </div>
  );
}
