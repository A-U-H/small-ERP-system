import Link from "next/link";
import { db } from "@/lib/db";
import { deleteTemplate } from "@/app/(app)/projects/actions";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Plus, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";

export const dynamic = "force-dynamic";

export default async function ProjectTemplatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  const canEdit = hasAccess(role, "projects", "edit");

  const templates = await db.projectTemplate.findMany({
    include: {
      milestones: { include: { tasks: true }, orderBy: { order: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Reusable project structures (milestones + tasks)
          </p>
        </div>
        {canEdit && (
          <ButtonLink href="/projects/templates/new">
            <Plus className="size-4" /> New template
          </ButtonLink>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => {
          const taskCount = template.milestones.reduce((s, m) => s + m.tasks.length, 0);
          return (
            <div key={template.id} className="rounded-lg border bg-background p-4">
              <h2 className="font-medium">{template.name}</h2>
              {template.description && (
                <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {template.milestones.length} milestones · {taskCount} tasks
              </p>
              {template.milestones.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {template.milestones.map((m) => (
                    <li key={m.id}>
                      • {m.name} ({m.tasks.length} tasks)
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex items-center gap-2">
                <ButtonLink
                  href={`/projects/new?template=${template.id}`}
                  size="sm"
                  variant="outline"
                >
                  <Play className="size-3.5" /> Use template
                </ButtonLink>
                {canEdit && (
                  <form action={deleteTemplate}>
                    <input type="hidden" name="id" value={template.id} />
                    <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                      Delete
                    </Button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {templates.length === 0 && (
        <p className="rounded-lg border py-12 text-center text-sm text-muted-foreground">
          No templates yet. Create one to speed up similar projects.
        </p>
      )}

      {canEdit && (
        <Link href="/projects/templates/new" className="text-sm text-muted-foreground hover:underline">
          Create a template →
        </Link>
      )}
    </div>
  );
}
