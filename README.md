# ERP — Business Management System

A modular ERP for a service/consulting business, covering the complete client lifecycle: lead acquisition → proposals & contracts → project delivery → time tracking → invoicing & payments.

Core principle: **Everything starts with the client.**

## Modules

| Module | Purpose |
|--------|---------|
| **Dashboard** | Cross-module KPIs, 6-month revenue chart, team workload, activity feed, attention alerts |
| **CRM** | Leads, companies, contacts, deals, proposals, contracts, follow-ups, meeting notes |
| **Projects** | Projects, milestones, tasks, subtasks, sprints, Kanban board, calendar, templates |
| **Team** | Members, skills, workload, time entries, attendance (check-in/out) |
| **Finance** | Revenue overview, invoices & payments, expenses |
| **Settings** | Company profile, roles & permissions, departments, tags, technologies |

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16.3.0 (Turbopack) — App Router, React 19, TypeScript |
| UI | Tailwind CSS v4, shadcn/ui (base-nova preset, Base UI primitives) |
| Database | PostgreSQL via Supabase + Prisma 6.19.3 ORM |
| Auth | Auth.js (next-auth v5 beta), credentials + JWT strategy |
| Validation | zod v4 + react-hook-form |
| Misc | bcryptjs, date-fns, lucide-react, sonner |

## Quick start

```bash
npm install          # install dependencies
npm run dev          # start the dev server → http://localhost:3000
```

Before running, copy `.env.example` to `.env` and fill in `DATABASE_URL` and `AUTH_SECRET` (see [docs/getting-started.md](docs/getting-started.md)). Then apply the schema and load seed data:

```bash
npx prisma migrate dev        # create/apply migrations
npm run db:seed               # default roles, admin user, company settings
```

Default seeded admin login — **change the password immediately**:

```
Email:    hello.au.haq@gmail.com
Password: Haq@2026!
```

The seed reads `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from the environment if you want different defaults.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Typecheck (run `npx next typegen` first if `.next` was deleted) |
| `npm run db:seed` | Idempotent seed (also runs on `npx prisma db seed`) |

## Documentation

Full docs live in [docs/](docs/README.md):

- [Getting started](docs/getting-started.md) — setup, environment, database
- [Architecture](docs/architecture.md) — app structure and patterns
- [Authentication & permissions](docs/authentication.md) — login, roles, access control
- [Database reference](docs/database.md) — Prisma schema by module
- [Modules](docs/modules/) — Dashboard, CRM, Projects, Team, Finance, Settings
- [Development](docs/development.md) — commands, conventions, gotchas
- [User guide](docs/user-guide.md) — how to use the system day-to-day
- [Known issues](docs/known-issues.md) — issue log and outstanding work

Design specifications are kept separately as project history in [specs.md](specs.md) and [specs/](specs/) — they describe the intended design and may lag the implementation.

## Repository layout

```
prisma/schema.prisma        # database schema (source of truth)
prisma/seed.ts              # idempotent seed data
src/app/(app)/              # authenticated module pages + server actions
src/app/login/              # sign-in page
src/components/             # UI + layout + module-specific components
src/components/ui/          # shadcn/ui (Base UI) primitives
src/lib/                    # auth, db, permissions, helpers, label maps
src/proxy.ts                # route guard middleware (auth redirect)
specs/                      # module design specs (historical)
docs/                       # this documentation set
issues/                     # bug log (fixed)
```
