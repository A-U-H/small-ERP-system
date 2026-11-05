# Issue 010 — `/team/time` crashes: invalid Prisma `orderBy` on `task.findMany`

- **Module/Page:** Team — `/team/time`
- **Priority:** High (page throws at runtime)
- **Status:** fixed
- **Date:** 2026-08-07

## Description

The Time page's `Promise.all` at `src/app/(app)/team/time/page.tsx:27` calls `db.task.findMany` with a multi-field `orderBy` written as a single object:

```ts
orderBy: { projectId: "asc", name: "asc" },
```

Prisma expects an **array** of `TaskOrderByWithRelationInput` when ordering by more than one field. The object form is only valid for a single field, so Prisma throws:

> Argument `orderBy`: Invalid value provided. Expected TaskOrderByWithRelationInput[], provided Object.

## Steps to reproduce

1. Run `npm run dev`.
2. Log in with admin credentials.
3. Open `/team/time`.
4. The page throws `PrismaClientValidationError` (500 / error overlay).

## Expected

Page renders with the task options ordered by project then name.

## Actual

Runtime `PrismaClientValidationError` on server render.

## Suggested fix

Change `src/app/(app)/team/time/page.tsx:30` to an array:

```ts
orderBy: [{ projectId: "asc" }, { name: "asc" }],
```

## Relationship to other issues

Unrelated to the `ButtonLink` warnings (issues 001–009). This is the first real functional bug found.

## Resolution

Fixed 2026-08-07: changed `orderBy` in `src/app/(app)/team/time/page.tsx:30` from `{ projectId: "asc", name: "asc" }` to `[{ projectId: "asc" }, { name: "asc" }]` (Prisma requires an array for multi-field ordering). Verified via `npx tsc --noEmit`, `npm run lint`, `npm run build`, and a live authenticated dev-server request — `/team/time` returns 200 (previously threw `PrismaClientValidationError`).
