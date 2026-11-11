# Authentication & permissions

## Login

Authentication is handled by **Auth.js (next-auth v5 beta)** with the **Credentials** provider and a **JWT session strategy** (no database sessions).

Flow:

1. User submits email/password on `/login` (`src/components/auth/login-form.tsx`).
2. Auth.js calls the `authorize` function in `src/lib/auth.ts`:
   - Normalizes email, looks up the `User`, checks the linked account is `active` and (if linked) the `Employee` is not `INACTIVE`.
   - Verifies the password with `bcryptjs` (`compare`).
   - Returns a minimal user object (id, name, email, roleId, role, permissions, employeeId).
3. A JWT session cookie is issued. The `jwt` callback re-reads the user from the DB on every request and flags the token as `revoked` if the account was deactivated.
4. `src/proxy.ts` gates all routes; the authenticated shell `(app)/layout.tsx` enforces the session again and renders the sidebar.

**Security notes**

- `AUTH_SECRET` must be set; `src/proxy.ts` passes it to `getToken()` explicitly (edge runtime does not reliably read env vars for Auth.js — without it, every non-auth request 500s with `MissingSecret`).
- Passwords are hashed with `bcryptjs` (cost factor 12 in the seed).
- There is **no password-change UI yet** — a seeded admin password should be changed directly in the database until one is built.

## Users, roles & permissions

- `User` holds login credentials and a `roleId`; optionally links to an `Employee` (`user.employeeId`) for team members.
- `Role` stores a `permissions` JSON object: `{ module: "none" | "view" | "edit" }` for the six modules.
- `src/lib/permissions.ts`:

  - `MODULES = ["dashboard", "crm", "projects", "team", "finance", "settings"]`
  - `hasAccess(role, module, "view" | "edit")` — `Admin` always returns true; otherwise compares against the `ACCESS_RANK`.
  - `defaultPermissions()` — fresh custom roles get `view` on everything except `settings` (which is `none`).

- Enforcement is **server-side**: each server action calls a `requireModule(level)` helper that redirects to `/login` (no session) or `/` (no permission). The sidebar only *displays* modules the role can view — it is not a security boundary.

## Default roles (seeded)

| Role | dashboard | crm | projects | team | finance | settings |
|------|-----------|-----|----------|------|---------|----------|
| Admin | edit | edit | edit | edit | edit | edit |
| Manager | view | edit | edit | edit | edit | view |
| Employee | view | view | view | view | view | none |
| Sales | view | edit | view | view | view | none |
| Viewer | view | view | view | view | view | none |

Roles are managed under **Settings → Roles** (create/rename/delete custom roles, toggle per-module access). Custom roles default to `defaultPermissions()` (view everywhere except settings).

## Seeding

`npm run db:seed` upserts the 5 default roles and an admin user. Admin email/password are overridable via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`; defaults are `hello.au.haq@gmail.com` / `Haq@2026!`.

## Next

- [Database reference](database.md) — the `User`, `Role`, `Employee` models
- [User guide](user-guide.md) — role workflows in practice
