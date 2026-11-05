# ERP Documentation

Documentation for the ERP — a modular business management system for a service/consulting company.

## Contents

### Guides

- [Getting started](getting-started.md) — prerequisites, environment variables, database setup, scripts
- [Architecture](architecture.md) — framework, project structure, patterns, server actions, permissions model
- [Authentication & permissions](authentication.md) — login flow, roles, access control
- [Database reference](database.md) — Prisma schema: enums, models, relationships, seed data
- [Development](development.md) — commands, conventions, platform gotchas, how to add a feature
- [User guide](user-guide.md) — day-to-day usage for admins and end users
- [Known issues](known-issues.md) — issue log and outstanding work

### Modules

- [Dashboard](modules/dashboard.md)
- [CRM](modules/crm.md)
- [Projects](modules/projects.md)
- [Team](modules/team.md)
- [Finance](modules/finance.md)
- [Settings](modules/settings.md)

### Screenshots

Captures live in [screenshots/](screenshots/README.md). Placeholder image references are marked in each page; drop real captures into `docs/screenshots/` using the [naming convention](screenshots/README.md).

## Design history

The original design specs live in [`specs.md`](../specs.md) and [`specs/`](../specs/). They describe the intended design and may lag the implementation — treat this `docs/` set as the current source of truth.

## Quick links

- [Root README](../README.md)
- [Prisma schema](../prisma/schema.prisma)
- [Seed script](../prisma/seed.ts)
