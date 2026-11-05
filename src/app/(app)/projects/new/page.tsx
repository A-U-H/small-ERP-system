import { db } from "@/lib/db";
import { createProject } from "@/app/(app)/projects/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { PROJECT_STATUSES, PRIORITY_OPTIONS } from "@/lib/project-labels";

export const dynamic = "force-dynamic";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; template?: string }>;
}) {
  const params = await searchParams;
  const [companies, contracts, tags, template] = await Promise.all([
    db.company.findMany({ where: { archived: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.contract.findMany({
      where: { archived: false, status: { in: ["SIGNED", "ACTIVE"] } },
      select: { id: true, number: true, companyId: true },
      orderBy: { createdAt: "desc" },
    }),
    db.tag.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    params.template
      ? db.projectTemplate.findUnique({ where: { id: params.template }, select: { name: true } })
      : null,
  ]);

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">New project</h1>
      {template && (
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Based on template: <span className="font-medium text-foreground">{template.name}</span>
        </p>
      )}
      <form action={createProject} className="space-y-6">
        {template && <input type="hidden" name="templateId" value={params.template} />}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required maxLength={150} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyId">Client company *</Label>
              <NativeSelect id="companyId" name="companyId" defaultValue={params.company ?? ""} required>
                <option value="">Select company…</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractId">Linked contract</Label>
              <NativeSelect id="contractId" name="contractId" defaultValue="">
                <option value="">None</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.number} ({companies.find((x) => x.id === c.companyId)?.name ?? "—"})
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" name="startDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End date</Label>
              <Input id="endDate" name="endDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <NativeSelect id="status" name="status" defaultValue="PLANNED">
                {PROJECT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <NativeSelect id="priority" name="priority" defaultValue="MEDIUM">
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Budget (AED)</Label>
              <Input id="budget" name="budget" type="number" min="0" step="0.01" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={3} />
            </div>
            {tags.length > 0 && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-3">
                  {tags.map((tag) => (
                    <label key={tag.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="tagIds" value={tag.id} className="size-4" />
                      {tag.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Button type="submit">Create project</Button>
          <ButtonLink href="/projects" variant="secondary">
            Cancel
          </ButtonLink>
        </div>
      </form>
    </div>
  );
}
