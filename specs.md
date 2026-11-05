# ERP System Specifications

## 1. Overview

A modular ERP system designed to manage the complete lifecycle of a service/consulting business, from lead acquisition through project delivery and financial settlement.

Core principle: **Everything starts with the client.**

## 2. System Structure

```
ERP
│
├── Dashboard
│
├── CRM
│
├── Projects
│
├── Team
│
├── Finance
│
└── Settings
```

## 3. Modules

Each module has its own spec file. A file marked **Deep** is fully specified; **Pending** is confirmed in outline only.

| Module | File | Status |
|--------|------|--------|
| Dashboard | [specs/Dashboard.md](specs/Dashboard.md) | Deep |
| CRM | [specs/CRM.md](specs/CRM.md) | Deep |
| Projects | [specs/Projects.md](specs/Projects.md) | Deep |
| Team | [specs/Team.md](specs/Team.md) | Deep |
| Finance | [specs/Finance.md](specs/Finance.md) | Deep |
| Settings | [specs/Settings.md](specs/Settings.md) | Deep |

## 4. Cross-Module Dependencies

| From | To | Relationship |
|------|-----|--------------|
| CRM | Projects | Signed contract → creates Project |
| Projects | Team | Project/Task assigned to employees |
| Projects | Finance | Project work → billable → Invoice |
| Team | Projects | Workload derived from assigned tasks/projects |
| Finance | Dashboard | Revenue, pending invoices |
| CRM | Dashboard | New leads count |
| Settings | All | Roles & permissions gate access |

## 5. To Be Decided (Open Questions)

### Confirmed decisions

- **Deployment:** cloud web app, accessible from anywhere via browser
- **Scale:** 1–10 users
- **Language:** English only (no i18n)
- **Company model:** single company (no multi-tenant)
- **Currency:** single currency
- **Auth:** email/password login (all employees have accounts)
- **Integrations (day one):** email sending + WhatsApp/SMS
- **File storage:** S3-compatible object storage

### Still open

- [ ] Final tech stack selection (framework / backend / database)
- [ ] Data models & database schema (to be derived from module specs)
- [ ] API design / REST vs GraphQL
- [ ] Hosting provider & domain name
- [ ] Email provider (Resend/SMTP) and WhatsApp Business account setup
