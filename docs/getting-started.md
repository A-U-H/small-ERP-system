# Getting started

This page covers setting up the ERP on a fresh machine.

## Prerequisites

- **Node.js** 20+ and **npm**
- A **PostgreSQL** database — this project is configured for **Supabase** (session pooler), but any Postgres works
- On Windows, prefer invoking npm through `npm.cmd` in scripts and terminals that parse PowerShell (see [development.md](development.md))

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment

Copy the template and fill in real values:

```bash
copy .env.example .env    # Windows
# or
cp .env.example .env      # macOS / Linux
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string. With Supabase use the **session pooler** URL (`aws-0-<region>.pooler.supabase.com:5432`). The direct `db.<ref>.supabase.co:5432` host is IPv6-only and unreachable on some networks. |
| `AUTH_SECRET` | Auth.js signing secret. Generate with `openssl rand -base64 32`. |
| `AUTH_URL` | Public URL of the app (default `http://localhost:3000`). |
| `RESEND_API_KEY` | Resend API key for email delivery *(optional, not yet wired up)*. |
| `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_ID` | Meta WhatsApp Cloud API credentials *(optional, not yet wired up)*. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Override the seeded admin credentials *(optional)*. |

> **Security:** `.env` is git-ignored and must never be committed. All these variables (except `SEED_ADMIN_*`) are documented in `.env.example`.

## 3. Apply the database schema

```bash
npx prisma migrate dev --name init
```

This creates all tables. For schema changes after the initial migration, give a new name:

```bash
npx prisma migrate dev --name <migration-name>
```

Regenerate the Prisma client after any manual schema edit:

```bash
npx prisma generate
```

## 4. Seed the database

```bash
npm run db:seed
```

The seed is **idempotent** (safe to re-run). It creates:

- 5 default roles (Admin, Manager, Employee, Sales, Viewer) with permissions — see [authentication.md](authentication.md)
- 1 admin user
- Company settings (row id `1`): currency AED, VAT 5%, 30-day payment terms, `INV-`/`QUO-`/`CTR-` numbering, 40-hour default week
- 9 expense categories
- 9 notification settings

## 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You are redirected to `/login` until signed in.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Typecheck (run `npx next typegen` first if `.next` was deleted) |
| `npm run db:seed` | Idempotent seed |
| `npx prisma studio` | Browse/edit data in the browser |

## Next

- [Architecture](architecture.md) — how the project is structured
- [Authentication](authentication.md) — roles and permissions
- [User guide](user-guide.md) — using the system
