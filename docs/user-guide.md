# User guide

How to use the ERP day-to-day. Designed for a small service/consulting team (1–10 users).

## Signing in

1. Open the app URL (dev: `http://localhost:3000`).
2. Enter your email and password on `/login`. Employees with a linked login use the same account as everyone else.
3. If you're not signed in, every page redirects to `/login`. If you try a module you lack access to, you're returned to the dashboard.

## Navigation

The left sidebar shows the modules your role can access:

- **Dashboard** — overview of everything needing your attention
- **CRM** — clients
- **Projects** — delivery
- **Team** — people, time, attendance
- **Finance** — money
- **Settings** — company config (usually admin-only)

Your name and role appear at the bottom of the sidebar with the sign-out menu.

## Roles in practice

| Role | Typical use |
|------|-------------|
| Admin | Everything, including settings. |
| Manager | Full CRM/Projects/Team/Finance editing; can view settings. |
| Sales | Capture leads, companies, deals, proposals, contracts; view other areas. |
| Employee | View projects/CRM/finance; logs time and attendance in Team. |
| Viewer | Read-only across all modules. |

A module you can't access simply doesn't appear in your sidebar, and server-side checks reject direct edits.

## Working with the CRM

- **Capture a lead** → CRM → Leads → New lead. As the deal matures, update status (Contacted → Qualified → Proposal sent → Won). Convert a won lead to a company + contact in one click.
- **Track accounts** → Companies. A company page is the hub for its contacts, deals, proposals, contracts, projects, follow-ups, invoices, and expenses.
- **Propose** → Proposals → New proposal. Add line items; totals and VAT compute automatically. Mark accepted when signed.
- **Contract** → Contracts. Create from an accepted proposal, or directly. Set the billing type (fixed / hourly / retainer) and dates. Generate a project from an active contract.
- **Stay on top of things** → follow-ups (calls/emails/WhatsApp/meetings) and meeting notes. The dashboard lists follow-ups due within 30 days.

## Working with Projects

- **Plan** → Projects → New project (or start from a template). Add milestones, then tasks with assignees, estimates, due dates, and priorities.
- **Execute** → open the board (`Board` tab) and move tasks between To do / In progress / In review / Done / Blocked. Check off subtasks inline.
- **Iterate** → use sprints (planned → active → closed) for time-boxed work; the calendar view shows milestones/dates.
- **Scaffold** → create project templates (milestones + tasks) and reuse them for similar engagements.
- Projects can be created from an active CRM contract so the client and billing context carry over.

## Working with Team

- **Members** — add employees, set their department, position, hire date, hourly rate, and skills. Optionally link a login account so they can sign in.
- **Log time** → Time → New entry: pick project (and optional task), date, hours, notes, and whether it's billable. Billable hours feed invoicing.
- **Attendance** → check in / check out per day; hours are computed automatically. One record per employee per day.
- **Workload** — the workload page and dashboard show committed hours (open task estimates + this week's logged hours) against a 40-hour weekly capacity (configurable in Settings → Company). Members over capacity are flagged.

## Working with Finance

- **Create an invoice** four ways:
  - Manual line items
  - From a completed billable milestone
  - From billable hours × hourly rate
  - Retainer — auto-generate current-month invoices for all active retainer contracts (one click)
- Invoice numbers (`INV-…`), VAT (5% default), and due dates (net 30 by default) come from Settings → Company.
- **Record payments** on the invoice page — status flips from Unpaid → Partially paid → Paid automatically. Overdue is derived automatically when the due date passes with a balance.
- **Expenses** — record with category, amount, date, who paid, and whether it's reimbursable; optionally attach to a project or company.
- The dashboard and `/finance` show cash-basis revenue (payments received this month) vs expenses, pending invoices, and outstanding totals.

> **Note:** invoice PDFs and email/WhatsApp delivery are not implemented yet — invoices are managed inside the app.

## Settings (admin)

- **Company** — name, address, VAT, currency, payment terms, numbering prefixes, weekly hours. These drive invoices/proposals/contracts and workload capacity.
- **Roles** — create roles and set per-module view/edit access. Admin is always full access.
- **Departments / Tags / Technologies** — catalogs used by Team, CRM, and Projects.

## Tips

- Every CRM/project entity can be **archived** (soft delete) so lists stay clean.
- The dashboard **Attention** panel is the fastest triage tool: overdue tasks and invoices, expiring contracts, due follow-ups, overloaded members.
- Re-run `npm run db:seed` safely any time — it only upserts defaults and never deletes your data.
