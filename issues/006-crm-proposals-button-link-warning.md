# Issue 006 — Base UI button-semantics warning on `/crm/proposals` (duplicate of 001)

- **Module/Page:** CRM — `/crm/proposals` ("New proposal" `ButtonLink`)
- **Priority:** Low
- **Status:** fixed
- **Date:** 2026-08-07

## Description

Identical to [Issue 001](001-base-ui-button-link-console-warning.md) — same root cause, another page. The `ButtonLink` at `src/app/(app)/crm/proposals/page.tsx:40` renders a Base UI `Button` with `render={<Link/>}`, and because `nativeButton` defaults to `true`, Base UI logs:

> Base UI: A component that acts as a button expected a native `<button>` because the `nativeButton` prop is true. Rendering a non-`<button>` removes native button semantics, which can impact forms and accessibility. Use a real `<button>` in the `render` prop, or set `nativeButton` to `false`.

## Steps to reproduce

1. Run `npm run dev`.
2. Log in with admin credentials.
3. Open `/crm/proposals`.
4. Open the browser devtools console.

## Expected

No console warning.

## Actual

The Base UI warning is logged for `ButtonLink` on `ProposalsPage`.

## Relationship to Issues 001–005

Same defect (global `ButtonLink` component). Fixing `src/components/ui/button-link.tsx` (e.g. `nativeButton={false}`) resolves 001–006 and every other page using `ButtonLink`.

## Resolution

Fixed with issue 001: `nativeButton={false}` added to `ButtonLink` in `src/components/ui/button-link.tsx`. `/crm/proposals` returns 200 with an authenticated session.
