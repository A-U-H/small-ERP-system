import { db } from "@/lib/db";
import { ProjectCalendar } from "@/components/projects/project-calendar";

export const dynamic = "force-dynamic";

export interface CalendarEvent {
  date: string;
  title: string;
  type: "task" | "milestone" | "project" | "sprint";
  href: string;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function ProjectsCalendarPage() {
  const [projects, milestones, tasks, sprints] = await Promise.all([
    db.project.findMany({
      where: { archived: false },
      select: { id: true, name: true, startDate: true, endDate: true },
    }),
    db.milestone.findMany({
      where: { dueDate: { not: null } },
      select: { id: true, name: true, dueDate: true, project: { select: { id: true, name: true } } },
    }),
    db.task.findMany({
      where: { dueDate: { not: null }, project: { archived: false } },
      select: { id: true, name: true, dueDate: true, project: { select: { id: true, name: true } } },
    }),
    db.sprint.findMany({
      where: { project: { archived: false } },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        project: { select: { id: true, name: true } },
      },
    }),
  ]);

  const events: CalendarEvent[] = [];

  for (const project of projects) {
    if (project.startDate) {
      events.push({
        date: iso(project.startDate),
        title: `Start · ${project.name}`,
        type: "project",
        href: `/projects/${project.id}`,
      });
    }
    if (project.endDate) {
      events.push({
        date: iso(project.endDate),
        title: `End · ${project.name}`,
        type: "project",
        href: `/projects/${project.id}`,
      });
    }
  }

  for (const milestone of milestones) {
    if (milestone.dueDate) {
      events.push({
        date: iso(milestone.dueDate),
        title: `Milestone · ${milestone.project.name}: ${milestone.name}`,
        type: "milestone",
        href: `/projects/${milestone.project.id}`,
      });
    }
  }

  for (const task of tasks) {
    if (task.dueDate) {
      events.push({
        date: iso(task.dueDate),
        title: `Task · ${task.project.name}: ${task.name}`,
        type: "task",
        href: `/projects/${task.project.id}/board`,
      });
    }
  }

  for (const sprint of sprints) {
    if (sprint.startDate) {
      events.push({
        date: iso(sprint.startDate),
        title: `Sprint · ${sprint.project.name}: ${sprint.name} start`,
        type: "sprint",
        href: `/projects/${sprint.project.id}/sprints`,
      });
    }
    if (sprint.endDate) {
      events.push({
        date: iso(sprint.endDate),
        title: `Sprint · ${sprint.project.name}: ${sprint.name} end`,
        type: "sprint",
        href: `/projects/${sprint.project.id}/sprints`,
      });
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Project dates, milestones, task due dates, and sprint dates
        </p>
      </div>
      <ProjectCalendar events={events} />
    </div>
  );
}
