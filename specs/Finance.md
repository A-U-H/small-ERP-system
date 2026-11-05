# Finance — Specifications

Purpose: Only basic finance — NOT accounting software.

## Quotes

- Same document as CRM Proposals — see [specs/CRM.md](CRM.md) (Proposals section)

## Invoices

- **Fields:** Auto invoice number, Client company, Linked project/contract/milestone, Issue & due date, Line items, Total, Tax amount, Status, Terms & notes, PDF
- **Statuses:** Draft → Sent/Unpaid → Partial → Paid, plus Overdue and Cancelled
- **Creation (all supported):**
  - From a billable milestone's value (fixed price)
  - From logged billable hours × hourly rate
  - Manually (line items)
  - Recurring monthly for retainer contracts
- **Tax/VAT:** single VAT rate set in Settings (applied to all invoices)
- **Payment terms:** default in Settings (e.g. Net 15 / Net 30), editable per invoice
- **Sending:** invoice PDF is auto-generated and emailed to the client from the system
- **Cancellation:** cancelled invoices stay in history but count for nothing

## Payments

- **Fields:** Linked invoice, Amount, Date, Method, Reference, Notes
- **Methods:** Bank transfer, Cash, Card, Cheque
- **Partial payments:** allowed until invoice balance reaches zero
- **Scope:** one payment applies to one invoice

## Expenses

- **Fields:** Description, Category, Amount & date, Paid by (company/employee), Reimbursable flag, Linked project/client, Receipt attachment
- **Categories:** managed list in Settings (travel, software, office, subcontractors, etc.)

## Revenue Dashboard

- **KPIs:** Revenue (paid), Outstanding/unpaid (AR), Expenses, Profit/net, Period comparison (this month vs last month / this year), By project, By client
- **Basis:** money counts as revenue when received (cash basis)
- **Reminders:** auto email/WhatsApp reminder to client before due date and when overdue

## Out of scope

- No full accounting / general ledger
- No double-entry bookkeeping
