# Database reference

Schema source of truth: [`prisma/schema.prisma`](../prisma/schema.prisma) (PostgreSQL). Regenerate the client after edits with `npx prisma generate`.

All rows use `cuid()` string ids unless noted. Money is `Decimal` (12,2); hours/estimates are `Decimal` (6,2).

## Enums

| Enum | Values |
|------|--------|
| `Access` | NONE, VIEW, EDIT |
| `LeadStatus` | NEW, CONTACTED, QUALIFIED, PROPOSAL_SENT, WON, CONVERTED, LOST, UNQUALIFIED |
| `CompanyStatus` | ACTIVE, INACTIVE, LEAD, POTENTIAL |
| `DealStage` | LEAD, QUALIFIED, PROPOSAL_SENT, NEGOTIATION, WON, LOST |
| `ProposalStatus` | DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED |
| `ContractStatus` | DRAFT, SENT, SIGNED, ACTIVE, COMPLETED, TERMINATED |
| `BillingType` | FIXED, HOURLY, RETAINER |
| `FollowUpType` | CALL, EMAIL, WHATSAPP, MEETING |
| `FollowUpStatus` | PENDING, DONE |
| `TagType` | LEAD_SOURCE, LEAD_STATUS, DEAL_STAGE, PROJECT_TYPE, PROJECT_STATUS, GENERAL |
| `Priority` | LOW, MEDIUM, HIGH |
| `ProjectStatus` | PLANNED, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED |
| `MilestoneStatus` | PENDING, IN_PROGRESS, DONE |
| `TaskStatus` | TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED |
| `SprintStatus` | PLANNED, ACTIVE, CLOSED |
| `ProjectMemberRole` | PROJECT_MANAGER, TEAM_MEMBER, REVIEWER, VIEWER |
| `EmployeeStatus` | ACTIVE, ON_LEAVE, INACTIVE |
| `SkillLevel` | BEGINNER, INTERMEDIATE, EXPERT |
| `InvoiceStatus` | DRAFT, SENT, PARTIAL, PAID, OVERDUE, CANCELLED |
| `PaymentMethod` | BANK_TRANSFER, CASH, CARD, CHEQUE |
| `ExpensePaidBy` | COMPANY, EMPLOYEE |

> `InvoiceStatus.OVERDUE` exists in the enum but is **derived at read time** — see `getEffectiveStatus` in `src/lib/finance-helpers.ts`. The stored value is never set to OVERDUE.

## Settings & auth

| Model | Notes |
|-------|-------|
| `User` | Login account. Unique email, `passwordHash`, `roleId`, optional `employeeId` link, `active`. |
| `Role` | Unique name, `isDefault`, `permissions` JSON. Seeded: Admin, Manager, Employee, Sales, Viewer. |
| `Department` | Unique name, optional `headId` (Employee), `color`. |
| `Technology` | Unique name, `category`, `color`; used for skills and project tags. |
| `Tag` | Unique name, `type` (`TagType`), `color`. |
| `CompanySettings` | **Singleton row id `1`.** companyName, logoUrl, address/phone/email, vatNumber, `currency` (AED), `vatRate`, `defaultPaymentTermsDays`, invoice/proposal/contract number prefixes + next numbers, `defaultWeeklyHours` (40). |
| `ExpenseCategory` | Unique name; seeded 9 categories. |
| `NotificationSetting` | Unique `type`, `enabled`, `channels` JSON. Seeded 9 types. |
| `UserNotificationPref` | Per-user `(userId, type)` overrides — table exists; no UI yet. |

## CRM

| Model | Notes |
|-------|-------|
| `Lead` | name, email, phone, source (free text or `LEAD_SOURCES`), companyName, expectedValue, status, optional `owner` (User), notes, archived. |
| `Company` | name, industry, size, website, phone, email, address, vatId, status, owner, notes, archived. Hub of the CRM: contacts, deals, proposals, contracts, projects, meeting notes, follow-ups, invoices, expenses, tags. |
| `Contact` | Belongs to a `Company`; name/email/phone/position/department, `isPrimary`, owner. |
| `Deal` | Belongs to a `Company`, optional `Contact`; value, expectedCloseDate, probability, stage, owner. |
| `Proposal` | Unique auto number (`QUO-`); company, optional contact/deal; status, issueDate, validUntil, total, terms, recipientEmail, pdfUrl, archived; `ProposalItem` lines (description, quantity, unitPrice, amount). |
| `Contract` | Unique number (`CTR-`); company, optional proposal; startDate, endDate, value, status, billingType (FIXED/HOURLY/RETAINER), signedPdfUrl, terms, notes. Links to projects + invoices. |
| `FollowUp` | Optional company/contact/deal; dueDate, type (CALL/EMAIL/WHATSAPP/MEETING), status (PENDING/DONE), owner. |
| `MeetingNote` | title, date, optional company/deal, notes, summary; `MeetingAttendee` join to `Contact`. |
| `CompanyTag` | Join `Company` ↔ `Tag`. |

## Projects

| Model | Notes |
|-------|-------|
| `Project` | name, `companyId` (required), optional `contractId`; start/end dates, status, budget, description, priority, archived. Owns milestones, tasks, sprints, members, comments, attachments, time entries, invoices, expenses, tags. |
| `ProjectTemplate` | name, description; `ProjectTemplateMilestone` (order) and `ProjectTemplateTask` (order, optional milestone). |
| `Milestone` | Belongs to project; name, dueDate, status, description, `billingValue`, order; can link to invoices. |
| `Sprint` | Belongs to project; name, start/end dates, goal, status. |
| `Task` | Belongs to project; optional milestone/sprint; name, description, assignee (Employee), status, dueDate, priority, `estimate` (hours), `position`; subtasks, comments, attachments, time entries. |
| `Subtask` | Belongs to task; name, done, dueDate, assignee. |
| `ProjectMember` | Join project ↔ employee with `ProjectMemberRole`; unique `(projectId, employeeId)`. |
| `Comment` | Optional project/task; author (User), body. |
| `Attachment` | Optional project/task; name, url, size, mimeType, folder, versionGroup, uploadedBy (Employee). |
| `ProjectTag` | Join project ↔ tag, optional `Technology` (project technologies). |
| `ActivityLog` | entityType, entityId, actor (User), action, `detail` JSON; indexed `(entityType, entityId)`. Drives the dashboard feed. |

## Team

| Model | Notes |
|-------|-------|
| `Employee` | name, unique email, phone, position, department, hireDate, hourlyRate, status, avatarUrl; unique optional `userId` link to a `User` login. |
| `EmployeeSkill` | employee ↔ technology with `SkillLevel`; unique `(employeeId, technologyId)`. |
| `TimeEntry` | task (optional), project, employee; date, `hours`, notes, `billable`, loggedBy (User). |
| `Attendance` | employee, date, checkInAt/checkOutAt, `hours`, notes, createdBy; unique `(employeeId, date)`. Check-in/out auto-computes hours. |

## Finance

| Model | Notes |
|-------|-------|
| `Invoice` | Unique number (`INV-`); company (required), optional project/contract/milestone; issueDate, dueDate, status, subtotal, taxRate, taxAmount, total, terms, notes, pdfUrl, archived. `InvoiceItem` lines; `Payment` records. |
| `InvoiceItem` | description, quantity, unitPrice, amount. |
| `Payment` | invoice, amount, date, method, reference, notes. |
| `Expense` | description, category, amount, date, paidBy, reimbursable, optional project/company, receiptUrl. |

## Key relationships at a glance

```
Lead ─────────────► (converts to)
Company ◄────────── Contact ──── Deal
   │                   │           │
   ├── Proposal ◄──────┘           ├── FollowUp
   ├── Contract ◄──────┘           └── MeetingNote
   ├── Project ◄───────────────────┘
   │      ├── Milestone ── Invoice
   │      ├── Task ────────┬──────────► TimeEntry
   │      ├── Sprint       ├── Subtask
   │      └── Member       └── Comment/Attachment
   ├── Invoice ──── Payment
   └── Expense

Employee ◄── (optional User login) ── User ── Role ── permissions JSON
```

## Seed data (idempotent)

`npm run db:seed` upserts:

- 5 roles (see [authentication.md](authentication.md))
- 1 admin user
- `CompanySettings` row `1` (AED, VAT 5%, net 30, INV-/QUO-/CTR-, 40h week)
- 9 expense categories (Travel, Software, Office supplies, Subcontractors, Marketing, Utilities, Meals, Transport, Other)
- 9 notification settings (task_assigned, task_overdue, deal_won, proposal_accepted, invoice_overdue, contract_expiring, followup_due, new_lead, attendance)
