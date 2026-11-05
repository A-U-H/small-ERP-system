# Architecture

## Framework

- **Next.js 16.3.0 (Turbopack)** — App Router with React 19 and TypeScript.
- **React Server Components by default**; client components are marked `"use client"`.
- **Tailwind CSS v4** with **shadcn/ui** components built on **Base UI** primitives (not Radix).

> ⚠️ This codebase uses a recent Next.js version whose conventions differ from older training-era Next.js. Read the bundled docs in `node_modules/next/dist/docs/` before writing code against it.

## Project structure

```
prisma/
  schema.prisma            # database schema — single source of truth for data
  seed.ts                  # idempotent seed (roles, admin, settings, categories)
src/
  proxy.ts                 # route guard (Next 16 middleware) — auth redirects
  app/
    layout.tsx             # root layout (fonts, theme, sonner)
    login/page.tsx         # public sign-in page
    (app)/
      layout.tsx           # authenticated shell: sidebar + session guard (force-dynamic)
      page.tsx             # Dashboard
      crm/                 # CRM pages + actions.ts
      projects/            # Projects pages + actions.ts
      team/                # Team pages + actions.ts
      finance/             # Finance pages + actions.ts
      settings/            # Settings pages + actions.ts
    api/auth/[...nextauth]/route.ts   # Auth.js handlers
  components/
    ui/                    # shadcn/ui primitives (Base UI)
    layout/                # sidebar, nav, user menu
    auth/                  # login form
    crm/, projects/, finance/   # module-specific client components
  lib/
    auth.ts                # NextAuth config
    db.ts                  # Prisma client singleton
    permissions.ts         # MODULES, hasAccess, defaultPermissions
    format.ts              # currency/date formatters (AED, en-GB)
    finance-helpers.ts     # invoice totals, balance, effective status, payments
    project-progress.ts    # task-based progress %
    team-workload.ts       # workload summary vs capacity
    <module>-labels.tsx    # enum → label/color maps + Badge re-export
```

## Request flow

1. Every request is intercepted by `src/proxy.ts`.
2. The proxy reads the JWT session cookie via `getToken({ req, secret: process.env.AUTH_SECRET })`.
3. If there is no token and the route is not `/login` or `/api/auth/*`, the user is redirected to `/login?callbackUrl=...`.
4. If there is a token and the route is `/login`, they are redirected to `/`.
5. App pages additionally call `auth()` themselves (in `(app)/layout.tsx` and inside server actions) — the proxy is the first line of defense, pages enforce their own session.

> **Gotcha:** the edge runtime does not reliably read environment variables for Auth.js. `src/proxy.ts` must pass `secret: process.env.AUTH_SECRET` explicitly to `getToken()` — otherwise every non-auth request fails with `MissingSecret`.

## Server actions (data mutations)

All mutations are **server actions** in `<module>/actions.ts`, invoked from plain HTML forms (no client state, no fetch helpers). The pattern in every module:

```ts
"use server";

async function requireModule(level: "view" | "edit" = "view") {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasAccess({ name: session.user.role, permissions: session.user.permissions }, "module", level)) {
    redirect("/");
  }
  return session;
}

export async function createX(formData: FormData) {
  const session = await requireModule("edit");
  // zod validation → db write → recordActivity(...) → revalidatePath(...)
}
```

Conventions:

- Inputs are validated with **zod** (forms) before hitting the database.
- Successful actions call `revalidatePath(...)` to refresh the current page, then `redirect(...)` where a navigation is needed.
- An **`ActivityLog`** row is written for key mutations (used by the dashboard feed).
- Status changes submit via `NativeSelect` + Move/Save button; an optional hidden `returnTo` field lets actions bounce back to board/sprint pages.
- Prisma nested-creates that need the new parent's id are done **sequentially** (create parent, then loop children) — nested `tasks.create` under a new milestone/project fails typecheck because `Task.project` is required.

## Database access

- `src/lib/db.ts` exports a singleton Prisma client.
- All queries run server-side (server components / server actions).
- Pages that hit the database are dynamic; `(app)/layout.tsx` exports `dynamic = "force-dynamic"` — do not remove it, or `next build` will attempt to prerender DB pages.

## Permissions model

Roles carry a `permissions` JSON map: `{ [module]: "none" | "view" | "edit" }`.

- `src/lib/permissions.ts` defines `MODULES` (dashboard, crm, projects, team, finance, settings), `hasAccess()`, and `ACCESS_RANK`.
- **Admin** always has full access regardless of the map.
- The sidebar shows only modules the role can view (`src/components/layout/nav-items.tsx`).
- Each server action re-checks access on the server — the UI hiding items is not the security boundary.

See [authentication.md](authentication.md) for the full role table.

## Auth

See [authentication.md](authentication.md) — Auth.js v5 (credentials + JWT, no DB sessions).

## Next

- [Authentication & permissions](authentication.md)
- [Database reference](database.md)
- [Development](development.md)
