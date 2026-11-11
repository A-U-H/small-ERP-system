import { db } from "@/lib/db";
import {
  createTag,
  updateTag,
  deleteTag,
} from "@/app/(app)/settings/actions";
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

const TAG_TYPE_LABELS: Record<string, string> = {
  LEAD_SOURCE: "Lead source",
  LEAD_STATUS: "Lead status",
  DEAL_STAGE: "Deal stage",
  PROJECT_TYPE: "Project type",
  PROJECT_STATUS: "Project status",
  GENERAL: "General",
};

export default async function TagsPage() {
  const tags = await db.tag.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] });

  const grouped = tags.reduce<Record<string, typeof tags>>((acc, tag) => {
    acc[tag.type] = [...(acc[tag.type] ?? []), tag];
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New tag</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTag} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="e.g. Hot" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select name="type" defaultValue="GENERAL">
                <SelectTrigger id="type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TAG_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input id="color" name="color" type="color" defaultValue="#10b981" />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit">Create tag</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {Object.entries(grouped).map(([type, items]) => (
        <div key={type} className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {TAG_TYPE_LABELS[type] ?? type}
          </h3>
          {items.map((tag) => (
            <Card key={tag.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span
                    className="inline-block size-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </CardTitle>
                <form action={deleteTag}>
                  <input type="hidden" name="id" value={tag.id} />
                  <Button type="submit" variant="destructive" size="sm">
                    Delete
                  </Button>
                </form>
              </CardHeader>
              <CardContent>
                <form action={updateTag} className="grid gap-4 sm:grid-cols-3">
                  <input type="hidden" name="id" value={tag.id} />
                  <div className="space-y-2">
                    <Label htmlFor={`name-${tag.id}`}>Name</Label>
                    <Input id={`name-${tag.id}`} name="name" defaultValue={tag.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`type-${tag.id}`}>Type</Label>
                    <Select name="type" defaultValue={tag.type}>
                      <SelectTrigger id={`type-${tag.id}`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TAG_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`color-${tag.id}`}>Color</Label>
                    <Input id={`color-${tag.id}`} name="color" type="color" defaultValue={tag.color} />
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

      {tags.length === 0 && (
        <p className="text-sm text-muted-foreground">No tags yet.</p>
      )}
    </div>
  );
}
