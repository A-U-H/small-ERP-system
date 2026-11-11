# Team

People management — members, skills, workload, time tracking, and attendance. Actions: `src/app/(app)/team/actions.ts`. Labels: `src/lib/team-labels.tsx`. Workload helper: `src/lib/team-workload.ts`. Nav: `src/components/layout/team-nav.tsx`.

## Routes

| Route | Page |
|-------|------|
| `/team` | Team overview (links to each area) |
| `/team/members` · `/team/members/new` · `/team/members/[id]` | Members list, add, detail (profile, skills, workload, time, attendance) |
| `/team/workload` | Workload summary vs weekly capacity |
| `/team/time` | Time entries (log/edit/delete, billable flag) |
| `/team/attendance` | Attendance records + check-in/check-out |

## Entities & workflows

- **Employee** — name, email, phone, position, department, hire date, hourly rate, status (ACTIVE / ON_LEAVE / INACTIVE). Optionally linked to a `User` login (`user.employeeId`) so the person can sign in. Skills via `EmployeeSkill` (technology + level).
- **Skills** — assigned from the `Technology` catalog (Settings → Technologies), each with a level (BEGINNER / INTERMEDIATE / EXPERT).
- **Workload** — `workloadSummary(employee, capacity)` in `src/lib/team-workload.ts`:
  - `activeTaskHours` — sum of `estimate` on active tasks (TODO/IN_PROGRESS/IN_REVIEW/BLOCKED)
  - `hoursThisWeek` — time entries logged since the start of the week (Monday)
  - `committed = activeTaskHours + hoursThisWeek`; `usedPercent` (capped 100); `overloaded` when `committed > capacity`
  - capacity defaults to `CompanySettings.defaultWeeklyHours` (40h) and is configurable in Settings → Company.
- **Time entries** — per task (optional) + project + employee, `hours`, date, notes, `billable` flag. Billable hours × employee hourly rate feed Finance's hours-based invoicing.
- **Attendance** — `checkIn` / `checkOut` actions auto-compute `hours` from `checkInAt`/`checkOutAt`. One record per employee per day.

## Server actions

`createEmployee`, `updateEmployee`, `addEmployeeSkill`, `removeEmployeeSkill`, `createTimeEntry`, `updateTimeEntry`, `deleteTimeEntry`, `createAttendance`, `updateAttendance`, `deleteAttendance`, `checkIn`, `checkOut`.

## Notes

- Employees with a linked `User` are gated by `user.active` + `employee.status` at login (see [authentication.md](../authentication.md)).
- `TimeEntry` requires a project; task is optional.
- Attendance `hours` field auto-computes; it can also be set/edited manually via `updateAttendance`.

## Screenshots

![Team — members list](../screenshots/team-members.png)

> **Placeholder.** Capture `/team/members` with a few employees.

![Team — workload summary](../screenshots/team-workload.png)

> **Placeholder.** Capture `/team/workload` showing committed hours vs capacity.

![Team — time entries](../screenshots/team-time.png)

> **Placeholder.** Capture `/team/time` with logged entries and the task selector.

![Team — attendance](../screenshots/team-attendance.png)

> **Placeholder.** Capture `/team/attendance` with check-in/out and hours.

## Next

- [Projects](projects.md) — where task estimates come from
- [Finance](finance.md) — billable hours and rates feed invoices
