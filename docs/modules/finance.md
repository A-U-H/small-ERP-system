# Finance

Money in and out — revenue, invoices/payments, and expenses. Actions: `src/app/(app)/finance/actions.ts`. Labels: `src/lib/finance-labels.tsx`. Helpers: `src/lib/finance-helpers.ts`. Nav: `src/components/layout/finance-nav.tsx`.

## Routes

| Route | Page |
|-------|------|
| `/finance` | Revenue overview (payments, invoices, expenses, outstanding) |
| `/finance/invoices` · `/finance/invoices/new` · `/finance/invoices/[id]` | Invoices list, create, detail (line items, payments) |
| `/finance/expenses` | Expense list + create/edit/delete |

## Invoicing workflows

Invoices are created four ways (all in `src/app/(app)/finance/actions.ts`):

1. **Manual** (`createManualInvoice`) — free-form line items via `InvoiceItemsField` (`src/components/finance/invoice-items-field.tsx`).
2. **From a billable milestone** (`createMilestoneInvoice`) — picks a DONE milestone with a billing value.
3. **From billable hours** (`createHoursInvoice`) — billable `TimeEntry` hours × employee `hourlyRate` against a project.
4. **Retainer** (`generateRetainerInvoices`) — auto-generates a current-month invoice for every ACTIVE RETAINER contract that doesn't yet have one.

### Invoice lifecycle & numbers

- Numbering uses `CompanySettings.invoiceNumberPrefix` (`INV-`) + `invoiceNextNumber`; numbers are unique.
- Amounts: `subtotal` = Σ quantity×unitPrice; `taxAmount` = subtotal × `vatRate`/100 (from CompanySettings, default 5%); `total` = subtotal + tax.
- `computeInvoiceTotals(items, taxRate)` in `src/lib/finance-helpers.ts` performs the math.
- `dueDate` = issueDate + `defaultPaymentTermsDays`.
- Status is **derived at read time**: `getEffectiveStatus(invoice)` — any non-final invoice past its due date with a balance reads as `OVERDUE` (never stored as OVERDUE). `invoicePaid` sums payments; `invoiceBalance` = total − paid.
- `recordPayment` applies a payment and flips status SENT → PARTIAL → PAID. `updateInvoiceStatus` handles manual status changes.

## Expenses

`createExpense` / `updateExpense` / `deleteExpense` — description, category (from Settings), amount, date, paidBy (COMPANY/EMPLOYEE), reimbursable flag, optional project/company, receipt URL.

## Server actions

`createManualInvoice`, `createMilestoneInvoice`, `createHoursInvoice`, `generateRetainerInvoices`, `updateInvoiceStatus`, `archiveInvoice`, `recordPayment`, `deletePayment`, `createExpense`, `updateExpense`, `deleteExpense`.

## Notes

- Single currency AED; amounts are `Decimal(12,2)`.
- Invoice PDF generation and real email/WhatsApp dispatch are **not yet implemented** (no Resend client wired; `RESEND_API_KEY`/`WHATSAPP_*` env vars are placeholders). `pdfUrl` fields exist for future use.

## Screenshots

![Finance — revenue overview](../screenshots/finance.png)

> **Placeholder.** Capture `/finance` with KPIs and charts.

![Finance — invoices list](../screenshots/finance-invoices.png)

> **Placeholder.** Capture `/finance/invoices` showing status badges and balances.

![Finance — invoice detail](../screenshots/finance-invoice.png)

> **Placeholder.** Capture `/finance/invoices/[id]` with line items, totals, and payments.

## Next

- [CRM](crm.md) — contracts that drive retainer invoices
- [Team](team.md) — billable hours and hourly rates
