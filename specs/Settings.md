# Settings — Specifications

Purpose: Everything administrative.

## Roles & Permissions

- **Default roles:** Admin, Manager, Employee, Sales, Viewer
- **Custom roles:** admins can create roles with their own name
- **Permission model:** per-module — each role gets none / view / edit per module (Dashboard, CRM, Projects, Team, Finance, Settings)
- **Editable:** admins can tune permissions of any role, including defaults
- **Assignment:** each employee has exactly one role; admin changes it

## Company Settings

- Company name, Logo, Contact details (address/phone/email), VAT number, Currency (single)
- Default VAT rate %, Default payment terms (e.g. Net 30)
- Invoice & contract numbering (prefix / starting number)
- Default working hours (e.g. 40h/week) used for capacity

## Departments

- **Fields:** Name, Department head, Color
- Used by employees (see Team spec)

## Technologies

- **Purpose:** used both as employee skills and project tags
- **Fields:** Name, Category (frontend/backend/mobile/design), Color

## Tags

- Usable on: Companies, Leads, Projects, Tasks
- **Fields:** Name + Color

## Notification Settings

- **Channels:** In-app bell, Email, WhatsApp
- **Admin controls:** each notification type can be enabled/disabled and assigned channels globally
- **User preferences:** each user can opt out of specific notification types
- **Recipients:** notifications go to the owner/assignee; admins & managers also get copies of important ones (won deals, overdue invoices)
