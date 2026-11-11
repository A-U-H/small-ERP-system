# Team — Specifications

Purpose: Manage employees only — NOT a full HR system.

## Employee Profile

- **Fields:** Name, Email, Phone, Position (free text), Department (from Settings), Hire date, Hourly rate (for billing), Skills, Assigned projects
- Every employee has a login account and accesses the system
- Status: active / on leave / inactive

## Skills

- Admin-defined skill list maintained in Settings (reuses Technologies/Tags)
- Each assigned skill has a proficiency level: Beginner / Intermediate / Expert

## Departments & Positions

- **Departments:** managed list in Settings (e.g. Sales, Development, Design)
- **Positions:** free-text job title per employee

## Assigned Projects

- Employees are assigned directly to projects; their role on each project (Project Manager / Team Member / Reviewer / Viewer) comes from the Projects module

## Workload

Calculated per employee from all of:
- Sum of estimates of their active tasks
- Hours logged in the current period
- Number of active projects they're on
- Capacity vs committed (e.g. 30h used of a 40h week)
- Displayed as a per-employee chart (who's overloaded vs free)

## Time Tracking

- **Entry method:** manual — pick task (or project) + date + hours + notes
- **Fields:** Task/project, Date, Hours, Notes, Billable flag, Logged by
- Ties into Tasks ("time logged") and Finance (billable hours)

## Attendance (Optional — included)

- Simple daily check-in/out: date + hours worked
- Employee marks their own attendance; admin can edit

## Out of scope (explicitly NOT included)

- No payroll
- No leave management
- No recruitment
