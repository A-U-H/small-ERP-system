import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasAccess } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { PROJECT_STATUSES, PROJECT_STATUS_MAP, PRIORITY_MAP } from "@/lib/project-labels";
import { formatCurrency, formatDate } from "@/lib/format";
import { projectProgress } from "@/lib/project-progress";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = { name: session.user.role, permissions: session.user.permissions };
  const canEdit = hasAccess(role, "projects", "edit");

  const statuses = ["PLANNED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"];
  const status = statuses.includes(params.status ?? "") ? params.status : "";

  const projects = await db.project.findMany({
    where: {
      archived: false,
      ...(status ? { status: status as never } : {}),
      ...(params.q ? { name: { contains: params.q, mode: "insensitive" } } : {}),
    },
    include: {
      company: { select: { name: true } },
      contract: { select: { number: true } },
      tasks: { select: { status: true, estimate: true } },
      members: { select: { id: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} projects ·{" "}
            {projects.filter((p) => p.status === "IN_PROGRESS").length} in progress
          </p>
        </div>
        {canEdit && (
          <ButtonLink href="/projects/new">
            <Plus className="size-4" /> New project
          </ButtonLink>
        )}
      </div>

      <form className="flex flex-wrap gap-2" action="/projects">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search projects…"
          className="h-9 rounded-md border bg-background px-3 text-sm"
        />
        <NativeSelect name="status" defaultValue={status} aria-label="Filter by status">
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <div className="space-y-2">
        {projects.map((project) => {
          const progress = projectProgress(project.tasks);
          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block rounded-lg border bg-background p-4 transition-colors hover:bg-accent"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{project.name}</span>
                    <Badge value={project.status} map={PROJECT_STATUS_MAP} />
                    <Badge value={project.priority} map={PRIORITY_MAP} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {project.company.name}
                    {project.contract ? ` · ${project.contract.number}` : ""}
                    {project.startDate ? ` · ${formatDate(project.startDate)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {project.budget !== null && (
                    <span className="hidden sm:inline">{formatCurrency(project.budget)}</span>
                  )}
                  <span>{project.members.length} members</span>
                  <span className="w-24 text-right font-medium">{progress}%</span>
                </div>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </Link>
          );
        })}
        {projects.length === 0 && (
          <p className="rounded-lg border py-12 text-center text-sm text-muted-foreground">
            No projects found.
          </p>
        )}
      </div>
    </div>
  );
}
