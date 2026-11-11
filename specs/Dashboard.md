# Dashboard — Specifications

Not a standalone module — pulls information from all modules.

## Layout

Summary cards (KPIs) → charts → lists (recent activity + alerts)

## KPI cards

- **Active Projects:** count where status is In Progress or On Hold
- **Tasks Due Today:** non-done tasks due today + separate overdue counter
- **Revenue:** total received in the current period (cash basis — see Finance spec)
- **Pending Invoices:** count of unpaid invoices + total amount, split into Sent / Partial / Overdue
- **New Leads:** leads created in the last 7 days
- **Team Workload:** per-employee workload chart (see Team spec)

## Recent Activity

Latest 10 events across CRM, Projects, Finance, Team — who + when + what.

## Attention alerts

- Overdue tasks
- Contracts expiring soon
- Overdue invoices
- Follow-ups due/overdue
- Overloaded team members
