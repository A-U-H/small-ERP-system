# Projects

Project delivery — planning, milestones, tasks, sprints, and delivery tracking. Actions: `src/app/(app)/projects/actions.ts`. Labels: `src/lib/project-labels.tsx`. Progress helper: `src/lib/project-progress.ts`.

## Routes

| Route | Page |
|-------|------|
| `/projects` | Projects list (search, filter by status) |
| `/projects/new` | Create project |
| `/projects/[id]` | Project detail: info, milestones, tasks, members, comments, attachments |
| `/projects/[id]/board` | Kanban board grouped by task status |
| `/projects/[id]/sprints` | Sprints with their tasks |
| `/projects/calendar` | Project calendar |
| `/projects/templates` · `/projects/templates/new` | Project templates list + template editor |

## Entities & workflows

- **Project** — linked to a `Company` (required), optional `Contract`; start/end dates, status (PLANNED → IN_PROGRESS → ON_HOLD → COMPLETED/CANCELLED), budget, priority. Created manually or from an active contract (`createProjectFromContract`).
- **Milestone** — project phases with `billingValue`, status, order; a DONE milestone can be invoiced (Finance).
- **Task** — optional milestone/sprint, assignee (Employee), status, due date, priority, `estimate` (hours), `position`. Board groups by status.
- **Subtask** — checklist under a task; toggled inline (`subtask-toggle.tsx`).
- **Sprint** — planned/active/closed with goal and dates; tasks can be assigned to a sprint.
- **Members** — `ProjectMember` with role (Project Manager / Team Member / Reviewer / Viewer).
- **Comments & attachments** — per project and per task.
- **Templates** — `ProjectTemplate` with milestones and tasks (in order); reuse to scaffold new projects.

## Server actions

`createProject`, `updateProject`, `updateProjectStatus`, `archiveProject`, `createMilestone`, `updateMilestoneStatus`, `deleteMilestone`, `createTask`, `updateTaskStatus`, `deleteTask`, `createSubtask`, `toggleSubtask`, `deleteSubtask`, `createSprint`, `updateSprintStatus`, `deleteSprint`, `createProjectMember`, `removeProjectMember`, `createComment`, `createAttachment`, `createTemplate`, `deleteTemplate`.

## Notes

- Progress is computed from task estimates: `projectProgress(tasks)` in `src/lib/project-progress.ts` returns % of DONE estimates over total.
- Task estimates feed Team workload (`workloadSummary`) and billable-hours invoicing (Finance).
- Status changes submit via `NativeSelect` + button; an optional hidden `returnTo` bounces back to board/sprint pages.
- Prisma nested creates under a new project are done sequentially (create project → loop milestones/tasks).

## Screenshots

![Projects — list with search and status filter](../screenshots/projects.png)

> **Placeholder.** Capture `/projects` with a few projects.

![Projects — Kanban board](../screenshots/projects-board.png)

> **Placeholder.** Capture `/projects/[id]/board` with tasks in columns.

![Projects — template editor](../screenshots/projects-template.png)

> **Placeholder.** Capture `/projects/templates/new` with milestones and tasks.

## Next

- [Team](team.md) — assignees, estimates, time tracking on tasks
- [Finance](finance.md) — milestone / hours / retainer invoicing from projects
