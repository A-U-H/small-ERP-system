# CRM

Client relationship management — everything starts with the client. Actions: `src/app/(app)/crm/actions.ts`. Labels: `src/lib/crm-labels.tsx`.

## Routes

| Route | Page |
|-------|------|
| `/crm` | CRM overview (links to each entity) |
| `/crm/leads` · `/crm/leads/new` · `/crm/leads/[id]` | Leads list, create, detail |
| `/crm/companies` · `/crm/companies/new` · `/crm/companies/[id]` | Companies list, create, detail |
| `/crm/contacts/new` | Create contact (contacts are shown under companies) |
| `/crm/deals` · `/crm/deals/new` · `/crm/deals/[id]` | Deals pipeline list, create, detail |
| `/crm/proposals` · `/crm/proposals/new` · `/crm/proposals/[id]` | Proposals, create (line items), detail |
| `/crm/contracts` · `/crm/contracts/new` · `/crm/contracts/[id]` | Contracts, create, detail |
| `/crm/followups` | Follow-ups (pending/done) |
| `/crm/meetings` | Meeting notes |

## Entities & workflows

- **Lead** → source (website, referral, cold call, social media, event, walk-in, other), expected value, owner, status (NEW → CONTACTED → QUALIFIED → PROPOSAL_SENT → WON/CONVERTED, or LOST/UNQUALIFIED). `convertLead` converts a WON lead into a Company + Contact in one step.
- **Company** — the hub: status (ACTIVE/INACTIVE/LEAD/POTENTIAL), industry, VAT id, owner, tags. Detail page shows contacts, deals, proposals, contracts, projects, follow-ups, invoices, expenses.
- **Contact** — belongs to a company; primary flag, position, department.
- **Deal** — pipeline by stage (LEAD → QUALIFIED → PROPOSAL_SENT → NEGOTIATION → WON/LOST), value, probability, expected close date, contact. Status changes submit via NativeSelect.
- **Proposal** — unique `QUO-` number, line items (`ProposalItem`), valid-until, total (auto-computed), recipient email, pdfUrl. `updateProposalStatus`; `createContractFromProposal` creates a signed contract from an accepted proposal.
- **Contract** — unique `CTR-` number, billing type (FIXED / HOURLY / RETAINER), start/end dates, value. `createProjectFromContract` creates a project from an active contract. ACTIVE RETAINER contracts feed `generateRetainerInvoices` (Finance).
- **Follow-up** — type (CALL/EMAIL/WHATSAPP/MEETING), due date, status PENDING/DONE; surfaced in dashboard Attention when due ≤30 days.
- **Meeting note** — title, date, optional company/deal, notes/summary, attendee contacts.

## Server actions

`createLead`, `updateLead`, `updateLeadStatus`, `archiveLead`, `convertLead`, `createCompany`, `updateCompany`, `archiveCompany`, `createContact`, `updateContact`, `archiveContact`, `createDeal`, `updateDeal`, `updateDealStage`, `archiveDeal`, `createProposal`, `updateProposalStatus`, `archiveProposal`, `createContractFromProposal`, `createContract`, `updateContract`, `archiveContract`, `createProjectFromContract`, `createFollowUp`, `completeFollowUp`, `createMeetingNote`.

## Notes

- Every entity supports archiving (soft delete via `archived` flag).
- Money fields (`expectedValue`, `value`, contract `value`) use `Decimal(12,2)`.
- Labels/colors for all statuses live in `src/lib/crm-labels.tsx`; `Badge` is re-exported from there.

## Screenshots

![CRM — leads list with status badges](../screenshots/crm-leads.png)

> **Placeholder.** Capture `/crm/leads` with a few leads in different statuses.

![CRM — company detail with tabs](../screenshots/crm-company.png)

> **Placeholder.** Capture `/crm/companies/[id]` showing contacts, deals, contracts, projects.

![CRM — proposal with line items](../screenshots/crm-proposal.png)

> **Placeholder.** Capture `/crm/proposals/[id]` showing the line items table and totals.

## Next

- [Projects](projects.md) — contracts become projects
- [Finance](finance.md) — contracts/projects become invoices
