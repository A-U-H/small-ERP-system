# Issue 002 — Base UI button-semantics warning on `/crm/companies` (duplicate of 001)

- **Module/Page:** CRM — `/crm/companies` ("New company" `ButtonLink`)
- **Priority:** Low
- **Status:** fixed
- **Date:** 2026-08-07

## Description

Identical to [Issue 001](001-base-ui-button-link-console-warning.md) — same root cause, different page. The `ButtonLink` at `src/app/(app)/crm/companies/page.tsx:54` renders a Base UI `Button` with `render={<Link/>}`, and because `nativeButton` defaults to `true`, Base UI logs:

> Base UI: A component that acts as a button expected a native `<button>` because the `nativeButton` prop is true. Rendering a non-`<button>` removes native button semantics, which can impact forms and accessibility. Use a real `<button>` in the `render` prop, or set `nativeButton` to `false`.

## Steps to reproduce

1. Run `npm run dev`.
2. Log in with admin credentials.
3. Open `/crm/companies`.
4. Open the browser devtools console.

## Expected

No console warning.

## Actual

The Base UI warning is logged for `ButtonLink` on `CompaniesPage`.

## Relationship to Issue 001

Same defect (global `ButtonLink` component). Tracked separately because it was observed on another page; fixing `src/components/ui/button-link.tsx` (e.g. `nativeButton={false}`) resolves both 001 and 002 and every other page using `ButtonLink`.

## Resolution

Fixed with issue 001: `nativeButton={false}` added to `ButtonLink` in `src/components/ui/button-link.tsx`. Page returns 200 with an authenticated session.
