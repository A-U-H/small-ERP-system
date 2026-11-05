# Projects — Specifications

Purpose: The heart of the ERP.

## Projects

- **Fields:** Name, Client company, Linked contract, Start/End date, Status, Budget, Description, Priority, Tags
- **Statuses:** Planned → In Progress → On Hold → Completed → Cancelled
- **Templates:** Reusable project templates (milestones + tasks) for similar future projects
- **Contract linkage:** A project created from a contract inherits the client, dates, and billing type — edits stay independent afterwards

## Milestones

- **Fields:** Name, Due date, Status (Pending / In Progress / Done), Description, Linked tasks, Billing value
- **Billable milestones:** can carry a value that later generates an invoice (typical for fixed-price contracts)

## Tasks

- **Fields:** Name, Description, Milestone, Assigned member, Status, Due date, Priority, Estimate, Time logged, Files
- **Statuses:** To Do → In Progress → In Review → Done → Blocked

## Subtasks

- **Fields:** Name, Done (checkbox), Due date, Assignee
- Parent task completion reflects completed subtasks

## Kanban Board

- Columns = the task statuses above; tasks drag between columns

## Sprint Board

- Full Scrum sprints: Name, Start/End date, Goal, Tasks, Status (Planned / Active / Closed)
- Tasks are assigned to a sprint and tracked on the sprint board

## Calendar

- Internal calendar view (no external sync)
- Shows: task due dates, milestone dates, project start/end dates, sprint dates

## Team Members

- Roles on a project: Project Manager, Team Member, Reviewer, Viewer/Guest

## Progress

- Auto-calculated % from completed tasks, weighted by estimate

## Comments

- On any project or task; @mentions; file attachments; notification when you're mentioned

## Files

- Project-level files and task-level files; organized in folders; version history

## Activity Log

- Records: CRUD changes, task status changes, comments & file uploads — with who did it and when

## Flow

```
Project
    ↓
Milestones
    ↓
Tasks
    ↓
Subtasks
```
