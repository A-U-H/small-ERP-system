# Settings

Company configuration and governance. Actions: `src/app/(app)/settings/actions.ts`. All pages guard with `hasAccess(role, "settings", "edit")`. Nav: `src/components/layout/settings-nav.tsx`.

## Routes

| Route | Page |
|-------|------|
| `/settings` | Settings overview |
| `/settings/company` | Company profile + defaults |
| `/settings/roles` | Roles & permissions |
| `/settings/departments` | Departments |
| `/settings/tags` | Tags (CRM + projects) |
| `/settings/technologies` | Technology catalog (skills + project tags) |

## Areas

### Company (`updateCompanySettings`)

Edits the singleton `CompanySettings` row (`id = 1`): companyName, logoUrl, address, phone, email, vatNumber, currency (AED), vatRate, defaultPaymentTermsDays, invoice/proposal/contract number prefixes + next numbers, defaultWeeklyHours.

> Numbering counters are also advanced here — when an invoice/proposal/contract is created, the `nextNumber` is incremented and saved.

### Roles & permissions (`createRole` / `updateRole` / `deleteRole`)

- Create/rename/delete custom roles; toggle per-module access (`none`/`view`/`edit`) for dashboard, crm, projects, team, finance, settings.
- New roles start from `defaultPermissions()` (view everywhere except settings).
- The **Admin** role always has full access regardless of the permission map (enforced in `hasAccess`). Seeded roles: Admin, Manager, Employee, Sales, Viewer (see [authentication.md](../authentication.md)).

### Departments (`createDepartment` / `updateDepartment` / `deleteDepartment`)

Unique name, optional department head (an Employee), color.

### Tags (`createTag` / `updateTag` / `deleteTag`)

Unique name, `type` (lead source / lead status / deal stage / project type / project status / general), color. Applied to companies and projects.

### Technologies (`createTechnology` / `updateTechnology` / `deleteTechnology`)

Unique name, optional category, color. Used for `EmployeeSkill`s and project technology tags.

## Server actions

`updateCompanySettings`, `createRole`, `updateRole`, `deleteRole`, `createDepartment`, `updateDepartment`, `deleteDepartment`, `createTechnology`, `updateTechnology`, `deleteTechnology`, `createTag`, `updateTag`, `deleteTag`.

## Screenshots

![Settings — company profile and defaults](../screenshots/settings-company.png)

> **Placeholder.** Capture `/settings/company` with the form.

![Settings — roles & permissions](../screenshots/settings-roles.png)

> **Placeholder.** Capture `/settings/roles` with the permission matrix.

## Next

- [Authentication](../authentication.md) — how roles gate access
- [Database reference](../database.md) — the models behind these settings
