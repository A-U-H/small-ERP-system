# Dashboard

Home page at `/` — `src/app/(app)/page.tsx` (server component, `force-dynamic`).

## What it shows

- **Welcome header** with the signed-in user's name.
- **Six KPI cards**, each linking to its module:
  - Active projects (in progress or on hold) → `/projects`
  - Tasks due today (with overdue count) → `/projects`
  - Revenue this month (cash basis: payments received this month) and expenses → `/finance`
  - Pending invoices (sent/partial/overdue, with outstanding total) → `/finance/invoices`
  - New leads (last 7 days) → `/crm/leads`
  - Overloaded members (see workload helper) → `/team/workload`
  - Cards needing attention show a red dot.
- **Revenue — last 6 months**: bar chart of payments received per month. Pure divs, no chart library.
- **Team workload**: top 6 active members by committed hours (`committed / capacity`), with overloaded bars highlighted in red. Capacity comes from `CompanySettings.defaultWeeklyHours` (default 40).
- **Recent activity**: latest 10 `ActivityLog` entries with actor name, humanized action, entity label, and links where a page exists.
- **Attention** panel with sections that only appear when there's something to flag:
  - Overdue tasks
  - Overdue invoices
  - Contracts expiring within 30 days
  - Follow-ups due within 30 days
  - Overloaded members

## Key logic

- KPIs computed from one `Promise.all` of Prisma queries (projects, tasks, leads, invoices, payments, expenses, employees, activity, contracts, follow-ups, settings).
- `invoiceBalance` / `getEffectiveStatus` from `src/lib/finance-helpers.ts` classify pending invoices.
- `workloadSummary` from `src/lib/team-workload.ts` computes committed hours (active task estimates + hours logged this week) vs capacity.
- Entity labels + href map are inline in the page (`ENTITY_LABELS`, `activityHref`).

## Screenshots

![Dashboard — KPIs, revenue chart, workload, activity, attention](../screenshots/dashboard.png)

> **Placeholder.** Capture the logged-in home page (`/`) with populated data.

## Next

- [Finance](finance.md) — revenue and invoices feeding this page
- [Team](team.md) — workload computation
